import { useState, useMemo } from "react";
import { CheckCircle2, Files, HardDrive, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterChips, type Chip } from "@/components/ged/FilterChips";
import { BarrasAno, PizzaNucleos } from "@/components/ged/Charts";
import { TIPOS, TIPO_POR_CATEGORIA, NUCLEOS, ANOS, type Doc } from "@/components/ged/data";

// Função utilitária para tamanho (trazemos para cá para isolar o componente)
function formatarTamanho(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const tamanhos = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + tamanhos[i];
}

type Filtros = { tipos: string[]; anoDe: number; anoAte: number; nucleo: string };
const ANO_MIN = 2022;
const ANO_MAX = 2027;
const INICIAL: Filtros = { tipos: [], anoDe: ANO_MIN, anoAte: ANO_MAX, nucleo: "Todos" };

interface TelaDashboardProps {
  acervo: Doc[];
  sysStatus: { total_bytes: number; usado_bytes: number; livre_bytes: number; acervo_bytes: number } | null;
}

export function TelaDashboard({ acervo, sysStatus }: TelaDashboardProps) {
  const [filtrosDash, setFiltrosDash] = useState<Filtros>(INICIAL);
  const [modalFiltrosDash, setModalFiltrosDash] = useState(false);

  const documentosDash = useMemo(() => acervo.filter((d) => {
    const tipoOk = filtrosDash.tipos.length === 0 || filtrosDash.tipos.includes(TIPO_POR_CATEGORIA[d.categoria] ?? "");
    const anoOk = d.ano >= filtrosDash.anoDe && d.ano <= filtrosDash.anoAte;
    const nucleoOk = filtrosDash.nucleo === "Todos" || d.nucleo === filtrosDash.nucleo;
    return tipoOk && anoOk && nucleoOk;
  }), [filtrosDash, acervo]);

  const chipsDash: Chip[] = [
    ...filtrosDash.tipos.map((t) => ({ id: `tipo-${t}`, label: `Tipo: ${t}`, onRemove: () => setFiltrosDash(f => ({ ...f, tipos: f.tipos.filter(x => x !== t) })) })),
    ...(filtrosDash.anoDe !== ANO_MIN || filtrosDash.anoAte !== ANO_MAX ? [{ id: "periodo", label: filtrosDash.anoDe === filtrosDash.anoAte ? `Ano: ${filtrosDash.anoDe}` : `Período: ${filtrosDash.anoDe}–${filtrosDash.anoAte}`, onRemove: () => setFiltrosDash(f => ({ ...f, anoDe: ANO_MIN, anoAte: ANO_MAX })) }] : []),
    ...(filtrosDash.nucleo !== "Todos" ? [{ id: "nucleo", label: `Núcleo: ${filtrosDash.nucleo}`, onRemove: () => setFiltrosDash(f => ({ ...f, nucleo: "Todos" })) }] : []),
  ];

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Visão Geral</h2>
            <p className="mt-1 text-sm text-muted-foreground">Indicadores e gráficos do acervo digital.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="brand" onClick={() => setModalFiltrosDash(true)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filtros Avançados
            </Button>
          </div>
        </header>

        <FilterChips chips={chipsDash} onLimpar={() => setFiltrosDash(INICIAL)} />

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Total no Acervo</p>
            <p className="mt-2 text-3xl font-semibold">{acervo.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Documentos registrados</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Tamanho do Acervo</p>
                <p className="mt-2 text-3xl font-semibold text-primary">{sysStatus ? formatarTamanho(sysStatus.acervo_bytes) : "..."}</p>
                <p className="mt-1 text-xs text-muted-foreground">Arquivos do sistema</p>
              </div>
              <Files className="h-8 w-8 text-primary/20" />
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Espaço Utilizado</p>
                <p className="mt-2 text-3xl font-semibold text-blue-600">{sysStatus ? formatarTamanho(sysStatus.usado_bytes) : "..."}</p>
                <p className="mt-1 text-xs text-muted-foreground">SSD Principal</p>
              </div>
              <HardDrive className="h-8 w-8 text-blue-100" />
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Espaço Livre</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-600">{sysStatus ? formatarTamanho(sysStatus.livre_bytes) : "..."}</p>
                <p className="mt-1 text-xs text-muted-foreground">Disponível para uploads</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-100" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <PizzaNucleos docs={documentosDash} />
          <BarrasAno docs={documentosDash} />
        </section>
      </div>

      <Dialog open={modalFiltrosDash} onOpenChange={setModalFiltrosDash}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Filtros do Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 grid min-w-0">
              <Label>Tipologias</Label>
              <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-slate-50/50 p-3 space-y-3">
                {TIPOS.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-primary">
                    <Checkbox
                      checked={filtrosDash.tipos.includes(t)}
                      onCheckedChange={(checked) => {
                        setFiltrosDash((f) => ({
                          ...f,
                          tipos: checked ? [...f.tipos, t] : f.tipos.filter((x) => x !== t),
                        }));
                      }}
                    />
                    <span className="truncate">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 grid min-w-0">
              <Label>Núcleo de Pesquisa</Label>
              <Select value={filtrosDash.nucleo} onValueChange={(v) => setFiltrosDash(f => ({ ...f, nucleo: v }))}>
                <SelectTrigger className="w-full max-w-full overflow-hidden [&>span]:truncate [&>span]:min-w-0 text-left"><SelectValue /></SelectTrigger>
                <SelectContent className="max-w-[min(90vw,30rem)]">{NUCLEOS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano Inicial</Label>
                <Select value={String(filtrosDash.anoDe)} onValueChange={(v) => setFiltrosDash(f => ({ ...f, anoDe: Number(v), anoAte: Math.max(Number(v), f.anoAte) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano Final</Label>
                <Select value={String(filtrosDash.anoAte)} onValueChange={(v) => setFiltrosDash(f => ({ ...f, anoAte: Number(v), anoDe: Math.min(Number(v), f.anoDe) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={() => setModalFiltrosDash(false)}>Aplicar e Fechar</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}