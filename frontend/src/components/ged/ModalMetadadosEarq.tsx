import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Fingerprint,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIVEIS_ACESSO_OPCOES, type Doc } from "@/components/ged/data";
import {
  ModalConfirmacaoAcaoSigad,
  useConfirmacaoSigad,
} from "@/components/ged/ModalConfirmacaoAcaoSigad";
import { obterPapelSessao, podeGerenciarPcdTtd } from "@/lib/auth";
import {
  formatarTamanho,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";
import { buscarClassesPcd, type ClassePcdItem } from "@/lib/pcd-dossie-api";
import { alterarSigiloDocumento, reclassificarDocumento } from "@/lib/sigad-api";

interface ModalMetadadosEarqProps {
  doc: Doc | null;
  onClose: () => void;
  onVerificarFixidade?: ((doc: Doc) => Promise<unknown>) | undefined;
}

export function ModalMetadadosEarq({
  doc,
  onClose,
  onVerificarFixidade,
}: ModalMetadadosEarqProps) {
  const [verificando, setVerificando] = useState(false);
  const [painelAcao, setPainelAcao] = useState<"nenhum" | "sigilo" | "reclassificar">("nenhum");
  const [classesDisponiveis, setClassesDisponiveis] = useState<ClassePcdItem[]>([]);

  // Estados de Alteração/Desclassificação de Sigilo (e-ARQ 7.3.13 / ECV6 / ECV7)
  const [novoNivelAcesso, setNovoNivelAcesso] = useState("OSTENSIVO");
  const [novaHipoteseLegal, setNovaHipoteseLegal] = useState("");
  const [novaPrevisaoDesclassificacao, setNovaPrevisaoDesclassificacao] = useState("");
  const [justificativaSigilo, setJustificativaSigilo] = useState("");

  // Estados de Reclassificação no PCD/TTD (e-ARQ 1.3.9 a 1.3.11)
  const [novoCodigoClasse, setNovoCodigoClasse] = useState("");
  const [justificativaReclassificacao, setJustificativaReclassificacao] = useState("");

  const {
    confirmacaoAtiva,
    processandoConfirmacao,
    solicitarConfirmacao,
    fecharConfirmacao,
    executarConfirmacao,
  } = useConfirmacaoSigad();

  const podeGovernarEarq = podeGerenciarPcdTtd(obterPapelSessao());

  useEffect(() => {
    if (doc) {
      setPainelAcao("nenhum");
      setNovoNivelAcesso(doc.nivelAcesso || "OSTENSIVO");
      setNovaHipoteseLegal(doc.hipoteseLegal || "");
      setNovaPrevisaoDesclassificacao(doc.previsaoDesclassificacao || "");
      setJustificativaSigilo("");
      setNovoCodigoClasse(doc.codigoClassificacao || "FIM.100.01.001");
      setJustificativaReclassificacao("");
      if (podeGovernarEarq) {
        buscarClassesPcd("TODAS", true)
          .then(setClassesDisponiveis)
          .catch(() => {});
      }
    }
  }, [doc, podeGovernarEarq]);

  if (!doc) return null;

  function submeterAlteracaoSigilo() {
    if (!doc) return;
    if (justificativaSigilo.trim().length < 8) {
      toast.error("Justificativa obrigatória", {
        description: "Informe ao menos 8 caracteres para registrar o evento ECV6/ECV7.",
      });
      return;
    }
    const ehDesclassificacao =
      (doc.nivelAcesso || "OSTENSIVO") !== "OSTENSIVO" && novoNivelAcesso === "OSTENSIVO";

    solicitarConfirmacao({
      titulo: ehDesclassificacao
        ? `Você deseja desclassificar o documento ${doc.numeroProtocolo || doc.nome} para OSTENSIVO?`
        : `Você deseja alterar o grau de sigilo deste documento para ${novoNivelAcesso}?`,
      descricao: ehDesclassificacao
        ? "O documento passará a ter acesso público livre (OSTENSIVO) e o Evento de Ciclo de Vida ECV7 (Desclassificação) será gravado na Trilha de Auditoria com o grau anterior."
        : "O grau de restrição LAI/LGPD será atualizado e o Evento de Ciclo de Vida ECV6 será gravado na Trilha de Auditoria.",
      categoriaNormativa: "Segurança & Sigilo LAI/LGPD · e-ARQ Brasil v2 (Req. 7.3.13)",
      variante: ehDesclassificacao ? "sucesso" : "atencao",
      rotuloConfirmar: ehDesclassificacao ? "Sim, Desclassificar (ECV7)" : "Sim, Alterar Sigilo (ECV6)",
      detalhesAlvo: [
        `Documento: [${doc.numeroProtocolo || doc.id.slice(0, 8)}] ${doc.nome}`,
        `Grau Anterior: ${doc.nivelAcesso || "OSTENSIVO"} -> Novo Grau: ${novoNivelAcesso}`,
        `Justificativa: ${justificativaSigilo.trim()}`,
      ],
      onConfirmar: async () => {
        try {
          const res = await alterarSigiloDocumento(doc.id, {
            nivel_acesso: novoNivelAcesso,
            hipotese_legal: novaHipoteseLegal.trim(),
            previsao_desclassificacao: novaPrevisaoDesclassificacao.trim(),
            justificativa: justificativaSigilo.trim(),
          });
          toast.success(res.mensagem);
          window.dispatchEvent(new CustomEvent("fcja-acervo-atualizado"));
          setPainelAcao("nenhum");
          onClose();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Erro ao alterar grau de sigilo";
          toast.error("Falha na operação de sigilo", { description: msg });
        }
      },
    });
  }

  function submeterReclassificacao() {
    if (!doc) return;
    if (justificativaReclassificacao.trim().length < 8) {
      toast.error("Justificativa obrigatória", {
        description: "Informe ao menos 8 caracteres para reclassificar o documento no PCD/TTD.",
      });
      return;
    }
    const classeObj = classesDisponiveis.find((c) => c.codigo === novoCodigoClasse);
    const tituloClasse = classeObj?.titulo || doc.descricaoCodigo || "";
    const tipoAtiv =
      classeObj?.tipoAtividade ||
      (novoCodigoClasse.startsWith("FIM") ? "Atividade-Fim" : "Atividade-Meio");

    solicitarConfirmacao({
      titulo: `Você deseja reclassificar este documento para a classe ${novoCodigoClasse}?`,
      descricao:
        "O código de classificação anterior será preservado na Trilha de Auditoria (valorAnterior) e os prazos de guarda corrente, intermediária e destinação final (TTD) serão recalculados automaticamente.",
      categoriaNormativa: "Reclassificação Arquivística · e-ARQ Brasil v2 (Reqs. 1.3.9 a 1.3.11)",
      variante: "primaria",
      rotuloConfirmar: "Sim, Reclassificar e Recalcular TTD",
      detalhesAlvo: [
        `Documento: [${doc.numeroProtocolo || doc.id.slice(0, 8)}] ${doc.nome}`,
        `Classe Anterior: ${doc.codigoClassificacao || "S/C"} -> Nova Classe: ${novoCodigoClasse} (${tituloClasse})`,
        `Justificativa: ${justificativaReclassificacao.trim()}`,
      ],
      onConfirmar: async () => {
        try {
          const res = await reclassificarDocumento(doc.id, {
            codigo_classificacao: novoCodigoClasse,
            descricao_codigo: tituloClasse,
            tipo_atividade: tipoAtiv,
            justificativa: justificativaReclassificacao.trim(),
          });
          toast.success(res.mensagem);
          window.dispatchEvent(new CustomEvent("fcja-acervo-atualizado"));
          setPainelAcao("nenhum");
          onClose();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Erro ao reclassificar documento";
          toast.error("Falha na reclassificação", { description: msg });
        }
      },
    });
  }

  async function acionarVerificacao() {
    if (!doc || !onVerificarFixidade) return;
    setVerificando(true);
    try {
      await onVerificarFixidade(doc);
    } finally {
      setVerificando(false);
    }
  }

  function copiarTexto(valor: string, rotulo: string) {
    if (!valor) return;
    navigator.clipboard.writeText(valor);
    toast.success(`${rotulo} copiado para a área de transferência`);
  }

  const integro = doc.fixidadeVerificada !== false;

  return (
    <Dialog open={doc !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              {doc.numeroProtocolo || `ID-${doc.id.slice(0, 8)}`}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {rotuloStatusDocumento(doc.statusDocumento)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                doc.nivelAcesso === "RESTRITO_LGPD" || doc.nivelAcesso === "SIGILOSO_LAI"
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              <Lock className="h-3 w-3" />
              {rotuloNivelAcesso(doc.nivelAcesso)}
            </span>
          </div>
          <DialogTitle className="mt-2 text-xl font-semibold break-all">
            {doc.nome}
          </DialogTitle>
          <DialogDescription>
            Ficha Descritiva e de Preservação Digital conforme as diretrizes do CONARQ e PREMIS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2 text-sm">
          {/* 1. Identificação e Contexto Arquivístico */}
          <section className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Identificação, Proveniência e Classificação
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Protocolo / Identificador SIGAD</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900">
                    {doc.numeroProtocolo || "Não atribuído (legado)"}
                  </span>
                  {doc.numeroProtocolo && (
                    <button
                      type="button"
                      onClick={() => copiarTexto(doc.numeroProtocolo!, "Protocolo")}
                      className="text-slate-400 hover:text-primary"
                      title="Copiar protocolo"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Autor / Produtor Arquivístico</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.autor || "Fundação Casa de José Américo (FCJA)"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atividade & Classe (PCDM/TTD)</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.tipoAtividade || "Atividade-Meio"} ·{" "}
                  <span className="font-mono">{doc.codigoClassificacao || "S/C"}</span>
                </p>
                {doc.descricaoCodigo && (
                  <p className="text-xs text-slate-500">{doc.descricaoCodigo}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Espécie / Tipologia Documental</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.categoria} ({doc.genero || "Textual"})
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Núcleo Produtor & Sigla NOBRADE</p>
                <p className="mt-0.5 font-medium text-slate-900">{doc.nucleo}</p>
                {doc.sigla && (
                  <p className="font-mono text-xs text-slate-500">{doc.sigla}</p>
                )}
              </div>
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-600">
                  Descrição Contextual / Âmbito e Conteúdo (NOBRADE · <code>dc.description</code>)
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
                  {doc.descricao && doc.descricao.trim()
                    ? doc.descricao
                    : "Nenhuma descrição contextual detalhada registrada para este documento."}
                </p>
              </div>
            </div>
          </section>

          {/* 2. Ciclo de Vida, Temporalidade (TTD) e Acesso */}
          <section className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Relação Orgânica (Dossiê), Temporalidade (TTD) e Acesso (LAI / LGPD)
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Dossiê / Unidade de Arquivamento</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-blue-700">
                  {doc.codigoDossie || "Documento Avulso (Sem Dossiê)"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destinação Final (TTD)</p>
                <p className="mt-0.5 font-semibold text-emerald-700">
                  {doc.destinacaoPrevista === "ELIMINACAO"
                    ? `Eliminação Controlada (${doc.anoDestinacaoFinal || doc.ano + 5})`
                    : `Guarda Permanente — RDC-Arq (${doc.anoDestinacaoFinal || doc.ano + 2})`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fase Arquivística Atual</p>
                <p className="mt-0.5 font-semibold text-blue-700">
                  {doc.faseArquivistica || "CORRENTE"} (Corrente: {doc.prazoCorrenteAnos ?? 2}a | Interm.:{" "}
                  {doc.prazoIntermediariaAnos ?? 0}a)
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data/Hora de Captura</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.upload} {doc.hora ? `às ${doc.hora}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agente de Captura</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.usuarioCaptura || "sistema"}
                </p>
              </div>
              {doc.hipoteseLegal && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Hipótese Legal de Restrição</p>
                  <p className="mt-0.5 font-medium text-amber-800">{doc.hipoteseLegal}</p>
                </div>
              )}
              {doc.previsaoDesclassificacao && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Previsão de Desclassificação (e-ARQ 1.31)
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-amber-900">
                    {doc.previsaoDesclassificacao}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 4. Governança Arquivística e-ARQ v2: Desclassificação LAI/LGPD (7.3.13) & Reclassificação PCD/TTD (1.3.9) */}
          {podeGovernarEarq && (
            <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Governança Arquivística e-ARQ Brasil v2 (Sigilo ECV6/ECV7 & Reclassificação PCD/TTD)
                  </h4>
                  <p className="text-[11px] text-blue-700">
                    Operações normativas restritas ao Arquivista e Administrador com registro de{" "}
                    <code>valorAnterior</code> na Trilha de Auditoria.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={painelAcao === "sigilo" ? "default" : "outline"}
                    onClick={() =>
                      setPainelAcao((atual) => (atual === "sigilo" ? "nenhum" : "sigilo"))
                    }
                    className="gap-1.5 text-xs bg-white text-slate-800 hover:bg-slate-100"
                  >
                    <Unlock className="h-3.5 w-3.5 text-amber-600" />
                    {doc.nivelAcesso && doc.nivelAcesso !== "OSTENSIVO"
                      ? "Desclassificar / Alterar Sigilo (7.3.13)"
                      : "Alterar Grau de Sigilo (ECV6)"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={painelAcao === "reclassificar" ? "default" : "outline"}
                    onClick={() =>
                      setPainelAcao((atual) =>
                        atual === "reclassificar" ? "nenhum" : "reclassificar"
                      )
                    }
                    className="gap-1.5 text-xs bg-white text-slate-800 hover:bg-slate-100"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                    Reclassificar no PCD / TTD (1.3.9)
                  </Button>
                </div>
              </div>

              {painelAcao === "sigilo" && (
                <div className="rounded-xl border border-amber-200 bg-white p-4 space-y-3">
                  <p className="text-xs font-bold text-amber-900">
                    Classificação / Desclassificação Formal de Grau de Sigilo (Requisito 7.3.13 & Eventos ECV6/ECV7)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Novo Grau de Acesso / Sigilo</Label>
                      <Select value={novoNivelAcesso} onValueChange={setNovoNivelAcesso}>
                        <SelectTrigger className="bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NIVEIS_ACESSO_OPCOES.map((op) => (
                            <SelectItem key={op.valor} value={op.valor}>
                              {op.rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {novoNivelAcesso !== "OSTENSIVO" && (
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Previsão de Desclassificação (Metadado e-ARQ 1.31)
                        </Label>
                        <Input
                          type="date"
                          value={novaPrevisaoDesclassificacao}
                          onChange={(e) => setNovaPrevisaoDesclassificacao(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                  {novoNivelAcesso !== "OSTENSIVO" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Hipótese Legal (LAI — Lei 12.527/2011 ou LGPD)</Label>
                      <Input
                        value={novaHipoteseLegal}
                        onChange={(e) => setNovaHipoteseLegal(e.target.value)}
                        placeholder="Ex: Art. 31 da Lei 12.527/2011 (Informação Pessoal) ou Art. 23 LAI..."
                        className="text-xs"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Justificativa Formal de Alteração / Desclassificação{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      rows={2}
                      value={justificativaSigilo}
                      onChange={(e) => setJustificativaSigilo(e.target.value)}
                      placeholder="Fundamente o ato de desclassificação (ECV7) ou alteração de sigilo (ECV6)..."
                      className="text-xs resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPainelAcao("nenhum")}
                    >
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={submeterAlteracaoSigilo}>
                      Registrar Ato de Sigilo (ECV6 / ECV7)
                    </Button>
                  </div>
                </div>
              )}

              {painelAcao === "reclassificar" && (
                <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-900">
                    Reclassificação Arquivística com Recálculo Automático da TTD (Requisitos 1.3.9 a 1.3.11)
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Nova Classe do Plano de Classificação (PCD)</Label>
                    <Select value={novoCodigoClasse} onValueChange={setNovoCodigoClasse}>
                      <SelectTrigger className="bg-white text-xs [&>span]:truncate">
                        <SelectValue placeholder="Selecione a classe do PCD..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(90vw,38rem)]">
                        {classesDisponiveis.map((c) => (
                          <SelectItem key={c.codigo} value={c.codigo}>
                            {c.codigo} — {c.titulo} ({c.destinacaoFinal === "GUARDA_PERMANENTE" ? "Guarda Permanente" : "Eliminação"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Justificativa Técnica da Reclassificação{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      rows={2}
                      value={justificativaReclassificacao}
                      onChange={(e) => setJustificativaReclassificacao(e.target.value)}
                      placeholder="Informe o motivo técnico da mudança de classe documental (mínimo 8 caracteres)..."
                      className="text-xs resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPainelAcao("nenhum")}
                    >
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={submeterReclassificacao}>
                      Confirmar Reclassificação e Recalcular TTD
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 3. Preservação Digital e Fixidade PREMIS */}
          <section
            className={`rounded-xl border p-4 space-y-3 ${
              integro
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-red-200 bg-red-50/50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Fingerprint className="h-4 w-4 text-primary" />
                3. Componente Digital & Fixidade Criptográfica (PREMIS)
              </h4>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${
                  integro
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {integro ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" /> Fixidade Íntegra (SHA-256)
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5" /> Divergência / Violação de Fixidade
                  </>
                )}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Formato MIME Validado</p>
                <p className="mt-0.5 font-mono text-xs font-medium text-slate-900">
                  {doc.formatoMime || `application/${doc.ext}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tamanho do Componente</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.tamanho ? formatarTamanho(doc.tamanho) : "Não aferido"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última Verificação PREMIS</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {doc.ultimaVerificacaoFixidade || `${doc.upload} ${doc.hora || ""}`}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Digest Criptográfico SHA-256 (earq.componente.fixidade)
                </span>
                {doc.hashSha256 && (
                  <button
                    type="button"
                    onClick={() => copiarTexto(doc.hashSha256!, "Hash SHA-256")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" /> Copiar Hash
                  </button>
                )}
              </div>
              <p className="mt-1 break-all font-mono text-xs text-slate-800 select-all">
                {doc.hashSha256 || "Hash pendente de sincronização — clique em Verificar Fixidade abaixo."}
              </p>
            </div>

            {(doc.pacoteSipId || doc.aipUuidArchivematica) && (
              <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Pacote SIP OAIS (BagIt RFC 8493)
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-slate-900">
                    {doc.pacoteSipId || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    AIP UUID no Archivematica (RDC-Arq)
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-emerald-900 break-all">
                    {doc.aipUuidArchivematica || "Em processamento no Archivematica"}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          {onVerificarFixidade && (
            <Button
              type="button"
              variant="outline"
              onClick={acionarVerificacao}
              disabled={verificando}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${verificando ? "animate-spin" : ""}`} />
              {verificando ? "Recalculando SHA-256..." : "Verificar Fixidade SHA-256 Agora"}
            </Button>
          )}
          <Button type="button" onClick={onClose} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Fechar Ficha
          </Button>
        </DialogFooter>
      </DialogContent>

      <ModalConfirmacaoAcaoSigad
        dados={confirmacaoAtiva}
        processando={processandoConfirmacao}
        onFechar={fecharConfirmacao}
        onConfirmar={executarConfirmacao}
      />
    </Dialog>
  );
}
