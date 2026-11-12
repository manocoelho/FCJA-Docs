import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Info,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AbaSistemaSigad, AlertaArquivistico } from "@/hooks/useDashboardSigad";
import type { EventoArquivistico } from "@/lib/sigad-api";
import type { PacoteSipItem } from "@/lib/archivematica-api";
import type { DossieItem } from "@/lib/pcd-dossie-api";
import { formatarHashCurto, formatarTamanho, rotuloCategoriaEvento } from "@/lib/formatters";

interface PainelAlertasArquivistaProps {
  alertas: AlertaArquivistico[];
  eventosRecentes: EventoArquivistico[];
  pacotesSip: PacoteSipItem[];
  dossies: DossieItem[];
  onNavegarAba?: ((aba: AbaSistemaSigad) => void) | undefined;
}

export function PainelAlertasArquivista({
  alertas,
  eventosRecentes,
  pacotesSip,
  dossies,
  onNavegarAba,
}: PainelAlertasArquivistaProps) {
  function estiloSeveridade(sev: AlertaArquivistico["severidade"]) {
    switch (sev) {
      case "critico":
        return {
          borda: "border-red-200 bg-red-50/70",
          badge: "bg-red-100 text-red-800",
          icone: <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />,
        };
      case "atencao":
        return {
          borda: "border-amber-200 bg-amber-50/70",
          badge: "bg-amber-100 text-amber-800",
          icone: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />,
        };
      case "sucesso":
        return {
          borda: "border-emerald-200 bg-emerald-50/60",
          badge: "bg-emerald-100 text-emerald-800",
          icone: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />,
        };
      default:
        return {
          borda: "border-blue-200 bg-blue-50/60",
          badge: "bg-blue-100 text-blue-800",
          icone: <Info className="h-5 w-5 shrink-0 text-blue-600" />,
        };
    }
  }

  function badgeCategoriaEvento(cat: string) {
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

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      {/* Coluna Esquerda (7 cols): Fila de Trabalho & Alertas Normativos do Arquivista */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm xl:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Diagnóstico de Conformidade CONARQ
            </span>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">
              Mesa de Decisão do Arquivista (Ações Recomendadas)
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monitoramento ativo de fixidade PREMIS, temporalidade TTD, juntada em dossiês e
              admissão OAIS
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {alertas.length} diretriz(es) ativa(s)
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {alertas.map((alerta) => {
            const est = estiloSeveridade(alerta.severidade);
            return (
              <div
                key={alerta.id}
                className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center ${est.borda}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{est.icone}</div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${est.badge}`}
                      >
                        {alerta.normaReferencia}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">{alerta.titulo}</h4>
                    <p className="text-xs leading-relaxed text-slate-600">{alerta.descricao}</p>
                  </div>
                </div>
                {onNavegarAba && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavegarAba(alerta.abaDestino)}
                    className="shrink-0 gap-1.5 bg-white text-xs font-semibold shadow-2xs hover:bg-slate-50"
                  >
                    {alerta.acaoRotulo}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Mini Resumo de Dossiês e Pacotes SIP Recentes */}
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700">
                <FolderKanban className="h-4 w-4" /> Unidades de Arquivamento
              </span>
              {onNavegarAba && (
                <button
                  onClick={() => onNavegarAba("gestao")}
                  className="text-xs font-semibold text-purple-700 hover:underline"
                >
                  Abrir PCD & Dossiês →
                </button>
              )}
            </div>
            {dossies.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Nenhum dossiê ou processo aberto até o momento.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dossies.slice(0, 3).map((ds) => (
                  <li
                    key={ds.id}
                    className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-800">
                        [{ds.codigoDossie}] {ds.titulo}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        Classe {ds.codigoClassificacao} · {ds.totalDocumentos} doc(s)
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        ds.statusDossie === "ABERTO"
                          ? "bg-emerald-100 text-emerald-800"
                          : ds.statusDossie === "RECOLHIDO_ARCHIVEMATICA"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {ds.statusDossie}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Archive className="h-4 w-4" /> Pacotes SIP (RDC-Arq OAIS)
              </span>
              {onNavegarAba && (
                <button
                  onClick={() => onNavegarAba("archivematica")}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Conector OAIS →
                </button>
              )}
            </div>
            {pacotesSip.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Nenhum pacote SIP BagIt gerado ainda. Utilize o Conector Archivematica para recolher
                documentos permanentes.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pacotesSip.slice(0, 3).map((sip) => (
                  <li
                    key={sip.id}
                    className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-800">
                        [{sip.codigoSip}] {sip.titulo}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {sip.quantidadeDocumentos} doc(s) · {formatarTamanho(sip.tamanhoTotalBytes)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <PackageCheck className="h-3 w-3" />
                      {sip.statusSip === "ARMAZENADO_AIP" ? "AIP OK" : "SIP"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Coluna Direita (5 cols): Feed Imutável da Trilha de Auditoria e-ARQ Brasil */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm xl:col-span-5">
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Trilha de Auditoria Imutável (PREMIS & CONARQ)
              </span>
              <h3 className="mt-0.5 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Activity className="h-4 w-4 text-emerald-600" />
                Últimos Eventos Arquivísticos
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Registro cronológico de Ciclo de Vida, Preservação, Procedimentos e PCD
              </p>
            </div>
            {onNavegarAba && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavegarAba("auditoria")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Ver Trilha Completa →
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {eventosRecentes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                Nenhum evento de auditoria retornado pela API no momento.
              </div>
            ) : (
              eventosRecentes.slice(0, 6).map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${badgeCategoriaEvento(
                        ev.categoriaEvento
                      )}`}
                    >
                      {rotuloCategoriaEvento(ev.categoriaEvento)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {ev.dataEvento} às {ev.horaEvento}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-slate-800">
                    {ev.tipoEvento}{" "}
                    {ev.numeroProtocolo && (
                      <span className="font-mono text-[11px] font-normal text-blue-600">
                        [{ev.numeroProtocolo}]
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{ev.detalhes}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Agente: {ev.usuarioResponsavel}</span>
                    {ev.hashEvidencia && (
                      <span className="font-mono">
                        SHA-256: {formatarHashCurto(ev.hashEvidencia, 8)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {onNavegarAba && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              className="w-full gap-2 text-xs"
              onClick={() => onNavegarAba("auditoria")}
            >
              Acessar Central de Auditoria, Fixidade SHA-256 e Termos de Eliminação
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
