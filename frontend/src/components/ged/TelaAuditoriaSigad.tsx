import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  Fingerprint,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuditoriaEarq } from "@/hooks/useAuditoriaEarq";
import { formatarHashCurto, rotuloCategoriaEvento } from "@/lib/formatters";
import { imprimirTermoEliminacao } from "@/lib/termo-eliminacao-export";

interface TelaAuditoriaSigadProps {
  usuarioLogado: string | null;
  usuarioPapel: string | null;
  onFixidadeAtualizada?: (() => void) | undefined;
}

export function TelaAuditoriaSigad({
  usuarioLogado,
  usuarioPapel,
  onFixidadeAtualizada,
}: TelaAuditoriaSigadProps) {
  const {
    eventos,
    termosEliminacao,
    resumo,
    categoriaFiltro,
    setCategoriaFiltro,
    buscaFiltro,
    setBuscaFiltro,
    carregando,
    verificandoLote,
    recarregarAuditoria,
    executarAuditoriaFixidadeLote,
  } = useAuditoriaEarq(usuarioLogado, usuarioPapel, onFixidadeAtualizada);

  const [subAba, setSubAba] = useState<"eventos" | "termos">("eventos");

  function badgeCategoria(cat: string) {
    switch (cat) {
      case "CICLO_VIDA":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
      case "PRESERVACAO":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "PROCEDIMENTAL":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
      case "CLASSE":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function badgeResultado(res: string) {
    if (res === "FALHA") return "bg-red-100 text-red-700";
    if (res === "ALERTA") return "bg-amber-100 text-amber-800";
    return "bg-emerald-100 text-emerald-700";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-600/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-600">
              Trilha de Auditoria & Governança RBAC
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Trilha de Auditoria, Fixidade & Termos de Eliminação
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro imutável dos 4 grupos de eventos normativos do CONARQ, verificação SHA-256 e
            Termos de Eliminação emitidos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={recarregarAuditoria}
            disabled={carregando}
            className="gap-2 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar Trilha
          </Button>
          <Button
            onClick={executarAuditoriaFixidadeLote}
            disabled={verificandoLote}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Fingerprint className={`h-4 w-4 ${verificandoLote ? "animate-pulse" : ""}`} />
            {verificandoLote
              ? "Verificando SHA-256 do Acervo..."
              : "Auditar Fixidade SHA-256 em Lote (PREMIS)"}
          </Button>
        </div>
      </header>

      {/* Indicadores de Auditoria e Integridade */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Integridade PREMIS (SHA-256)
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                {resumo ? `${resumo.taxaIntegridadePercentual}%` : "..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {resumo
                  ? `${resumo.documentosIntegros}/${resumo.totalDocumentos} íntegros (${resumo.documentosViolados} alertas)`
                  : "Calculando..."}
              </p>
            </div>
            {resumo && resumo.documentosViolados > 0 ? (
              <ShieldAlert className="h-8 w-8 text-red-500" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-emerald-500/30" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Eventos de Ciclo de Vida
              </p>
              <p className="mt-2 text-3xl font-semibold text-blue-600">
                {resumo ? resumo.eventosPorCategoria.CICLO_VIDA || 0 : "..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                EarqEventoCv (Capturas, Destinações)
              </p>
            </div>
            <FileCheck2 className="h-8 w-8 text-blue-500/25" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Eventos de Preservação
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                {resumo ? resumo.eventosPorCategoria.PRESERVACAO || 0 : "..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                EarqEventoPreservacao (Hashes, Fixidade)
              </p>
            </div>
            <Fingerprint className="h-8 w-8 text-emerald-500/25" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Termos de Eliminação
              </p>
              <p className="mt-2 text-3xl font-semibold text-amber-600">
                {termosEliminacao.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Emitidos com justificativa técnica
              </p>
            </div>
            <FileWarning className="h-8 w-8 text-amber-500/25" />
          </div>
        </div>
      </section>

      {/* Seletor de Sub-Abas: Livro de Eventos vs Termos de Eliminação */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={subAba === "eventos" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubAba("eventos")}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          Livro de Eventos Arquivísticos ({eventos.length})
        </Button>
        <Button
          variant={subAba === "termos" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubAba("termos")}
          className="gap-2"
        >
          <FileWarning className="h-4 w-4" />
          Termos de Eliminação Emitidos ({termosEliminacao.length})
        </Button>
      </div>

      {subAba === "eventos" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">
                Livro de Registros de Eventos Arquivísticos (Append-Only)
              </h3>
              <p className="text-xs text-muted-foreground">
                {eventos.length} evento(s) exibido(s) em ordem cronológica reversa
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-64">
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Categoria do Evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas as Categorias</SelectItem>
                    <SelectItem value="CICLO_VIDA">Ciclo de Vida (EarqEventoCv)</SelectItem>
                    <SelectItem value="PRESERVACAO">
                      Preservação / PREMIS (EarqEventoPreservacao)
                    </SelectItem>
                    <SelectItem value="PROCEDIMENTAL">Procedimental (EarqEventoProc)</SelectItem>
                    <SelectItem value="CLASSE">
                      Plano de Classificação (EarqEventoClasse)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaFiltro}
                  onChange={(e) => setBuscaFiltro(e.target.value)}
                  placeholder="Buscar protocolo, SHA-256, agente..."
                  className="pl-9 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Data / Hora</TableHead>
                  <TableHead className="w-56">Categoria do Evento</TableHead>
                  <TableHead className="w-48">Tipo de Evento</TableHead>
                  <TableHead className="w-44">Protocolo SIGAD</TableHead>
                  <TableHead>Descrição / Evidência de Auditoria</TableHead>
                  <TableHead className="w-40">Fixidade (SHA-256)</TableHead>
                  <TableHead className="w-36">Agente</TableHead>
                  <TableHead className="w-28 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Nenhum evento arquivístico encontrado para o filtro selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  eventos.map((ev) => (
                    <TableRow key={ev.id} className="hover:bg-slate-50/80">
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-600">
                        {ev.dataEvento} <span className="text-slate-400">{ev.horaEvento}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${badgeCategoria(
                            ev.categoriaEvento
                          )}`}
                        >
                          {rotuloCategoriaEvento(ev.categoriaEvento)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">
                        {ev.tipoEvento}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-700 font-medium">
                        {ev.numeroProtocolo || "-"}
                      </TableCell>
                      <TableCell className="max-w-md text-xs text-slate-700 leading-relaxed">
                        {ev.detalhes}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs text-slate-500"
                        title={ev.hashEvidencia || ""}
                      >
                        {ev.hashEvidencia ? formatarHashCurto(ev.hashEvidencia, 10) : "-"}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {ev.usuarioResponsavel}
                        {ev.papelUsuario && (
                          <span className="block text-[10px] uppercase text-slate-400">
                            {ev.papelUsuario}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeResultado(
                            ev.resultado
                          )}`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {ev.resultado}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-base font-semibold">
              Termos de Eliminação de Documentos
            </h3>
            <p className="text-xs text-muted-foreground">
              Registro perpétuo de documentos eliminados com preservação do protocolo original,
              fixidade SHA-256 e justificativa técnica.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº do Termo</TableHead>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Protocolo Original</TableHead>
                  <TableHead>Documento Eliminado</TableHead>
                  <TableHead>Motivo Normativo & Justificativa</TableHead>
                  <TableHead>SHA-256 Original</TableHead>
                  <TableHead>Autorizado Por</TableHead>
                  <TableHead className="text-right">Imprimir Termo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termosEliminacao.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Nenhum Termo de Eliminação foi emitido até o momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  termosEliminacao.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-bold text-amber-800">
                        {t.numeroTermo}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-slate-600">
                        {t.dataEliminacao}{" "}
                        <span className="text-slate-400">{t.horaEliminacao}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-700 font-medium">
                        {t.numeroProtocolo || "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate font-medium text-xs text-slate-900">
                          {t.nomeDocumento}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {t.categoria} · {t.anoDocumento} · [{t.statusDocumentoOriginal}]
                        </p>
                      </TableCell>
                      <TableCell className="max-w-sm text-xs">
                        <span className="font-semibold text-slate-800 block">
                          {t.descricaoMotivo}
                        </span>
                        <span className="text-slate-600">{t.justificativa}</span>
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs text-slate-500"
                        title={t.hashSha256Original}
                      >
                        {formatarHashCurto(t.hashSha256Original, 10)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {t.autorizadoPor}
                        <span className="block text-[10px] uppercase text-slate-400">
                          {t.papelAutorizador}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!imprimirTermoEliminacao(t)) {
                              toast.error("Permita pop-ups para imprimir o Termo de Eliminação.");
                            }
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" /> Imprimir PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
