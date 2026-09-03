import { X } from "lucide-react";

export type Chip = { id: string; label: string; onRemove: () => void };

export function FilterChips({ chips, onLimpar }: { chips: Chip[]; onLimpar: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Filtros ativos
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          title={`Remover filtro: ${chip.label}`}
          className="group inline-flex max-w-[22rem] items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 py-1 pl-3 pr-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <span className="truncate">{chip.label}</span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
        </button>
      ))}
      <button
        type="button"
        onClick={onLimpar}
        className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        Limpar tudo
      </button>
    </div>
  );
}
