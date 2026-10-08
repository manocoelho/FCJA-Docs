import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HIERARQUIA_ATIVIDADES } from "./codigos";

type Props = { onFiltroChange: (prefixo: string) => void; };

export function FiltroPastas({ onFiltroChange }: Props) {
  const [funcao, setFuncao] = useState("todas");
  const [subfuncao, setSubfuncao] = useState("todas");

  const funcoes = Object.keys(HIERARQUIA_ATIVIDADES);
  const subfuncoes = funcao !== "todas" ? Object.keys(HIERARQUIA_ATIVIDADES[funcao as keyof typeof HIERARQUIA_ATIVIDADES]) : [];

  const dispararFiltro = (f: string, s: string) => {
    if (s !== "todas") { onFiltroChange(s.split(" ")[1] || ""); return; } // Prefixo Subfunção
    if (f !== "todas") { onFiltroChange(f.split(" ")[1] || ""); return; } // Prefixo Função
    onFiltroChange("");
  };

  return (
    <div className="flex flex-wrap gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-200 mb-6">
      <div className="space-y-2 flex-1 min-w-[250px]">
        <Label className="text-xs text-muted-foreground flex gap-2 items-center">Filtro por Pasta (Função)</Label>
        <Select value={funcao} onValueChange={(v) => { setFuncao(v); setSubfuncao("todas"); dispararFiltro(v, "todas"); }}>
          <SelectTrigger><SelectValue placeholder="Todas as Funções" /></SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto"><SelectItem value="todas">-- Todas as Funções --</SelectItem>{funcoes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2 flex-1 min-w-[250px]">
        <Label className="text-xs text-muted-foreground">Subpasta (Subfunção)</Label>
        <Select disabled={funcao === "todas"} value={subfuncao} onValueChange={(v) => { setSubfuncao(v); dispararFiltro(funcao, v); }}>
          <SelectTrigger><SelectValue placeholder="Todas as Subfunções" /></SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto w-[min(30rem,90vw)]"><SelectItem value="todas">-- Todas as Subfunções --</SelectItem>{subfuncoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}