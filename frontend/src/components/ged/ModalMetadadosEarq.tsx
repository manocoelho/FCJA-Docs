import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Fingerprint,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Doc } from "@/components/ged/data";
import {
  formatarTamanho,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";

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

  if (!doc) return null;

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
            Ficha Descritiva e de Preservação Digital conforme o padrão{" "}
            <strong>e-ARQ Brasil v2 (CONARQ)</strong> e <strong>PREMIS</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2 text-sm">
          {/* 1. Identificação e Contexto Arquivístico */}
          <section className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Identificação, Proveniência e Classificação (e-ARQ Seção 1)
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
                <div className="sm:col-span-3">
                  <p className="text-xs text-muted-foreground">Hipótese Legal de Restrição</p>
                  <p className="mt-0.5 font-medium text-amber-800">{doc.hipoteseLegal}</p>
                </div>
              )}
            </div>
          </section>

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
                3. Componente Digital & Fixidade Criptográfica (PREMIS / e-ARQ Seção 3)
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
            <CheckCircle2 className="h-4 w-4" /> Fechar Ficha e-ARQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
