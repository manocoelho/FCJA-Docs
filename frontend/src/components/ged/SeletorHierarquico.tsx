import { useState, useMemo } from "react";
import { CheckCircle2, FolderTree, Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HIERARQUIA_ATIVIDADES } from "./codigos";

type Props = {
  onSelecionar: (codigo: string, descricao: string) => void;
  children?: React.ReactNode;
};

interface ItemPlanoClassificacao {
  funcao: string;
  subfuncao: string;
  atividade: string;
  codigo: string;
  descricao: string;
  buscaNormalizada: string;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function SeletorHierarquico({ onSelecionar, children }: Props) {
  const [funcao, setFuncao] = useState("");
  const [subfuncao, setSubfuncao] = useState("");
  const [atividade, setAtividade] = useState("");
  const [codigo, setCodigo] = useState("");
  const [termoBuscaRapida, setTermoBuscaRapida] = useState("");

  const arvore = HIERARQUIA_ATIVIDADES as Record<
    string,
    Record<string, Record<string, { codigo: string; descricao: string }[]>>
  >;

  const funcoes = useMemo(() => Object.keys(arvore), [arvore]);
  const subfuncoes = useMemo(
    () => (funcao && arvore[funcao] ? Object.keys(arvore[funcao]) : []),
    [arvore, funcao]
  );
  const atividades = useMemo(
    () =>
      funcao && subfuncao && arvore[funcao]?.[subfuncao]
        ? Object.keys(arvore[funcao][subfuncao])
        : [],
    [arvore, funcao, subfuncao]
  );
  const codigos = useMemo(
    () =>
      funcao && subfuncao && atividade && arvore[funcao]?.[subfuncao]?.[atividade]
        ? arvore[funcao][subfuncao][atividade]
        : [],
    [arvore, funcao, subfuncao, atividade]
  );

  // Índice plano para busca instantânea por código ou palavra-chave no PCD
  const indicePlano = useMemo<ItemPlanoClassificacao[]>(() => {
    const lista: ItemPlanoClassificacao[] = [];
    for (const [f, subs] of Object.entries(arvore)) {
      for (const [s, ativs] of Object.entries(subs || {})) {
        for (const [a, itens] of Object.entries(ativs || {})) {
          for (const item of itens || []) {
            lista.push({
              funcao: f,
              subfuncao: s,
              atividade: a,
              codigo: item.codigo,
              descricao: item.descricao,
              buscaNormalizada: normalizarTexto(
                `${item.codigo} ${item.descricao} ${a} ${s} ${f}`
              ),
            });
          }
        }
      }
    }
    return lista;
  }, [arvore]);

  const sugestoesBusca = useMemo(() => {
    const q = normalizarTexto(termoBuscaRapida.trim());
    if (q.length < 2) return [];
    const termos = q.split(/\s+/).filter(Boolean);
    return indicePlano
      .filter((item) => termos.every((t) => item.buscaNormalizada.includes(t)))
      .slice(0, 12);
  }, [indicePlano, termoBuscaRapida]);

  const itemSelecionadoAtual = useMemo(
    () => codigos.find((c) => c.codigo === codigo) || null,
    [codigos, codigo]
  );

  function aplicarItemBuscaRapida(item: ItemPlanoClassificacao) {
    setFuncao(item.funcao);
    setSubfuncao(item.subfuncao);
    setAtividade(item.atividade);
    setCodigo(item.codigo);
    setTermoBuscaRapida("");
    onSelecionar(item.codigo, item.descricao);
  }

  function limparSelecaoHierarquica() {
    setFuncao("");
    setSubfuncao("");
    setAtividade("");
    setCodigo("");
    setTermoBuscaRapida("");
    onSelecionar("", "");
  }

  return (
    <div className="col-span-full w-full rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 to-slate-50/70 p-5 shadow-sm space-y-4">
      {/* Cabeçalho com Busca Rápida Inteligente no PCD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600/10 text-blue-700">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <Label className="text-sm font-bold text-slate-900 block">
              Navegação em Pastas — Plano de Classificação (Atividade-Meio)
            </Label>
            <p className="text-[11px] text-slate-500">
              Navegue pelos 4 níveis hierárquicos ou pesquise diretamente pelo código/assunto para preenchimento automático.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={termoBuscaRapida}
            onChange={(e) => setTermoBuscaRapida(e.target.value)}
            placeholder="Busca rápida PCD (ex: Despacho, 001.01.04)..."
            className="h-8 bg-white pl-8 pr-7 text-xs border-blue-200 focus-visible:ring-blue-500"
          />
          {termoBuscaRapida && (
            <button
              type="button"
              onClick={() => setTermoBuscaRapida("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              title="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {sugestoesBusca.length > 0 && (
            <div className="absolute left-0 right-0 top-9 z-50 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Resultados no Plano de Classificação ({sugestoesBusca.length})
              </div>
              {sugestoesBusca.map((item) => (
                <button
                  key={`${item.atividade}-${item.codigo}`}
                  type="button"
                  onClick={() => aplicarItemBuscaRapida(item)}
                  className="w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-blue-50"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-800">
                      {item.codigo}
                    </span>
                    <span className="line-clamp-1">{item.descricao}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-500">
                    {item.funcao} ➔ {item.subfuncao} ➔ {item.atividade}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha 1: 1. Função | 2. Subfunção | 3. Atividade */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              1
            </span>
            Função
          </Label>
          <Select
            value={funcao}
            onValueChange={(v) => {
              setFuncao(v);
              setSubfuncao("");
              setAtividade("");
              setCodigo("");
              onSelecionar("", "");
            }}
          >
            <SelectTrigger
              className="w-full bg-white [&>span]:truncate text-left"
              title={funcao || "Selecione a Função"}
            >
              <SelectValue placeholder="Selecione a Função..." />
            </SelectTrigger>
            <SelectContent className="max-h-72 w-[min(36rem,92vw)] overflow-y-auto p-1.5">
              {funcoes.map((f) => (
                <SelectItem
                  key={f}
                  value={f}
                  className="items-start whitespace-normal py-2 px-3 text-xs leading-snug"
                >
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                funcao ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              2
            </span>
            Subfunção
          </Label>
          <Select
            disabled={!funcao}
            value={subfuncao}
            onValueChange={(v) => {
              setSubfuncao(v);
              setAtividade("");
              setCodigo("");
              onSelecionar("", "");
            }}
          >
            <SelectTrigger
              className="w-full bg-white [&>span]:truncate text-left"
              title={subfuncao || "Selecione a Subfunção"}
            >
              <SelectValue placeholder="Selecione a Subfunção..." />
            </SelectTrigger>
            <SelectContent className="max-h-72 w-[min(36rem,92vw)] overflow-y-auto p-1.5">
              {subfuncoes.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="items-start whitespace-normal py-2 px-3 text-xs leading-snug"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                subfuncao ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              3
            </span>
            Atividade
          </Label>
          <Select
            disabled={!subfuncao}
            value={atividade}
            onValueChange={(v) => {
              setAtividade(v);
              setCodigo("");
              onSelecionar("", "");
            }}
          >
            <SelectTrigger
              className="w-full bg-white [&>span]:truncate text-left"
              title={atividade || "Selecione a Atividade"}
            >
              <SelectValue placeholder="Selecione a Atividade..." />
            </SelectTrigger>
            <SelectContent className="max-h-72 w-[min(38rem,92vw)] overflow-y-auto p-1.5">
              {atividades.map((a) => (
                <SelectItem
                  key={a}
                  value={a}
                  className="items-start whitespace-normal py-2 px-3 text-xs leading-snug"
                >
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 2: 4. Tipologia Documental (Código PCD - 2 colunas) | 5. Tipologia / Espécie (1 coluna) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-end">
        <div className="space-y-1.5 md:col-span-2 min-w-0">
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                atividade ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              4
            </span>
            Tipologia Documental (Código de Classificação PCD)
          </Label>
          <Select
            disabled={!atividade}
            value={codigo}
            onValueChange={(v) => {
              setCodigo(v);
              const desc =
                codigos.find((c: { codigo: string; descricao: string }) => c.codigo === v)
                  ?.descricao || "";
              onSelecionar(v, desc);
            }}
          >
            <SelectTrigger
              className="w-full bg-white [&>span]:truncate text-left"
              title={
                itemSelecionadoAtual
                  ? `${itemSelecionadoAtual.codigo} - ${itemSelecionadoAtual.descricao}`
                  : "Selecione o Código PCD"
              }
            >
              <SelectValue placeholder="Selecione o Código e Assunto Documental..." />
            </SelectTrigger>
            <SelectContent className="max-h-72 w-[min(42rem,94vw)] overflow-y-auto p-1.5">
              {codigos.map((c: { codigo: string; descricao: string }) => (
                <SelectItem
                  key={c.codigo}
                  value={c.codigo}
                  className="items-start whitespace-normal py-2 px-3 text-xs leading-snug"
                >
                  <span className="font-mono font-bold text-blue-700">{c.codigo}</span> —{" "}
                  <span>{c.descricao}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 w-full">{children}</div>
      </div>

      {/* Barra de Confirmação Visual da Classe Selecionada */}
      {codigo && itemSelecionadoAtual && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">
              <strong>Classe PCD Selecionada:</strong>{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-emerald-800 border border-emerald-200">
                {codigo}
              </code>{" "}
              — {itemSelecionadoAtual.descricao}
            </span>
          </div>
          <button
            type="button"
            onClick={limparSelecaoHierarquica}
            className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0"
          >
            Alterar / Limpar
          </button>
        </div>
      )}
    </div>
  );
}
