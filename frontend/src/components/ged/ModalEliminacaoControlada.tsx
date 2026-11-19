import { useState, useEffect } from "react";
import { AlertTriangle, FileWarning, FolderKanban, Lock, Printer, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { Doc } from "@/components/ged/data";
import { MOTIVOS_ELIMINACAO_OPCOES } from "@/lib/sigad-api";
import { imprimirListagemEEditalEliminacao } from "@/lib/termo-eliminacao-export";
import { podeEliminarDocumentoOficial, rotuloPapelSigad } from "@/lib/auth";
import {
  ModalConfirmacaoAcaoSigad,
  useConfirmacaoSigad,
} from "@/components/ged/ModalConfirmacaoAcaoSigad";

interface ModalEliminacaoControladaProps {
  alvos: Doc[];
  aberto: boolean;
  usuarioPapel?: string | null | undefined;
  onFechar: () => void;
  onConfirmar: (motivoEliminacao: string, justificativa: string) => Promise<void>;
}

export function ModalEliminacaoControlada({
  alvos,
  aberto,
  usuarioPapel,
  onFechar,
  onConfirmar,
}: ModalEliminacaoControladaProps) {
  const temDocumentoOficial = alvos.some(
    (d) => (d.statusDocumento || "ORIGINAL").toUpperCase() !== "MINUTA"
  );
  const temPermissaoOficial = podeEliminarDocumentoOficial(usuarioPapel);
  const bloqueadoPorRbac = temDocumentoOficial && !temPermissaoOficial;

  const anoAtual = new Date().getFullYear();

  // Requisito 7.3.15 [O]: Documentos sigilosos ou restritos não podem ser eliminados antes da desclassificação
  const docsComRestricaoSigilo = alvos.filter(
    (d) =>
      (d.statusDocumento || "ORIGINAL").toUpperCase() !== "MINUTA" &&
      (d.nivelAcesso || "OSTENSIVO").toUpperCase() !== "OSTENSIVO"
  );
  const bloqueadoPorSigilo = docsComRestricaoSigilo.length > 0;

  // Requisito 3.3.4 [O]: Alerta quando documento está vinculado a um Dossiê / Processo
  const docsVinculadosADossie = alvos.filter((d) => Boolean(d.dossieId || d.codigoDossie));

  const [motivo, setMotivo] = useState<string>(
    temDocumentoOficial ? "CUMPRIMENTO_PRAZO_TTD" : "DESCARTE_MINUTA_RASCUNHO"
  );
  const [justificativa, setJustificativa] = useState<string>("");
  const [processando, setProcessando] = useState<boolean>(false);

  // Requisito 3.3.3 [O]: Bloqueio estrito de eliminação por Cumprimento de Prazo TTD
  const docsGuardaPermanente = alvos.filter(
    (d) =>
      (d.statusDocumento || "ORIGINAL").toUpperCase() !== "MINUTA" &&
      (d.destinacaoPrevista || "GUARDA_PERMANENTE").toUpperCase() === "GUARDA_PERMANENTE"
  );
  const docsPrazoTtdVigente = alvos.filter(
    (d) =>
      (d.statusDocumento || "ORIGINAL").toUpperCase() !== "MINUTA" &&
      (d.anoDestinacaoFinal || d.ano + 5) > anoAtual
  );
  const bloqueadoPorTtd =
    motivo === "CUMPRIMENTO_PRAZO_TTD" &&
    (docsGuardaPermanente.length > 0 || docsPrazoTtdVigente.length > 0);
  const {
    confirmacaoAtiva,
    processandoConfirmacao,
    solicitarConfirmacao,
    fecharConfirmacao,
    executarConfirmacao,
  } = useConfirmacaoSigad();

  useEffect(() => {
    if (aberto) {
      setMotivo(
        temDocumentoOficial ? "CUMPRIMENTO_PRAZO_TTD" : "DESCARTE_MINUTA_RASCUNHO"
      );
      setJustificativa("");
    }
  }, [aberto, temDocumentoOficial]);

  function submeterEliminacao() {
    if (bloqueadoPorRbac || bloqueadoPorSigilo || bloqueadoPorTtd) return;

    const justLimpa = justificativa.trim();
    if (temDocumentoOficial && justLimpa.length < 10) {
      toast.error("Justificativa obrigatória", {
        description:
          "Informe ao menos 10 caracteres de fundamentação técnica para emitir o Termo de Eliminação.",
      });
      return;
    }

    const rotuloMotivo =
      MOTIVOS_ELIMINACAO_OPCOES.find((op) => op.valor === motivo)?.rotulo || motivo;
    const plural = alvos.length > 1;
    const detalhesAlvo = [
      `Alvo(s): ${alvos
        .map((d) => `${d.numeroProtocolo ? `[${d.numeroProtocolo}] ` : ""}${d.nome}`)
        .slice(0, 3)
        .join(", ")}${alvos.length > 3 ? ` (+${alvos.length - 3})` : ""}`,
      `Motivo Normativo: ${rotuloMotivo}`,
      `Justificativa Técnica: ${justLimpa || "Descarte de minuta em espaço de trabalho."}`,
    ];
    if (docsVinculadosADossie.length > 0) {
      detalhesAlvo.push(
        `ALERTA e-ARQ 3.3.4 (Vínculo com Dossiê): ${docsVinculadosADossie.length} documento(s) fazem parte de Dossiê/Processo (${docsVinculadosADossie
          .map((d) => d.codigoDossie || "Dossiê")
          .slice(0, 2)
          .join(", ")}) e serão desentranhados e eliminados!`
      );
    }

    solicitarConfirmacao({
      titulo: plural
        ? `Você deseja prosseguir com a exclusão definitiva dos ${alvos.length} documentos?`
        : "Você deseja prosseguir com a exclusão definitiva deste documento?",
      descricao:
        "ATENÇÃO: Esta operação é irreversível. O componente digital físico será removido do armazenamento e um Termo de Eliminação perpétuo será gravado na Trilha de Auditoria Imutável.",
      categoriaNormativa: "Eliminação Documental Controlada · Termo Oficial CONARQ",
      variante: "perigo",
      rotuloConfirmar: "Sim, Eliminar e Emitir Termo",
      detalhesAlvo,
      onConfirmar: async () => {
        setProcessando(true);
        try {
          await onConfirmar(
            motivo,
            justLimpa || "Descarte de minuta em espaço de trabalho."
          );
          onFechar();
        } finally {
          setProcessando(false);
        }
      },
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                bloqueadoPorRbac
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {bloqueadoPorRbac ? (
                <>
                  <ShieldAlert className="h-3.5 w-3.5" /> Bloqueio de Imutabilidade (RBAC)
                </>
              ) : (
                <>
                  <FileWarning className="h-3.5 w-3.5" /> Governança de Eliminação
                </>
              )}
            </span>
          </div>
          <DialogTitle className="mt-1">
            {bloqueadoPorRbac
              ? "Exclusão Bloqueada — Documento Oficial Capturado"
              : `Emitir Termo de Eliminação (${alvos.length} documento${
                  alvos.length > 1 ? "s" : ""
                })`}
          </DialogTitle>
          <DialogDescription>
            {bloqueadoPorRbac
              ? "Documentos oficiais capturados são imutáveis no acervo institucional e não podem ser apagados por pesquisadores sem autorização arquivística."
              : "A eliminação de documentos no SIGAD requer fundamentação normativa e gera automaticamente um Termo de Eliminação perpétuo na Trilha de Auditoria."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm min-w-0">
          {/* Lista de Documentos Alvo */}
          <div className="rounded-xl border border-border bg-slate-50 p-3.5 min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
              Documento(s) selecionado(s):
            </p>
            <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs">
              {alvos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 min-w-0">
                  <span className="truncate font-medium text-slate-800 min-w-0 flex-1" title={d.nome}>
                    {d.numeroProtocolo ? `[${d.numeroProtocolo}] ` : ""}
                    {d.nome}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      (d.statusDocumento || "ORIGINAL") === "MINUTA"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {d.statusDocumento || "ORIGINAL"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {bloqueadoPorRbac ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-sm text-red-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                Permissão insuficiente para o perfil &ldquo;{rotuloPapelSigad(usuarioPapel)}&rdquo;
              </p>
              <p>
                Pesquisadores possuem permissão apenas para descartar rascunhos com status{" "}
                <strong>MINUTA</strong>. Para eliminar documentos oficiais (
                <strong>ORIGINAL</strong> ou <strong>CÓPIA</strong>), solicite a avaliação de um{" "}
                <strong>Arquivista SIGAD</strong> ou <strong>Administrador</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Requisito 7.3.15 [O]: Trava de Sigilo LAI / LGPD */}
              {bloqueadoPorSigilo && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-1">
                  <p className="flex items-center gap-1.5 font-bold text-red-950">
                    <Lock className="h-4 w-4 shrink-0 text-red-600" />
                    Trava de Segurança e-ARQ Brasil v2 (Requisito 7.3.15 [O]): Eliminação Bloqueada por Sigilo
                  </p>
                  <p>
                    {docsComRestricaoSigilo.length} documento(s) selecionado(s) possuem restrição de acesso (
                    <strong>
                      {docsComRestricaoSigilo
                        .map((d) => `${d.nome} [${d.nivelAcesso}]`)
                        .slice(0, 2)
                        .join(", ")}
                    </strong>
                    ). O SIGAD proíbe a eliminação de documentos sigilosos (LAI) ou restritos (LGPD) antes de
                    sua formal <strong>Desclassificação para OSTENSIVO</strong> na Ficha e-ARQ.
                  </p>
                </div>
              )}

              {/* Requisito 3.3.4 [O]: Alerta de Vínculo com Dossiê / Processo */}
              {docsVinculadosADossie.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 space-y-1">
                  <p className="flex items-center gap-1.5 font-bold">
                    <FolderKanban className="h-4 w-4 shrink-0 text-amber-700" />
                    Alerta de Vínculo Orgânico com Dossiê (Requisito 3.3.4 [O] — e-ARQ Brasil v2)
                  </p>
                  <p>
                    Atenção: <strong>{docsVinculadosADossie.length} documento(s)</strong> selecionado(s) estão
                    juntados organicamente a Dossiê/Processo (
                    <code className="font-mono font-bold">
                      {Array.from(new Set(docsVinculadosADossie.map((d) => d.codigoDossie))).join(", ")}
                    </code>
                    ). Verifique a integridade do dossiê antes de confirmar a eliminação.
                  </p>
                </div>
              )}

              <div className="space-y-2 min-w-0">
                <Label>Motivo Normativo da Eliminação</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger className="w-full min-w-0 bg-white [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_ELIMINACAO_OPCOES.map((op) => (
                      <SelectItem key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Requisito 3.3.3 [O]: Trava estrita de Temporalidade (TTD) */}
              {bloqueadoPorTtd && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-1">
                  <p className="flex items-center gap-1.5 font-bold text-red-950">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                    Trava de Temporalidade TTD (Requisito 3.3.3 [O] — e-ARQ Brasil v2)
                  </p>
                  {docsGuardaPermanente.length > 0 && (
                    <p>
                      • <strong>{docsGuardaPermanente.length} documento(s)</strong> possuem destinação final{" "}
                      <strong>GUARDA PERMANENTE</strong> na TTD e não podem ser eliminados por cumprimento de
                      prazo (devem ser recolhidos ao RDC-Arq / Archivematica).
                    </p>
                  )}
                  {docsPrazoTtdVigente.length > 0 && (
                    <p>
                      • <strong>{docsPrazoTtdVigente.length} documento(s)</strong> ainda estão com prazo de
                      guarda vigente na TTD (vencimento em{" "}
                      <strong>
                        {docsPrazoTtdVigente.map((d) => d.anoDestinacaoFinal || d.ano + 5).join(", ")}
                      </strong>
                      ). Caso se trate de duplicidade ou erro material na captura, selecione o motivo técnico
                      correspondente acima.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 min-w-0">
                <Label htmlFor="justificativa-termo">
                  Justificativa Técnica / Fundamentação para o Termo de Eliminação{" "}
                  {temDocumentoOficial && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="justificativa-termo"
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  className="w-full min-w-0 resize-none bg-white"
                  placeholder={
                    temDocumentoOficial
                      ? "Descreva o motivo técnico ou referência ao Edital/TTD para constar no Termo de Eliminação (mínimo 10 caracteres)..."
                      : "Opcional para descarte de minuta/rascunho..."
                  }
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const ok = imprimirListagemEEditalEliminacao(
                alvos.map((d) => ({
                  numeroProtocolo: d.numeroProtocolo,
                  nome: d.nome,
                  codigoClassificacao: d.codigoClassificacao,
                  categoria: d.categoria,
                  ano: d.ano,
                  nucleo: d.nucleo,
                  observacao:
                    justificativa.trim() ||
                    MOTIVOS_ELIMINACAO_OPCOES.find((o) => o.valor === motivo)?.rotulo,
                }))
              );
              if (!ok) {
                toast.error("Permita pop-ups para imprimir a Listagem e o Edital de Eliminação.");
              }
            }}
            className="gap-1.5 text-xs border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100"
          >
            <Printer className="h-3.5 w-3.5" />
            Listagem & Edital de Eliminação (CONARQ 3.3.9)
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onFechar} disabled={processando}>
              {bloqueadoPorRbac ? "Entendido" : "Cancelar"}
            </Button>
            {!bloqueadoPorRbac && (
              <Button
                variant="destructive"
                onClick={submeterEliminacao}
                disabled={processando || bloqueadoPorSigilo || bloqueadoPorTtd}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {processando
                  ? "Emitindo Termo e Eliminando..."
                  : "Confirmar e Emitir Termo de Eliminação"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <ModalConfirmacaoAcaoSigad
        dados={confirmacaoAtiva}
        processando={processando || processandoConfirmacao}
        onFechar={fecharConfirmacao}
        onConfirmar={executarConfirmacao}
      />
    </Dialog>
  );
}
