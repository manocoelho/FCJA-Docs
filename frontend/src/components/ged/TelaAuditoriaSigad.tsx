import {
  Activity,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
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

interface TelaAuditoriaSigadProps {
  usuarioLogado: string | null;
  usuarioPapel: string | null;
  onFixidadeAtualizada?: () => void;
}

export function TelaAuditoriaSigad({
  usuarioLogado,
  usuarioPapel,
  onFixidadeAtualizada,
}: TelaAuditoriaSigadProps) {
  const {
    eventos,
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
              e-ARQ Brasil v2 & PREMIS
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Trilha de Auditoria & Fixidade Criptográfica
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro imutável dos 4 grupos de eventos normativos do CONARQ e verificação de
            integridade SHA-256 dos componentes digitais.
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

      {/* Indicadores de Conformidade e-ARQ Brasil v2 */}
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
                Eventos Procedimentais
              </p>
              <p className="mt-2 text-3xl font-semibold text-purple-600">
                {resumo ? resumo.eventosPorCategoria.PROCEDIMENTAL || 0 : "..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                EarqEventoProc (Acessos, Retificações)
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-500/25" />
          </div>
        </div>
      </section>

      {/* Filtros e Tabela da Trilha de Auditoria */}
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
                  <SelectValue placeholder="Categoria e-ARQ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as Categorias e-ARQ</SelectItem>
                  <SelectItem value="CICLO_VIDA">Ciclo de Vida (EarqEventoCv)</SelectItem>
                  <SelectItem value="PRESERVACAO">
                    Preservação / PREMIS (EarqEventoPreservacao)
                  </SelectItem>
                  <SelectItem value="PROCEDIMENTAL">Procedimental (EarqEventoProc)</SelectItem>
                  <SelectItem value="CLASSE">Plano de Classificação (EarqEventoClasse)</SelectItem>
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
                <TableHead className="w-56">Categoria (e-ARQ v2)</TableHead>
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
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
