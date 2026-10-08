import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HIERARQUIA_ATIVIDADES } from "./codigos";

type Props = { onSelecionar: (codigo: string, descricao: string) => void; };

export function SeletorHierarquico({ onSelecionar }: Props) {
  const [funcao, setFuncao] = useState("");
  const [subfuncao, setSubfuncao] = useState("");
  const [atividade, setAtividade] = useState("");
  const [codigo, setCodigo] = useState("");

  const funcoes = Object.keys(HIERARQUIA_ATIVIDADES);
  const subfuncoes = funcao ? Object.keys((HIERARQUIA_ATIVIDADES as any)[funcao] || {}) : [];
  const atividades = subfuncao && funcao ? Object.keys((HIERARQUIA_ATIVIDADES as any)[funcao]?.[subfuncao] || {}) : [];
  const codigos: { codigo: string; descricao: string }[] = atividade && subfuncao && funcao ? ((HIERARQUIA_ATIVIDADES as any)[funcao]?.[subfuncao]?.[atividade] || []) : [];

  return (
    <div className="col-span-full w-full bg-slate-50/60 p-5 rounded-2xl border border-slate-200 mt-4 shadow-sm">
      <Label className="text-sm font-bold text-primary mb-4 block">Navegação em Pastas (Atividade-Meio)</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">1. Função</Label>
          <Select value={funcao} onValueChange={(v) => { setFuncao(v); setSubfuncao(""); setAtividade(""); setCodigo(""); onSelecionar("", ""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione a Função" /></SelectTrigger>
            <SelectContent><div className="max-h-60 overflow-y-auto">{funcoes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</div></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">2. Subfunção</Label>
          <Select disabled={!funcao} value={subfuncao} onValueChange={(v) => { setSubfuncao(v); setAtividade(""); setCodigo(""); onSelecionar("", ""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione a Subfunção" /></SelectTrigger>
            <SelectContent><div className="max-h-60 overflow-y-auto">{subfuncoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</div></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">3. Atividade</Label>
          <Select disabled={!subfuncao} value={atividade} onValueChange={(v) => { setAtividade(v); setCodigo(""); onSelecionar("", ""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione a Atividade" /></SelectTrigger>
            <SelectContent><div className="max-h-60 overflow-y-auto w-[min(30rem,90vw)]">{atividades.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</div></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">4. Tipologia Documental</Label>
          <Select disabled={!atividade} value={codigo} onValueChange={(v) => { 
            setCodigo(v);
            const desc = codigos.find((c: { codigo: string; descricao: string }) => c.codigo === v)?.descricao || "";
            onSelecionar(v, desc); 
          }}>
            <SelectTrigger><SelectValue placeholder="Selecione o Código" /></SelectTrigger>
            <SelectContent><div className="max-h-60 overflow-y-auto w-[min(30rem,90vw)]">{codigos.map((c: { codigo: string; descricao: string }) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo} - {c.descricao}</SelectItem>)}</div></SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}