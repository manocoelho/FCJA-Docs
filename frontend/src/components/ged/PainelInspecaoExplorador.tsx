import { useState } from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  FolderKanban,
  HardDrive,
  Info,
  Layers,
  Lock,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/components/ged/data";
import type { ClassePcdItem, DossieItem } from "@/lib/pcd-dossie-api";
import type { AbaSistemaSigad } from "@/hooks/useDashboardSigad";
import {
  formatarHashCurto,
  formatarTamanho,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";
import { exportarCsv, exportarPdf } from "@/components/ged/export";

interface ResumoEscopoExplorador {
  quantidadeDocs: number;
  tamanhoTotalBytes: number;
  guardaPermanenteCount: number;
  fixidadeOkCount: number;
  restritosCount: number;
  totalPastas: number;
  recolhidosOais: number;
  taxaFixidade: number;
  porExtensao: Record<string, number>;
}

interface PainelInspecaoExploradorProps {
  docSelecionado: Doc | null;
  onLimparSelecao: () => void;
  classePcdAtual: ClassePcdItem | null;
  dossieAtual: DossieItem | null;
  resumoEscopo: ResumoEscopoExplorador;
  rotuloEscopoAtual: string;
  documentosEscopo: Doc[];
  onAbrirDoc: (doc: Doc) => void;
  onBaixarDoc?: ((doc: Doc) => void) | undefined;
  onAbrirFichaCompleta: (doc: Doc) => void;
  onVerificarFixidade?: ((doc: Doc) => Promise<unknown>) | undefined;
  onIrParaDossie: (codigoDossie: string) => void;
  onIrParaClassePcd: (codigoClasse: string) => void;
  onNavegarAba?: ((aba: AbaSistemaSigad) => void) | undefined;
}

export function PainelInspecaoExplorador({
  docSelecionado,
  onLimparSelecao,
  classePcdAtual,
  dossieAtual,
  resumoEscopo,
  rotuloEscopoAtual,
  documentosEscopo,
  onAbrirDoc,
  onBaixarDoc,
  onAbrirFichaCompleta,
  onVerificarFixidade,
  onIrParaDossie,
  onIrParaClassePcd,
  onNavegarAba,
}: PainelInspecaoExploradorProps) {
  const [verificandoHash, setVerificandoHash] = useState(false);

  function copiarValor(valor: string, rotulo: string) {
    if (!valor) return;
    navigator.clipboard.writeText(valor);
    toast.success(`${rotulo} copiado para a área de transferência`);
  }

  async function acionarAuditoriaFixidade(doc: Doc) {
    if (!onVerificarFixidade) return;
    setVerificandoHash(true);
    try {
      await onVerificarFixidade(doc);
    } finally {
      setVerificandoHash(false);
    }
  }

  // MODO 1: DOCUMENTO SELECIONADO (Inspeção Diplomática e Técnica)
  if (docSelecionado) {
    const ehRestrito =
      docSelecionado.nivelAcesso === "RESTRITO_LGPD" ||
      docSelecionado.nivelAcesso === "SIGILOSO_LAI";
    const integro = docSelecionado.fixidadeVerificada !== false;
    const ehFim =
      docSelecionado.tipoAtividade === "Atividade-Fim" ||
      (docSelecionado.codigoClassificacao || "").startsWith("FIM.");
    const guardaPerm =
      docSelecionado.destinacaoPrevista === "GUARDA_PERMANENTE" ||
      (!docSelecionado.destinacaoPrevista && ehFim);

    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-slate-50/60 xl:w-96">
        {/* Cabeçalho do Inspetor */}
        <div className="flex items-start justify-between gap-2 border-b border-border bg-white px-4 py-3.5">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Inspeção Diplomática & Técnica
            </span>
            <h3
              className="mt-0.5 truncate text-sm font-semibold text-slate-900"
              title={docSelecionado.nome}
            >
              {docSelecionado.nome}
            </h3>
          </div>
          <button
            type="button"
            onClick={onLimparSelecao}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Fechar seleção do documento"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          {/* Identificador de Protocolo e Badges de Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Protocolo SIGAD
              </span>
              {docSelecionado.numeroProtocolo && (
                <button
                  type="button"
                  onClick={() =>
                    copiarValor(docSelecionado.numeroProtocolo!, "Protocolo SIGAD")
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                >
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              )}
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-blue-700 select-all">
              {docSelecionado.numeroProtocolo || `ID-${docSelecionado.id}`}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {rotuloStatusDocumento(docSelecionado.statusDocumento)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  ehRestrito
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {ehRestrito && <Lock className="h-2.5 w-2.5" />}
                {rotuloNivelAcesso(docSelecionado.nivelAcesso)}
              </span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-blue-700">
                {docSelecionado.ext}
              </span>
            </div>

            {/* Ações Diretas para o Pesquisador / Arquivista */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <Button
                size="sm"
                onClick={() => onAbrirDoc(docSelecionado)}
                className="h-8 gap-1.5 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                Visualizar
              </Button>
              {onBaixarDoc && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBaixarDoc(docSelecionado)}
                  className="h-8 gap-1.5 bg-white text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAbrirFichaCompleta(docSelecionado)}
                className="col-span-2 h-8 gap-1.5 border-blue-200 bg-blue-50/50 text-xs font-semibold text-blue-700 hover:bg-blue-100/60"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Ficha Arquivística Completa
              </Button>
            </div>
          </div>

          {/* 1. Classificação PCD e Proveniência */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                Classificação & Proveniência
              </h4>
              {docSelecionado.codigoClassificacao && (
                <button
                  type="button"
                  onClick={() =>
                    onIrParaClassePcd(docSelecionado.codigoClassificacao!)
                  }
                  className="text-[11px] font-semibold text-purple-700 hover:underline"
                >
                  Abrir Classe →
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Código e Classe do PCD
                </p>
                <p className="font-mono text-xs font-bold text-slate-900">
                  {docSelecionado.codigoClassificacao || "000.00.00.000"}
                </p>
                <p className="text-[11px] text-slate-600">
                  {docSelecionado.descricaoCodigo ||
                    classePcdAtual?.titulo ||
                    docSelecionado.categoria}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Natureza</p>
                  <p className="font-semibold text-slate-800">
                    {ehFim ? "Atividade-Fim" : "Atividade-Meio"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Espécie / Ano
                  </p>
                  <p className="font-semibold text-slate-800">
                    {docSelecionado.categoria} ({docSelecionado.ano})
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground">
                  Núcleo Produtor (Fundo / Seção)
                </p>
                <p className="font-medium text-slate-800 leading-snug">
                  {docSelecionado.nucleo}
                </p>
                {docSelecionado.sigla && (
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    {docSelecionado.sigla}
                  </p>
                )}
              </div>

              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground">
                  Autor / Produtor
                </p>
                <p className="font-medium text-slate-800">
                  {docSelecionado.autor || "Fundação Casa de José Américo (FCJA)"}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Vínculo Orgânico (Unidade de Arquivamento / Dossiê) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
              Unidade de Arquivamento (Dossiê)
            </h4>

            {docSelecionado.codigoDossie ? (
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5">
                <p className="font-mono text-xs font-bold text-purple-800">
                  {docSelecionado.codigoDossie}
                </p>
                {dossieAtual && (
                  <p className="mt-0.5 text-[11px] font-medium text-slate-700">
                    {dossieAtual.titulo}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onIrParaDossie(docSelecionado.codigoDossie!)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:underline"
                >
                  Inspecionar todas as peças deste Dossiê →
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
                <p className="font-semibold text-amber-900">
                  Documento Avulso (Sem Juntada)
                </p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Este item ainda não foi juntado a um Dossiê ou Processo orgânico.
                </p>
                {onNavegarAba && (
                  <button
                    type="button"
                    onClick={() => onNavegarAba("gestao")}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 underline"
                  >
                    Vincular em PCD, TTD & Dossiês →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. Ciclo Vital & Temporalidade (TTD) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
              Ciclo Vital & Destinação (TTD)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[10px] text-muted-foreground">Fase Atual</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {docSelecionado.faseArquivistica || "CORRENTE"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[10px] text-muted-foreground">Prazos TTD</p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {docSelecionado.prazoCorrenteAnos ??
                    classePcdAtual?.prazoCorrenteAnos ??
                    2}
                  a Corr. /{" "}
                  {docSelecionado.prazoIntermediariaAnos ??
                    classePcdAtual?.prazoIntermediariaAnos ??
                    0}
                  a Int.
                </p>
              </div>
            </div>
            <div
              className={`rounded-lg px-2.5 py-2 font-semibold ${
                guardaPerm
                  ? "bg-purple-50 text-purple-800"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              Destinação Final:{" "}
              {guardaPerm
                ? "Guarda Permanente (RDC-Arq / Archivematica)"
                : "Guarda Temporária (Eliminação após prazo TTD)"}
            </div>
          </div>

          {/* 4. Fixidade Criptográfica SHA-256 (PREMIS) & RDC-Arq */}
          <div
            className={`rounded-xl border p-3.5 space-y-2.5 shadow-2xs ${
              integro
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-red-200 bg-red-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                Fixidade SHA-256 (PREMIS)
              </h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  integro
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {integro ? (
                  <>
                    <ShieldCheck className="h-3 w-3" /> Íntegro
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3 w-3" /> Violado
                  </>
                )}
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500">
                  Digest SHA-256
                </span>
                {docSelecionado.hashSha256 && (
                  <button
                    type="button"
                    onClick={() =>
                      copiarValor(docSelecionado.hashSha256!, "Hash SHA-256")
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline"
                  >
                    <Copy className="h-2.5 w-2.5" /> Copiar
                  </button>
                )}
              </div>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-700 select-all">
                {docSelecionado.hashSha256 || "Pendente de verificação"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">Tamanho:</span>{" "}
                <strong className="text-slate-800">
                  {docSelecionado.tamanho
                    ? formatarTamanho(docSelecionado.tamanho)
                    : "N/D"}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Captura:</span>{" "}
                <strong className="text-slate-800">{docSelecionado.upload}</strong>
              </div>
            </div>

            {(docSelecionado.pacoteSipId || docSelecionado.aipUuidArchivematica) && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-2 text-[11px] text-teal-900">
                <p className="font-bold">
                  Pacote OAIS: {docSelecionado.pacoteSipId || "SIP Empacotado"}
                </p>
                {docSelecionado.aipUuidArchivematica && (
                  <p className="mt-0.5 truncate font-mono text-[10px]">
                    AIP: {docSelecionado.aipUuidArchivematica}
                  </p>
                )}
              </div>
            )}

            {onVerificarFixidade && (
              <Button
                size="sm"
                variant="outline"
                disabled={verificandoHash}
                onClick={() => acionarAuditoriaFixidade(docSelecionado)}
                className="h-7 w-full gap-1.5 bg-white text-[11px]"
              >
                <RefreshCw
                  className={`h-3 w-3 ${verificandoHash ? "animate-spin" : ""}`}
                />
                {verificandoHash
                  ? "Validando bitstream..."
                  : "Revalidar Fixidade SHA-256 Agora"}
              </Button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // MODO 2: NENHUM DOCUMENTO SELECIONADO -> Exibe Diagnóstico da Pasta / Dossiê / Classe Atual
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-slate-50/60 xl:w-96">
      <div className="border-b border-border bg-white px-4 py-3.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Diagnóstico do Nível Atual
        </span>
        <h3
          className="mt-0.5 truncate text-sm font-semibold text-slate-900"
          title={rotuloEscopoAtual}
        >
          {rotuloEscopoAtual}
        </h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
        {/* Card Especial se estiver dentro de um Dossiê / Processo */}
        {dossieAtual && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-800">
                {dossieAtual.codigoDossie}
              </span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {dossieAtual.statusDossie}
              </span>
            </div>
            <h4 className="font-semibold text-slate-900">{dossieAtual.titulo}</h4>
            <p className="text-[11px] text-slate-600">{dossieAtual.descricao}</p>
            <div className="grid grid-cols-2 gap-2 border-t border-purple-200/60 pt-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">Classe PCD:</span>{" "}
                <strong className="font-mono text-slate-800">
                  {dossieAtual.codigoClassificacao}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Volume:</span>{" "}
                <strong className="text-slate-800">
                  Vol. {dossieAtual.volumeAtual || 1}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Abertura:</span>{" "}
                <strong className="text-slate-800">
                  {dossieAtual.dataAbertura || "—"}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Peças:</span>{" "}
                <strong className="text-slate-800">
                  {resumoEscopo.quantidadeDocs} doc(s)
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Card Especial se estiver dentro de uma Classe PCD */}
        {classePcdAtual && !dossieAtual && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                {classePcdAtual.codigo}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {classePcdAtual.tipoAtividade}
              </span>
            </div>
            <h4 className="font-semibold text-slate-900">{classePcdAtual.titulo}</h4>
            <p className="text-[11px] text-slate-600">{classePcdAtual.funcao}</p>
            <div className="grid grid-cols-2 gap-2 border-t border-blue-200/60 pt-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">Fase Corrente:</span>{" "}
                <strong className="text-slate-800">
                  {classePcdAtual.prazoCorrenteAnos} ano(s)
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Intermediária:</span>{" "}
                <strong className="text-slate-800">
                  {classePcdAtual.prazoIntermediariaAnos} ano(s)
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Destinação TTD:</span>{" "}
                <strong className="text-purple-800">
                  {classePcdAtual.destinacaoFinal === "GUARDA_PERMANENTE"
                    ? "Guarda Permanente (RDC-Arq)"
                    : "Eliminação após Prazo"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Métricas do Escopo Atual */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <HardDrive className="h-3.5 w-3.5 text-blue-600" />
            Resumo do Escopo Atual
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <p className="text-[10px] text-muted-foreground">Itens Documentais</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {resumoEscopo.quantidadeDocs}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <p className="text-[10px] text-muted-foreground">Volume Físico</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {formatarTamanho(resumoEscopo.tamanhoTotalBytes)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-purple-50/50 p-2.5">
              <p className="text-[10px] text-purple-700">Guarda Permanente</p>
              <p className="mt-0.5 text-base font-bold text-purple-900">
                {resumoEscopo.guardaPermanenteCount} doc(s)
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-emerald-50/50 p-2.5">
              <p className="text-[10px] text-emerald-700">Fixidade SHA-256</p>
              <p className="mt-0.5 text-base font-bold text-emerald-900">
                {resumoEscopo.taxaFixidade}% íntegra
              </p>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Subpastas / Agrupamentos:</span>
              <strong className="text-slate-900">{resumoEscopo.totalPastas}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Recolhidos (SIP / AIP OAIS):</span>
              <strong className="text-teal-700">{resumoEscopo.recolhidosOais}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Restritos (LGPD / LAI):</span>
              <strong className="text-amber-700">{resumoEscopo.restritosCount}</strong>
            </div>
          </div>

          {/* Distribuição de Formatos na Pasta */}
          <div className="border-t border-slate-100 pt-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Formatos neste Escopo
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
              <div className="rounded bg-red-50 px-1.5 py-1 font-semibold text-red-700">
                PDF: {resumoEscopo.porExtensao["pdf"] ?? 0}
              </div>
              <div className="rounded bg-orange-50 px-1.5 py-1 font-semibold text-orange-700">
                TIFF: {resumoEscopo.porExtensao["tiff"] ?? 0}
              </div>
              <div className="rounded bg-emerald-50 px-1.5 py-1 font-semibold text-emerald-700">
                XLSX: {resumoEscopo.porExtensao["xlsx"] ?? 0}
              </div>
              <div className="rounded bg-blue-50 px-1.5 py-1 font-semibold text-blue-700">
                DOCX: {resumoEscopo.porExtensao["docx"] ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Exportação de Inventário da Pasta / Dossiê Atual */}
        {documentosEscopo.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Exportar Inventário deste Escopo
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Gere uma relação descritiva com Protocolos, Classes PCD e Hashes SHA-256
              dos {documentosEscopo.length} documento(s) deste nível.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportarCsv(documentosEscopo, "inventario-explorador-sigad.csv");
                  toast.success("Inventário CSV exportado com sucesso!");
                }}
                className="h-8 gap-1.5 bg-white text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Planilha CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportarPdf(
                    documentosEscopo,
                    `Inventário Arquivístico — ${rotuloEscopoAtual}`
                  );
                }}
                className="h-8 gap-1.5 bg-white text-xs"
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                Relatório PDF
              </Button>
            </div>
          </div>
        )}

        {/* Dica de Usabilidade para Pesquisadores e Arquivistas */}
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 text-[11px] text-slate-700 space-y-1.5">
          <p className="flex items-center gap-1.5 font-semibold text-blue-900">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            Navegação Rápida
          </p>
          <p>
            • <strong>1 clique em uma pasta, classe ou dossiê</strong> abre seu conteúdo
            imediatamente.
          </p>
          <p>
            • <strong>1 clique em um documento</strong> exibe sua ficha diplomática e
            fixidade SHA-256 neste painel lateral.
          </p>
          <p>
            • <strong>Duplo clique no documento</strong> (ou botão{" "}
            <em>Visualizar</em>) abre o leitor de PDF/Planilha em tela cheia.
          </p>
        </div>
      </div>
    </aside>
  );
}
