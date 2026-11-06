import { useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  FolderPlus,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NUCLEOS, SIGLA_POR_NUCLEO, type Doc } from "@/components/ged/data";
import { useGestaoArquivistica } from "@/hooks/useGestaoArquivistica";
import { podeEliminarDocumentoOficial } from "@/lib/auth";
import { formatarTamanho } from "@/lib/formatters";
import type { DossieItem } from "@/lib/pcd-dossie-api";

interface TelaGestaoArquivisticaProps {
  acervo: Doc[];
  usuarioPapel: string | null;
  onDocumentosAlterados?: (() => void) | undefined;
}

export function TelaGestaoArquivistica({
  acervo,
  usuarioPapel,
  onDocumentosAlterados,
}: TelaGestaoArquivisticaProps) {
  const {
    classesPcd,
    dossies,
    avaliacao,
    filtroAtividadePcd,
    setFiltroAtividadePcd,
    carregando,
    recarregarGestao,
    adicionarClassePcd,
    alternarClasseAtiva,
    abrirNovoDossie,
    mudarStatusDossie,
    executarJuntadaDossie,
  } = useGestaoArquivistica(onDocumentosAlterados);

  const [abaInterna, setAbaInterna] = useState<"dossies" | "pcd" | "avaliacao">("dossies");
  const temPermissaoArquivista = podeEliminarDocumentoOficial(usuarioPapel);

  // Estados Modal Novo Dossiê / Processo
  const [modalNovoDossie, setModalNovoDossie] = useState(false);
  const [dossieTitulo, setDossieTitulo] = useState("");
  const [dossieTipo, setDossieTipo] = useState("DOSSIE");
  const [dossieNucleo, setDossieNucleo] = useState(NUCLEOS[1]!);
  const [dossieCodigoClasse, setDossieCodigoClasse] = useState("FIM.100.01.001");
  const [dossieDestinacao, setDossieDestinacao] = useState("GUARDA_PERMANENTE");
  const [dossieDescricao, setDossieDescricao] = useState("");

  // Estados Modal Juntada de Documentos ao Dossiê
  const [dossieJuntadaAlvo, setDossieJuntadaAlvo] = useState<DossieItem | null>(null);
  const [docsSelecionadosJuntada, setDocsSelecionadosJuntada] = useState<string[]>([]);

  // Estados Modal Nova Classe PCD/TTD
  const [modalNovaClasse, setModalNovaClasse] = useState(false);
  const [classeCodigo, setClasseCodigo] = useState("");
  const [classeTitulo, setClasseTitulo] = useState("");
  const [classeTipoAtiv, setClasseTipoAtiv] = useState("Atividade-Fim");
  const [classeFuncao, setClasseFuncao] = useState(
    "FUNÇÃO FIM 100 — PESQUISA HISTÓRICA, LITERÁRIA E MEMÓRIA"
  );
  const [classePrazoCorrente, setClassePrazoCorrente] = useState("2");
  const [classePrazoIntermed, setClassePrazoIntermed] = useState("0");
  const [classeDestinacao, setClasseDestinacao] = useState("GUARDA_PERMANENTE");
  const [classeObs, setClasseObs] = useState("");

  async function salvarNovoDossie(e: React.FormEvent) {
    e.preventDefault();
    if (!dossieTitulo.trim()) return;
    const classeObj = classesPcd.find((c) => c.codigo === dossieCodigoClasse);
    const ok = await abrirNovoDossie({
      titulo: dossieTitulo.trim(),
      tipo_unidade: dossieTipo,
      nucleo: dossieNucleo,
      sigla_nucleo: SIGLA_POR_NUCLEO[dossieNucleo] || "",
      codigo_classificacao: dossieCodigoClasse,
      descricao_codigo: classeObj?.titulo || dossieTitulo.trim(),
      destinacao_prevista: dossieDestinacao,
      ano: new Date().getFullYear(),
      descricao: dossieDescricao.trim(),
    });
    if (ok) {
      setDossieTitulo("");
      setDossieDescricao("");
      setModalNovoDossie(false);
    }
  }

  async function salvarNovaClasse(e: React.FormEvent) {
    e.preventDefault();
    if (!classeCodigo.trim() || !classeTitulo.trim()) return;
    const ok = await adicionarClassePcd({
      codigo: classeCodigo.trim(),
      titulo: classeTitulo.trim(),
      tipo_atividade: classeTipoAtiv,
      funcao: classeFuncao.trim(),
      prazo_corrente_anos: Number(classePrazoCorrente) || 2,
      prazo_intermediaria_anos: Number(classePrazoIntermed) || 0,
      destinacao_final: classeDestinacao,
      observacoes_ttd: classeObs.trim(),
    });
    if (ok) {
      setClasseCodigo("");
      setClasseTitulo("");
      setClasseObs("");
      setModalNovaClasse(false);
    }
  }

  async function confirmarJuntada() {
    if (!dossieJuntadaAlvo || docsSelecionadosJuntada.length === 0) return;
    const ok = await executarJuntadaDossie(dossieJuntadaAlvo.id, docsSelecionadosJuntada);
    if (ok) {
      setDossieJuntadaAlvo(null);
      setDocsSelecionadosJuntada([]);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-600/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-600">
              Relação Orgânica & Temporalidade
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Plano de Classificação (PCD), TTD & Dossiês
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão de Unidades de Arquivamento (Dossiês/Processos), Atividades-Fim e Meio, e cálculo
            de prazos de guarda para recolhimento ao Archivematica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={recarregarGestao}
            disabled={carregando}
            className="gap-2 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button onClick={() => setModalNovoDossie(true)} className="gap-2">
            <FolderPlus className="h-4 w-4" /> Abrir Novo Dossiê / Processo
          </Button>
          {temPermissaoArquivista && (
            <Button
              variant="outline"
              onClick={() => setModalNovaClasse(true)}
              className="gap-2 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" /> Nova Classe PCD/TTD
            </Button>
          )}
        </div>
      </header>

      {/* KPIs de Gestão Arquivística e Temporalidade */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Dossiês / Processos
              </p>
              <p className="mt-2 text-3xl font-semibold text-primary">{dossies.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Unidades de Arquivamento ativas
              </p>
            </div>
            <FolderKanban className="h-8 w-8 text-primary/25" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Classes no PCD/TTD
              </p>
              <p className="mt-2 text-3xl font-semibold text-blue-600">{classesPcd.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atividades-Fim (FCJA) e Meio (APEPB)
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500/25" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Guarda Permanente (RDC-Arq)
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                {avaliacao ? avaliacao.porDestinacao.GUARDA_PERMANENTE || 0 : "..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Destinados ao Archivematica / AtoM
              </p>
            </div>
            <Archive className="h-8 w-8 text-emerald-500/25" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Guarda Temporária (TTD)
              </p>
              <p className="mt-2 text-3xl font-semibold text-amber-600">
                {avaliacao ? avaliacao.porDestinacao.ELIMINACAO || 0 : "..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sujeitos a avaliação e eliminação futura
              </p>
            </div>
            <CalendarClock className="h-8 w-8 text-amber-500/25" />
          </div>
        </div>
      </section>

      {/* Navegação entre Sub-Abas da Fase 3 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={abaInterna === "dossies" ? "default" : "outline"}
          size="sm"
          onClick={() => setAbaInterna("dossies")}
          className="gap-2"
        >
          <FolderKanban className="h-4 w-4" />
          1. Dossiês & Processos — Relação Orgânica ({dossies.length})
        </Button>
        <Button
          variant={abaInterna === "pcd" ? "default" : "outline"}
          size="sm"
          onClick={() => setAbaInterna("pcd")}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          2. Plano de Classificação (PCD) & Tabela de Temporalidade (TTD) ({classesPcd.length})
        </Button>
        <Button
          variant={abaInterna === "avaliacao" ? "default" : "outline"}
          size="sm"
          onClick={() => setAbaInterna("avaliacao")}
          className="gap-2"
        >
          <CalendarClock className="h-4 w-4" />
          3. Avaliação Temporal & Relação de Recolhimento (Archivematica)
        </Button>
      </div>

      {/* SUB-ABA 1: DOSSIÊS E PROCESSOS (RELAÇÃO ORGÂNICA) */}
      {abaInterna === "dossies" && (
        <section className="space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            {dossies.map((d) => (
              <div
                key={d.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                      {d.codigoDossie}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          d.destinacaoPrevista === "GUARDA_PERMANENTE"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        }`}
                      >
                        {d.destinacaoPrevista === "GUARDA_PERMANENTE"
                          ? "Guarda Permanente (Archivematica)"
                          : "Guarda Temporária"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          d.statusDossie === "ABERTO"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {d.statusDossie}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{d.titulo}</h3>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{d.nucleo}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <span>
                      <strong>Classe PCD:</strong>{" "}
                      <code className="font-mono text-blue-700">
                        {d.codigoClassificacao || "FIM.100.01.001"}
                      </code>
                    </span>
                    <span>
                      <strong>Abertura:</strong> {d.dataAbertura}
                    </span>
                    <span>
                      <strong>Volume:</strong> Vol. {d.volumeAtual}
                    </span>
                    <span>
                      <strong>Peças Juntadas:</strong> {d.totalDocumentos} doc(s) (
                      {formatarTamanho(d.tamanhoTotalBytes)})
                    </span>
                  </div>

                  {/* Lista resumida dos documentos vinculados organicamente */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Documentos Juntados nesta Unidade de Arquivamento:
                    </p>
                    {d.documentos.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Nenhum documento juntado ainda. Clique em &ldquo;Juntar Documentos&rdquo;
                        abaixo.
                      </p>
                    ) : (
                      <ul className="max-h-28 space-y-1 overflow-y-auto text-xs">
                        {d.documentos.map((docItem, idx) => (
                          <li
                            key={docItem.id}
                            className="flex items-center justify-between gap-2 text-slate-700"
                          >
                            <span className="truncate">
                              <strong className="font-mono text-[11px] text-slate-500">
                                Peça #{idx + 1} [{docItem.numeroProtocolo || docItem.id.slice(0, 6)}]
                              </strong>{" "}
                              {docItem.nome}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {docItem.categoria} ({docItem.ano})
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDossieJuntadaAlvo(d);
                      setDocsSelecionadosJuntada(d.documentos.map((x) => x.id));
                    }}
                    disabled={d.statusDossie !== "ABERTO"}
                    className="gap-1.5 text-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Juntar Documentos (Vínculo Orgânico)
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      mudarStatusDossie(
                        d.id,
                        d.statusDossie === "ABERTO" ? "ENCERRADO" : "ABERTO"
                      )
                    }
                    className="gap-1.5 text-xs text-slate-600"
                  >
                    {d.statusDossie === "ABERTO" ? (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Encerrar Dossiê
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" /> Reabrir Dossiê
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUB-ABA 2: PLANO DE CLASSIFICAÇÃO (PCD) & TABELA DE TEMPORALIDADE (TTD) */}
      {abaInterna === "pcd" && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">
                Catálogo de Classes, Prazos de Guarda e Destinação Final (PCD / TTD)
              </h3>
              <p className="text-xs text-muted-foreground">
                Inclui as classes de Atividade-Fim da FCJA e Atividade-Meio (PCDM/APEPB)
              </p>
            </div>

            <div className="w-64">
              <Select value={filtroAtividadePcd} onValueChange={setFiltroAtividadePcd}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Atividades (Fim + Meio)</SelectItem>
                  <SelectItem value="Atividade-Fim">Atividade-Fim (Pesquisa & Acervo FCJA)</SelectItem>
                  <SelectItem value="Atividade-Meio">Atividade-Meio (Gestão / APEPB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Código PCD</TableHead>
                  <TableHead className="w-36">Escopo</TableHead>
                  <TableHead>Título da Classe / Série Documental</TableHead>
                  <TableHead className="w-32">Fase Corrente</TableHead>
                  <TableHead className="w-36">Fase Intermediária</TableHead>
                  <TableHead className="w-48">Destinação Final (TTD)</TableHead>
                  <TableHead className="w-28 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classesPcd.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs font-bold text-blue-700">
                      {c.codigo}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          c.tipoAtividade === "Atividade-Fim"
                            ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {c.tipoAtividade}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="font-medium text-xs text-slate-900">{c.titulo}</p>
                      {c.funcao && (
                        <p className="text-[11px] text-muted-foreground truncate">{c.funcao}</p>
                      )}
                      {c.observacoesTtd && (
                        <p className="text-[11px] text-blue-600/80 mt-0.5">{c.observacoesTtd}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {c.prazoCorrenteAnos} ano(s)
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {c.prazoIntermediariaAnos === 0
                        ? "Imediato (0a)"
                        : `${c.prazoIntermediariaAnos} ano(s)`}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.destinacaoFinal === "GUARDA_PERMANENTE"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        }`}
                      >
                        {c.destinacaoFinal === "GUARDA_PERMANENTE"
                          ? "Guarda Permanente (RDC-Arq)"
                          : "Eliminação Controlada"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        disabled={!temPermissaoArquivista}
                        onClick={() => alternarClasseAtiva(c.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.ativa
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                        }`}
                        title={
                          temPermissaoArquivista
                            ? "Clique para ativar/inativar esta classe (EarqEventoClasse)"
                            : "Somente Arquivistas/Administradores podem ativar/inativar classes"
                        }
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {c.ativa ? "ATIVA" : "INATIVA"}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* SUB-ABA 3: AVALIAÇÃO TEMPORAL & RELAÇÃO DE RECOLHIMENTO */}
      {abaInterna === "avaliacao" && avaliacao && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-emerald-50/70 border-b border-emerald-200 px-6 py-4">
              <h3 className="text-base font-semibold text-emerald-950 flex items-center gap-2">
                <Archive className="h-4 w-4 text-emerald-700" />
                Relação de Documentos de Guarda Permanente ({avaliacao.relacaoGuardaPermanente.length})
              </h3>
              <p className="text-xs text-emerald-800">
                Documentos cujo destino final na TTD é o recolhimento ao{" "}
                <strong>Archivematica (RDC-Arq)</strong> e difusão no <strong>AtoM</strong>.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {avaliacao.relacaoGuardaPermanente.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-blue-700">
                      {item.numeroProtocolo || item.id.slice(0, 8)}{" "}
                      {item.codigoDossie && (
                        <span className="text-slate-500 font-normal">
                          · [{item.codigoDossie}]
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs font-medium text-slate-900">{item.nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.nucleo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {item.faseArquivistica}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Recolhimento previsto: {item.anoDestinacaoFinal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-amber-50/70 border-b border-amber-200 px-6 py-4">
              <h3 className="text-base font-semibold text-amber-950 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-700" />
                Listagem de Guarda Temporária / Eliminação Futura (
                {avaliacao.listagemGuardaTemporaria.length})
              </h3>
              <p className="text-xs text-amber-800">
                Documentos de atividade-meio sujeitos a eliminação após cumprimento dos prazos
                corrente e intermediário.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {avaliacao.listagemGuardaTemporaria.length === 0 ? (
                <p className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum documento de guarda temporária listado no momento.
                </p>
              ) : (
                avaliacao.listagemGuardaTemporaria.map((item) => (
                  <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-amber-800">
                        {item.numeroProtocolo || item.id.slice(0, 8)}
                      </p>
                      <p className="truncate text-xs font-medium text-slate-900">{item.nome}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{item.nucleo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {item.faseArquivistica}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        Fim da guarda: {item.anoDestinacaoFinal}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* MODAL: ABRIR NOVO DOSSIÊ / PROCESSO */}
      <Dialog open={modalNovoDossie} onOpenChange={setModalNovoDossie}>
        <DialogContent className="sm:max-w-xl w-[calc(100vw-2rem)] max-w-xl">
          <DialogHeader>
            <DialogTitle>Abrir Nova Unidade de Arquivamento (Dossiê / Processo)</DialogTitle>
            <DialogDescription>
              Agrupe documentos de uma mesma pesquisa ou ação cultural mantendo o vínculo
              arquivístico e a proveniência documental.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarNovoDossie} className="space-y-4 py-2 w-full min-w-0">
            <div className="space-y-1 min-w-0">
              <Label>Título do Dossiê / Processo</Label>
              <Input
                required
                value={dossieTitulo}
                onChange={(e) => setDossieTitulo(e.target.value)}
                placeholder="Ex: Dossiê de Transcrição de Cartas de José Américo (1930-1934)"
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label>Tipo de Unidade</Label>
                <Select value={dossieTipo} onValueChange={setDossieTipo}>
                  <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOSSIE">Dossiê Arquivístico</SelectItem>
                    <SelectItem value="PROCESSO">Processo Administrativo/Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0">
                <Label>Destinação Prevista (TTD)</Label>
                <Select value={dossieDestinacao} onValueChange={setDossieDestinacao}>
                  <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUARDA_PERMANENTE">
                      Guarda Permanente (Archivematica)
                    </SelectItem>
                    <SelectItem value="ELIMINACAO">Guarda Temporária (Eliminação)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label>Núcleo Produtor</Label>
              <Select value={dossieNucleo} onValueChange={setDossieNucleo}>
                <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,36rem)]">
                  {NUCLEOS.filter((n) => n !== "Todos").map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-0">
              <Label>Classe do Plano de Classificação (PCD)</Label>
              <Select value={dossieCodigoClasse} onValueChange={setDossieCodigoClasse}>
                <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,36rem)]">
                  {classesPcd.map((c) => (
                    <SelectItem key={c.codigo} value={c.codigo}>
                      {c.codigo} — {c.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-0">
              <Label>Ementa / Contexto Arquivístico</Label>
              <Textarea
                rows={2}
                value={dossieDescricao}
                onChange={(e) => setDossieDescricao(e.target.value)}
                placeholder="Descreva o escopo deste dossiê..."
                className="w-full resize-none"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalNovoDossie(false)}>
                Cancelar
              </Button>
              <Button type="submit">Abrir Dossiê no SIGAD</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: JUNTADA DE DOCUMENTOS AO DOSSIÊ */}
      <Dialog
        open={dossieJuntadaAlvo !== null}
        onOpenChange={(o) => !o && setDossieJuntadaAlvo(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Juntada Arquivística — {dossieJuntadaAlvo?.codigoDossie}
            </DialogTitle>
            <DialogDescription>
              Selecione os documentos do acervo para vincular organicamente ao dossiê{" "}
              <strong>{dossieJuntadaAlvo?.titulo}</strong> (gera evento{" "}
              <code>EarqEventoProc</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-3 space-y-2">
            {acervo.map((doc) => {
              const marcado = docsSelecionadosJuntada.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-2 text-xs hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={(checked) => {
                        setDocsSelecionadosJuntada((prev) =>
                          checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                        );
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-blue-700">
                        {doc.numeroProtocolo || doc.id.slice(0, 8)}
                      </p>
                      <p className="truncate font-medium text-slate-900">{doc.nome}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {doc.codigoDossie ? `Atual: ${doc.codigoDossie}` : "Avulso"}
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDossieJuntadaAlvo(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarJuntada} disabled={docsSelecionadosJuntada.length === 0}>
              Confirmar Juntada ({docsSelecionadosJuntada.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVA CLASSE PCD / TTD */}
      <Dialog open={modalNovaClasse} onOpenChange={setModalNovaClasse}>
        <DialogContent className="sm:max-w-xl w-[calc(100vw-2rem)] max-w-xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Classe no PCD / TTD</DialogTitle>
            <DialogDescription>
              Adicione um novo código de classificação e defina seus prazos de guarda corrente,
              intermediária e destinação final (gera <code>EarqEventoClasse</code>).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarNovaClasse} className="space-y-4 py-2 w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label>Código da Classe</Label>
                <Input
                  required
                  value={classeCodigo}
                  onChange={(e) => setClasseCodigo(e.target.value)}
                  placeholder="Ex: FIM.100.04.001"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label>Escopo da Atividade</Label>
                <Select value={classeTipoAtiv} onValueChange={setClasseTipoAtiv}>
                  <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Atividade-Fim">Atividade-Fim (FCJA)</SelectItem>
                    <SelectItem value="Atividade-Meio">Atividade-Meio (APEPB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <Label>Título da Classe / Série Documental</Label>
              <Input
                required
                value={classeTitulo}
                onChange={(e) => setClasseTitulo(e.target.value)}
                placeholder="Ex: Dossiê de Exposição Museológica e Curadoria"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <Label>Função / Grupo Superior</Label>
              <Input
                value={classeFuncao}
                onChange={(e) => setClasseFuncao(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label>Fase Corrente (Anos)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={classePrazoCorrente}
                  onChange={(e) => setClassePrazoCorrente(e.target.value)}
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label>Intermediária (Anos)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={classePrazoIntermed}
                  onChange={(e) => setClassePrazoIntermed(e.target.value)}
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label>Destinação Final</Label>
                <Select value={classeDestinacao} onValueChange={setClasseDestinacao}>
                  <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUARDA_PERMANENTE">Guarda Permanente</SelectItem>
                    <SelectItem value="ELIMINACAO">Eliminação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações da TTD</Label>
              <Textarea
                rows={2}
                value={classeObs}
                onChange={(e) => setClasseObs(e.target.value)}
                placeholder="Ex: Recolhimento ao RDC-Arq (Archivematica) após encerramento da ação..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalNovaClasse(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Classe no PCD/TTD</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
