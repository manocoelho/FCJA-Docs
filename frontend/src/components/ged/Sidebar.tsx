import { FolderOpen, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANOS, NUCLEOS, TIPOS } from "./data";

type Props = {
  tipos: string[];
  onToggleTipo: (t: string) => void;
  anoDe: number;
  anoAte: number;
  onAnoDe: (v: number) => void;
  onAnoAte: (v: number) => void;
  nucleo: string;
  onNucleo: (v: string) => void;
  onLimpar: () => void;
  temFiltros: boolean;
};

export function Sidebar({
  tipos,
  onToggleTipo,
  anoDe,
  anoAte,
  onAnoDe,
  onAnoAte,
  nucleo,
  onNucleo,
  onLimpar,
  temFiltros,
}: Props) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-8 border-b border-sidebar-border bg-sidebar p-6 lg:h-screen lg:w-80 lg:border-r lg:border-b-0 lg:sticky lg:top-0 lg:overflow-y-auto">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <FolderOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">FCJA Docs</p>
          <p className="truncate text-xs text-muted-foreground">Gestão Eletrônica de Documentos</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        Filtros de Busca
      </div>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de Documento
        </p>
        <div className="space-y-2.5">
          {TIPOS.map((tipo) => (
            <label
              key={tipo}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent"
            >
              <Checkbox
                checked={tipos.includes(tipo)}
                onCheckedChange={() => onToggleTipo(tipo)}
              />
              <span>{tipo}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Período (Ano)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Select value={String(anoDe)} onValueChange={(v) => onAnoDe(Number(v))}>
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Select value={String(anoAte)} onValueChange={(v) => onAnoAte(Number(v))}>
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
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Núcleos de Pesquisa
        </p>
        <Select value={nucleo} onValueChange={onNucleo}>
          <SelectTrigger className="h-auto min-h-10 items-start py-2 text-left [&>span]:line-clamp-3 [&>span]:whitespace-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80 max-w-[min(28rem,90vw)]">
            {NUCLEOS.map((n) => (
              <SelectItem key={n} value={n} className="items-start whitespace-normal">
                <span className="block leading-snug">{n}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Os filtros são aplicados automaticamente.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onLimpar}
          disabled={!temFiltros}
        >
          Limpar filtros
        </Button>
      </div>
    </aside>
  );
}