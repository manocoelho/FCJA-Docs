import { useState, useMemo } from "react";
import {
  Activity,
  Archive,
  CalendarClock,
  CheckCircle2,
  Eye,
  Files,
  Fingerprint,
  FolderKanban,
  HardDrive,
  Layers,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterChips, type Chip } from "@/components/ged/FilterChips";
import {
  BarrasAno,
  PizzaNucleos,
  BarrasTipologia,
  GraficoCicloVitalTtd,
  GraficoGovernancaFormatos,
} from "@/components/ged/Charts";
import { PainelAlertasArquivista } from "@/components/ged/PainelAlertasArquivista";
import { NUCLEOS, ANOS, type Doc } from "@/components/ged/data";
import { TIPOLOGIAS_MEIO } from "@/components/ged/codigos";
import { FiltroPastas } from "@/components/ged/FiltroPastas";
import {
  formatarHashCurto,
  formatarTamanho,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";
import { useDashboardSigad, type AbaSistemaSigad } from "@/hooks/useDashboardSigad";

type FiltrosArquivisticos = {
  tipos: string[];
  anoDe: number;
  anoAte: number;
  nucleo: string;
  prefixoPasta: string;
  tipoAtividade: string;
  faseArquivistica: string;
  destinacaoPrevista: string;
  nivelAcesso: string;
};

const ANO_MIN = 2022;
const ANO_MAX = 2027;

const INICIAL: FiltrosArquivisticos = {
  tipos: [],
  anoDe: ANO_MIN,
  anoAte: ANO_MAX,
  nucleo: "Todos",
  prefixoPasta: "",
  tipoAtividade: "TODAS",
  faseArquivistica: "TODAS",
  destinacaoPrevista: "TODAS",
  nivelAcesso: "TODOS",
};

interface TelaDashboardProps {
  acervo: Doc[];
  sysStatus: {
    total_bytes: number;
    usado_bytes: number;
    livre_bytes: number;
    acervo_bytes: number;
  } | null;
  onNavegarAba?: ((aba: AbaSistemaSigad) => void) | undefined;
  onAbrirDoc?: ((doc: Doc) => void) | undefined;
}

export function TelaDashboard({
  acervo,
  sysStatus,
  onNavegarAba,
  onAbrirDoc,
}: TelaDashboardProps) {
  const [filtrosDash, setFiltrosDash] = useState<FiltrosArquivisticos>(INICIAL);
  const [modalFiltrosDash, setModalFiltrosDash] = useState(false);
  const [visaoAtiva, setVisaoAtiva] = useState<"360" | "gestao_ttd" | "preservacao_auditoria">(
    "360"
  );

  const documentosDash = useMemo(
    () =>
      acervo.filter((d) => {
        const tipoOk =
          filtrosDash.tipos.length === 0 || filtrosDash.tipos.includes(d.categoria);
        const anoOk = d.ano >= filtrosDash.anoDe && d.ano <= filtrosDash.anoAte;
        const nucleoOk =
          filtrosDash.nucleo === "Todos" || d.nucleo === filtrosDash.nucleo;
        const pastaOk =
          !filtrosDash.prefixoPasta ||
          d.codigoClassificacao?.startsWith(filtrosDash.prefixoPasta);

        const ehFim =
          d.tipoAtividade === "Atividade-Fim" ||
          (d.codigoClassificacao || "").startsWith("FIM.");
        const atividadeDoc = ehFim ? "Atividade-Fim" : "Atividade-Meio";
        const atividadeOk =
          filtrosDash.tipoAtividade === "TODAS" ||
          atividadeDoc === filtrosDash.tipoAtividade;

        const faseDoc = d.faseArquivistica || "CORRENTE";
        const faseOk =
          filtrosDash.faseArquivistica === "TODAS" ||
          faseDoc === filtrosDash.faseArquivistica;

        const destDoc =
          d.destinacaoPrevista || (ehFim ? "GUARDA_PERMANENTE" : "ELIMINACAO");
        const destOk =
          filtrosDash.destinacaoPrevista === "TODAS" ||
          destDoc === filtrosDash.destinacaoPrevista;

        const acessoDoc = d.nivelAcesso || "OSTENSIVO";
        const acessoOk =
          filtrosDash.nivelAcesso === "TODOS" || acessoDoc === filtrosDash.nivelAcesso;

        return (
          tipoOk &&
          anoOk &&
          nucleoOk &&
          pastaOk &&
          atividadeOk &&
          faseOk &&
          destOk &&
          acessoOk
        );
      }),
    [filtrosDash, acervo]
  );

  const {
    dossies,
    eventosRecentes,
    pacotesSip,
    metricas,
    alertasArquivista,
    carregandoTelemetria,
    ultimaAtualizacao,
    recarregarTelemetriaSigad,
  } = useDashboardSigad(acervo, documentosDash);

  const chipsDash: Chip[] = [
    ...filtrosDash.tipos.map((t) => ({
      id: `tipo-${t}`,
      label: `Tipologia: ${t}`,
      onRemove: () =>
        setFiltrosDash((f) => ({ ...f, tipos: f.tipos.filter((x) => x !== t) })),
    })),
    ...(filtrosDash.anoDe !== ANO_MIN || filtrosDash.anoAte !== ANO_MAX
      ? [
          {
            id: "periodo",
            label:
              filtrosDash.anoDe === filtrosDash.anoAte
                ? `Ano: ${filtrosDash.anoDe}`
                : `Período: ${filtrosDash.anoDe}–${filtrosDash.anoAte}`,
            onRemove: () =>
              setFiltrosDash((f) => ({ ...f, anoDe: ANO_MIN, anoAte: ANO_MAX })),
          },
        ]
      : []),
    ...(filtrosDash.nucleo !== "Todos"
      ? [
          {
            id: "nucleo",
            label: `Núcleo: ${filtrosDash.nucleo}`,
            onRemove: () => setFiltrosDash((f) => ({ ...f, nucleo: "Todos" })),
          },
        ]
      : []),
    ...(filtrosDash.prefixoPasta
      ? [
          {
            id: "pasta",
            label: `Classe PCD: ${filtrosDash.prefixoPasta}`,
            onRemove: () => setFiltrosDash((f) => ({ ...f, prefixoPasta: "" })),
          },
        ]
      : []),
    ...(filtrosDash.tipoAtividade !== "TODAS"
      ? [
          {
            id: "ativ",
            label: `Atividade: ${filtrosDash.tipoAtividade}`,
            onRemove: () => setFiltrosDash((f) => ({ ...f, tipoAtividade: "TODAS" })),
          },
        ]
      : []),
    ...(filtrosDash.faseArquivistica !== "TODAS"
      ? [
          {
            id: "fase",
            label: `Fase: ${filtrosDash.faseArquivistica}`,
            onRemove: () =>
              setFiltrosDash((f) => ({ ...f, faseArquivistica: "TODAS" })),
          },
        ]
      : []),
    ...(filtrosDash.destinacaoPrevista !== "TODAS"
      ? [
          {
            id: "dest",
            label: `Destinação: ${
              filtrosDash.destinacaoPrevista === "GUARDA_PERMANENTE"
                ? "Guarda Permanente"
                : "Eliminação TTD"
            }`,
            onRemove: () =>
              setFiltrosDash((f) => ({ ...f, destinacaoPrevista: "TODAS" })),
          },
        ]
      : []),
    ...(filtrosDash.nivelAcesso !== "TODOS"
      ? [
          {
            id: "acesso",
            label: `Acesso: ${rotuloNivelAcesso(filtrosDash.nivelAcesso)}`,
            onRemove: () => setFiltrosDash((f) => ({ ...f, nivelAcesso: "TODOS" })),
          },
        ]
      : []),
  ];

  const percentualUsoDisco = useMemo(() => {
    if (!sysStatus || !sysStatus.total_bytes) return 0;
    return Math.min(
      100,
      Math.max(1, Math.round((sysStatus.usado_bytes / sysStatus.total_bytes) * 100))
    );
  }, [sysStatus]);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Cabeçalho Normativo do Arquivista (e-ARQ Brasil v2) */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {ultimaAtualizacao && (
                <span className="text-xs text-muted-foreground">
                  Sincronizado às {ultimaAtualizacao}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Centro de Comando Arquivístico (SIGAD)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Painel executivo e técnico do Arquivista: gestão do ciclo vital, PCD/TTD, dossiês,
              fixidade SHA-256, restrições LAI/LGPD e preservação RDC-Arq.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {metricas.violadosReais > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                <ShieldAlert className="h-4 w-4" />
                {metricas.violadosReais} Alerta(s) de Fixidade
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Fixidade PREMIS: {metricas.taxaIntegridade}% Íntegra
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={recarregarTelemetriaSigad}
              disabled={carregandoTelemetria}
              className="gap-2 bg-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${carregandoTelemetria ? "animate-spin" : ""}`}
              />
              Atualizar Painel
            </Button>

            <Button
              size="sm"
              onClick={() => setModalFiltrosDash(true)}
              variant="outline"
              className="gap-2 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/60"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros Arquivísticos
              {chipsDash.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {chipsDash.length}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Chips de Filtros Ativos */}
        {chipsDash.length > 0 && (
          <div className="flex flex-col gap-3">
            <FilterChips chips={chipsDash} onLimpar={() => setFiltrosDash(INICIAL)} />
          </div>
        )}

        {/* Grade Principal de 6 KPIs Executivos para o Arquivista */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* KPI 1: Acervo Documental Capturado */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Acervo Documental Capturado
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">
                    {metricas.totalFiltrado}
                  </p>
                  {metricas.totalFiltrado !== metricas.totalAcervo && (
                    <span className="text-xs text-muted-foreground">
                      de {metricas.totalAcervo} no total
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Files className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
              <span className="rounded-md bg-purple-50 px-2 py-0.5 font-medium text-purple-700">
                Fim: <strong>{metricas.atividadeFim}</strong>
              </span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                Meio: <strong>{metricas.atividadeMeio}</strong>
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                Originais: <strong>{metricas.originais}</strong>
              </span>
            </div>
          </div>

          {/* KPI 2: Unidades de Arquivamento (Dossiês) & PCD */}
          <div
            onClick={() => onNavegarAba?.("gestao")}
            className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${
              onNavegarAba ? "cursor-pointer hover:border-purple-300 hover:shadow-md" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Dossiês, Processos & PCD
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-purple-700">
                    {metricas.totalDossies}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    unidade(s) · {metricas.classesAtivas} classes PCD
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                <FolderKanban className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                Abertos: <strong>{metricas.dossiesAbertos}</strong>
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                Juntados: <strong>{metricas.vinculadosDossie}</strong>
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                Avulsos: <strong>{metricas.avulsosSemDossie}</strong>
              </span>
            </div>
          </div>

          {/* KPI 3: Ciclo Vital & Temporalidade (TTD) */}
          <div
            onClick={() => onNavegarAba?.("gestao")}
            className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${
              onNavegarAba ? "cursor-pointer hover:border-amber-300 hover:shadow-md" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  3. Temporalidade & Destinação TTD
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-amber-600">
                    {metricas.destinacaoGuardaPermanente}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Guarda Permanente · {metricas.destinacaoEliminacao} Eliminação
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <CalendarClock className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                Corrente: <strong>{metricas.faseCorrente}</strong>
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                Intermed.: <strong>{metricas.faseIntermediaria}</strong>
              </span>
              <span className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700">
                Termos Elim.: <strong>{metricas.totalTermosEliminacao}</strong>
              </span>
            </div>
          </div>

          {/* KPI 4: Autenticidade, Fixidade SHA-256 & Auditoria */}
          <div
            onClick={() => onNavegarAba?.("auditoria")}
            className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${
              onNavegarAba ? "cursor-pointer hover:border-emerald-300 hover:shadow-md" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  4. Fixidade SHA-256 & Auditoria
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-emerald-600">
                    {metricas.taxaIntegridade}%
                  </p>
                  <span className="text-xs text-muted-foreground">
                    íntegros ({metricas.fixidadeVerificadaCount} verificados)
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <Fingerprint className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                Eventos e-ARQ: <strong>{metricas.totalEventosAuditoria}</strong>
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                Restritos LAI/LGPD: <strong>{metricas.totalRestritosOuSigilosos}</strong>
              </span>
            </div>
          </div>

          {/* KPI 5: Preservação Digital OAIS / Archivematica (RDC-Arq) */}
          <div
            onClick={() => onNavegarAba?.("archivematica")}
            className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${
              onNavegarAba ? "cursor-pointer hover:border-teal-300 hover:shadow-md" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  5. RDC-Arq OAIS (Archivematica)
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-teal-700">
                    {metricas.totalPacotesSip}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Pacote(s) SIP · {metricas.totalAipsArmazenados} AIP(s)
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600">
                <Archive className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
              <span className="rounded-md bg-teal-50 px-2 py-0.5 font-medium text-teal-800">
                Recolhidos: <strong>{metricas.totalRecolhidosRdcArq}</strong>
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                Aguardando SIP: <strong>{metricas.candidatosSipPendentes}</strong>
              </span>
            </div>
          </div>

          {/* KPI 6: Armazenamento e Infraestrutura do Repositório */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  6. Repositório Físico no Servidor
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">
                    {sysStatus
                      ? formatarTamanho(
                          sysStatus.acervo_bytes || metricas.tamanhoCalculadoFiltrado
                        )
                      : formatarTamanho(metricas.tamanhoCalculadoFiltrado)}
                  </p>
                  <span className="text-xs text-muted-foreground">no acervo GED</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <HardDrive className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>
                  Usado:{" "}
                  <strong>
                    {sysStatus ? formatarTamanho(sysStatus.usado_bytes) : "..."}
                  </strong>
                </span>
                <span>
                  Livre:{" "}
                  <strong className="text-emerald-700">
                    {sysStatus ? formatarTamanho(sysStatus.livre_bytes) : "..."}
                  </strong>{" "}
                  ({100 - percentualUsoDisco}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${percentualUsoDisco}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Barra de Alternância de Perspectiva Analítica do Arquivista */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-2 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setVisaoAtiva("360")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                visaoAtiva === "360"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              Visão Integrada(Comando do Arquivista)
            </button>
            <button
              onClick={() => setVisaoAtiva("gestao_ttd")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                visaoAtiva === "gestao_ttd"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Layers className="h-4 w-4 text-purple-400" />
              Ciclo Vital, PCD/TTD & Organicidade
            </button>
            <button
              onClick={() => setVisaoAtiva("preservacao_auditoria")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                visaoAtiva === "preservacao_auditoria"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Fingerprint className="h-4 w-4 text-emerald-400" />
              Preservação Digital, Formatos & Auditoria
            </button>
          </div>

          <span className="px-3 text-xs text-muted-foreground">
            Exibindo <strong>{documentosDash.length}</strong> documento(s) no escopo atual
          </span>
        </div>

        {/* SEÇÃO 1: Mesa de Decisão do Arquivista & Feed da Trilha Imutável */}
        {(visaoAtiva === "360" || visaoAtiva === "preservacao_auditoria") && (
          <PainelAlertasArquivista
            alertas={alertasArquivista}
            eventosRecentes={eventosRecentes}
            pacotesSip={pacotesSip}
            dossies={dossies}
            onNavegarAba={onNavegarAba}
          />
        )}

        {/* SEÇÃO 2: Gráficos de Ciclo Vital (3 Idades), Núcleos, Evolução Anual e Tipologias */}
        {(visaoAtiva === "360" || visaoAtiva === "gestao_ttd") && (
          <section className="grid gap-6 xl:grid-cols-2">
            <GraficoCicloVitalTtd
              faseCorrente={metricas.faseCorrente}
              faseIntermediaria={metricas.faseIntermediaria}
              aptosRecolhimento={metricas.aptosRecolhimentoTtd}
              aptosEliminacao={metricas.aptosEliminacaoTtd}
              guardaPermanente={metricas.destinacaoGuardaPermanente}
              eliminacaoPrevista={metricas.destinacaoEliminacao}
            />
            <PizzaNucleos docs={documentosDash} />
            <BarrasAno docs={documentosDash} />
            <BarrasTipologia docs={documentosDash} />
          </section>
        )}

        {/* SEÇÃO 3: Raio-X Diplomático, Formatos de Preservação e Governança LAI/LGPD */}
        {(visaoAtiva === "360" || visaoAtiva === "preservacao_auditoria") && (
          <section className="grid gap-6 xl:grid-cols-2">
            <GraficoGovernancaFormatos
              porFormato={metricas.porFormato}
              originais={metricas.originais}
              minutas={metricas.minutas}
              copias={metricas.copias}
              ostensivos={metricas.ostensivos}
              restritosLgpd={metricas.restritosLgpd}
              sigilososLai={metricas.sigilososLai}
            />
          </section>
        )}

        {/* SEÇÃO 4: Quadro de Últimas Capturas Protocoladas & Diagnóstico Rápido de Metadados */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Inspeção Rápida de Metadados Obrigatórios
              </span>
              <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                Últimos Documentos Protocolados no Escopo Atual
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Verificação imediata de Número de Protocolo, Classe PCD, Vínculo a Dossiê,
                Fixidade SHA-256 e Grau de Sigilo
              </p>
            </div>
            {onNavegarAba && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavegarAba("explorador")}
                  className="text-xs"
                >
                  Abrir Explorador
                </Button>
                <Button
                  size="sm"
                  onClick={() => onNavegarAba("upload")}
                  className="text-xs"
                >
                  Ir para Captura & Acervo
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="px-3 py-2.5">Protocolo / Data</th>
                  <th className="px-3 py-2.5">Título / Componente Digital</th>
                  <th className="px-3 py-2.5">Classe PCD & Dossiê</th>
                  <th className="px-3 py-2.5">Ciclo Vital & Tradição</th>
                  <th className="px-3 py-2.5">Acesso (LAI/LGPD)</th>
                  <th className="px-3 py-2.5">Fixidade SHA-256 / OAIS</th>
                  {onAbrirDoc && <th className="px-3 py-2.5 text-right">Inspeção</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documentosDash.slice(0, 8).map((doc) => {
                  const ehRestrito =
                    doc.nivelAcesso === "RESTRITO_LGPD" ||
                    doc.nivelAcesso === "SIGILOSO_LAI";
                  return (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700">
                          {doc.numeroProtocolo || `ID-${doc.id.slice(0, 6)}`}
                        </span>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {doc.upload} · Ano {doc.ano}
                        </p>
                      </td>
                      <td className="max-w-xs px-3 py-3">
                        <p className="truncate font-semibold text-slate-900">
                          {doc.nome}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {doc.categoria} · {doc.ext.toUpperCase()} · {doc.nucleo}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="font-mono text-[11px] font-semibold text-slate-800">
                          {doc.codigoClassificacao || "000.00.00.000"}
                        </span>
                        <p className="mt-0.5 text-[10px] text-purple-700">
                          {doc.codigoDossie
                            ? `Dossiê: ${doc.codigoDossie}`
                            : "Documento Avulso"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {doc.faseArquivistica || "CORRENTE"}
                        </span>
                        <span className="ml-1.5 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                          {rotuloStatusDocumento(doc.statusDocumento)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            ehRestrito
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {ehRestrito && <Lock className="h-3 w-3" />}
                          {rotuloNivelAcesso(doc.nivelAcesso)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${
                              doc.fixidadeVerificada === false
                                ? "text-red-500"
                                : "text-emerald-600"
                            }`}
                          />
                          <span className="font-mono text-[10px] text-slate-600">
                            {formatarHashCurto(doc.hashSha256, 8)}
                          </span>
                        </div>
                        {doc.pacoteSipId && (
                          <span className="mt-0.5 inline-block rounded bg-teal-50 px-1.5 py-0.2 text-[9px] font-bold text-teal-700">
                            SIP #{doc.pacoteSipId}
                          </span>
                        )}
                      </td>
                      {onAbrirDoc && (
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAbrirDoc(doc)}
                            className="h-7 gap-1 px-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Abrir
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal Completo de Filtros Arquivísticos do Dashboard */}
      <Dialog open={modalFiltrosDash} onOpenChange={setModalFiltrosDash}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtros Avançados do Arquivista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {/* Filtro de pastas / classes PCD */}
            <FiltroPastas
              onFiltroChange={(prefixo) =>
                setFiltrosDash((f) => ({ ...f, prefixoPasta: prefixo }))
              }
            />

            {/* Novos Filtros Normativos e-ARQ Brasil */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Natureza da Atividade (PCD)</Label>
                <Select
                  value={filtrosDash.tipoAtividade}
                  onValueChange={(v) =>
                    setFiltrosDash((f) => ({ ...f, tipoAtividade: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas (Fim e Meio)</SelectItem>
                    <SelectItem value="Atividade-Fim">
                      Atividade-Fim (Pesquisa & Memória FCJA)
                    </SelectItem>
                    <SelectItem value="Atividade-Meio">
                      Atividade-Meio (Gestão Administrativa)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Fase do Ciclo Vital (3 Idades)</Label>
                <Select
                  value={filtrosDash.faseArquivistica}
                  onValueChange={(v) =>
                    setFiltrosDash((f) => ({ ...f, faseArquivistica: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas as Fases</SelectItem>
                    <SelectItem value="CORRENTE">1ª Idade — Fase Corrente</SelectItem>
                    <SelectItem value="INTERMEDIARIA">
                      2ª Idade — Fase Intermediária
                    </SelectItem>
                    <SelectItem value="PERMANENTE">
                      3ª Idade — Fase Permanente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Destinação Prevista na TTD</Label>
                <Select
                  value={filtrosDash.destinacaoPrevista}
                  onValueChange={(v) =>
                    setFiltrosDash((f) => ({ ...f, destinacaoPrevista: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas as Destinações</SelectItem>
                    <SelectItem value="GUARDA_PERMANENTE">
                      Guarda Permanente (Recolhimento RDC-Arq)
                    </SelectItem>
                    <SelectItem value="ELIMINACAO">
                      Eliminação após cumprimento da TTD
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Nível de Acesso / Sigilo (LAI & LGPD)</Label>
                <Select
                  value={filtrosDash.nivelAcesso}
                  onValueChange={(v) =>
                    setFiltrosDash((f) => ({ ...f, nivelAcesso: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os Níveis de Acesso</SelectItem>
                    <SelectItem value="OSTENSIVO">
                      Ostensivo (Acesso Público Livre)
                    </SelectItem>
                    <SelectItem value="RESTRITO_LGPD">
                      Restrito — Informação Pessoal (LGPD)
                    </SelectItem>
                    <SelectItem value="SIGILOSO_LAI">
                      Sigiloso — Restrição Legal (LAI)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid min-w-0 space-y-2">
              <Label>Espécies / Tipologias Documentais</Label>
              <div className="max-h-36 space-y-2.5 overflow-y-auto rounded-md border border-border bg-slate-50/50 p-3">
                {TIPOLOGIAS_MEIO.map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-primary"
                  >
                    <Checkbox
                      checked={filtrosDash.tipos.includes(t)}
                      onCheckedChange={(checked) => {
                        setFiltrosDash((f) => ({
                          ...f,
                          tipos: checked
                            ? [...f.tipos, t]
                            : f.tipos.filter((x) => x !== t),
                        }));
                      }}
                    />
                    <span className="truncate">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid min-w-0 space-y-2">
              <Label>Núcleo de Pesquisa Produtor</Label>
              <Select
                value={filtrosDash.nucleo}
                onValueChange={(v) => setFiltrosDash((f) => ({ ...f, nucleo: v }))}
              >
                <SelectTrigger className="w-full max-w-full overflow-hidden text-left [&>span]:min-w-0 [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,30rem)]">
                  {NUCLEOS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano Inicial</Label>
                <Select
                  value={String(filtrosDash.anoDe)}
                  onValueChange={(v) =>
                    setFiltrosDash((f) => ({
                      ...f,
                      anoDe: Number(v),
                      anoAte: Math.max(Number(v), f.anoAte),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano Final</Label>
                <Select
                  value={String(filtrosDash.anoAte)}
                  onValueChange={(v) =>
                    setFiltrosDash((f) => ({
                      ...f,
                      anoAte: Number(v),
                      anoDe: Math.min(Number(v), f.anoDe),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFiltrosDash(INICIAL)}
            >
              Redefinir Filtros
            </Button>
            <Button onClick={() => setModalFiltrosDash(false)}>
              Aplicar Filtros no Painel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
