import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { AlertCircle, CloudUpload, Trash2, FolderOpen, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilterChips, type Chip } from "@/components/ged/FilterChips";
import { DocumentTable } from "@/components/ged/DocumentTable";
import { TIPOS, NUCLEOS, ANOS, CATEGORIA_POR_TIPO, TIPO_POR_CATEGORIA, type Doc } from "@/components/ged/data";

const EXT_POR_SUFIXO: Record<string, "pdf" | "xlsx" | "docx"> = {
  pdf: "pdf", xlsx: "xlsx", xls: "xlsx", csv: "xlsx", docx: "docx", doc: "docx",
};
const TAMANHO_MAX = 25 * 1024 * 1024;
const ANO_MIN = 2022;
const ANO_MAX = 2027;

function formatarTamanho(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const tamanhos = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + tamanhos[i];
}

type Filtros = { tipos: string[]; anoDe: number; anoAte: number; nucleo: string };
const INICIAL: Filtros = { tipos: [], anoDe: ANO_MIN, anoAte: ANO_MAX, nucleo: "Todos" };

type Pendente = {
  id: string; file: File; sel: boolean; data: string; tipo: string; nucleo: string;
  progresso: number; status: "aguardando" | "enviando" | "concluido"; editado?: boolean;
};

interface TelaUploadProps {
  acervo: Doc[];
  onDocsUploaded: (novosDocs: Doc[]) => void;
  onView: (doc: Doc) => void;
  onDownload: (doc: Doc) => void;
  onDelete: (doc: Doc) => void;
  onDeleteMany: (docs: Doc[]) => void;
  onEdit: (doc: Doc, dados: { nome: string; categoria: string; ano: number; nucleo: string }) => void;
}

export function TelaUpload({ acervo, onDocsUploaded, onView, onDownload, onDelete, onDeleteMany, onEdit }: TelaUploadProps) {
  const [arrastando, setArrastando] = useState(false);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [cadData, setCadData] = useState(() => new Date().toISOString().slice(0, 10));
  const [cadNucleo, setCadNucleo] = useState<string>(NUCLEOS[1]!);
  const [cadTipo, setCadTipo] = useState<string>(TIPOS[1]!);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [filtrosUpload, setFiltrosUpload] = useState<Filtros>(INICIAL);
  const [modalFiltrosUpload, setModalFiltrosUpload] = useState(false);

  const selecionados = pendentes.filter((p) => p.sel);

  async function abrirPastaWindows() {
    try {
      await fetch("http://localhost:8000/api/sistema/abrir-pasta", { method: "POST" });
      toast.success("Explorador do Windows aberto no servidor!");
    } catch (e) {
      toast.error("Não foi possível abrir a pasta.");
    }
  }

  function receberArquivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const novosErros: string[] = [];
    const aceitos: Pendente[] = [];

    for (const file of Array.from(lista)) {
      const sufixo = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!EXT_POR_SUFIXO[sufixo]) { novosErros.push(`${file.name}: formato não aceito (use PDF, DOCX ou XLSX).`); continue; }
      if (file.size > TAMANHO_MAX) { novosErros.push(`${file.name}: ${formatarTamanho(file.size)} excede o limite.`); continue; }
      if (file.size === 0) { novosErros.push(`${file.name}: arquivo vazio.`); continue; }
      if (pendentes.some((p) => p.file.name === file.name && p.file.size === file.size)) { novosErros.push(`${file.name}: já na lista.`); continue; }
      
      aceitos.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file, sel: true, data: cadData, tipo: cadTipo, nucleo: cadNucleo, progresso: 0, status: "aguardando",
      });
    }

    setErros(novosErros);
    if (novosErros.length > 0) toast.error(`${novosErros.length} arquivos recusados`, { description: novosErros[0] });
    if (aceitos.length > 0) {
      setPendentes((prev) => [...prev, ...aceitos]);
      toast.success(`${aceitos.length} arquivos prontos`, { description: "Selecione e aplique o cadastro em lote." });
    }
  }

  function aplicarEmLote() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
  toast.error("Marque ao menos um arquivo.");
  return;
}
    setPendentes((prev) => prev.map((p) => (p.sel ? { ...p, data: cadData, tipo: cadTipo, nucleo: cadNucleo, sel: false, editado: true } : p)));
    toast.success(`Cadastro aplicado a ${alvos.length} arquivo(s)`);
  }

  async function cadastrarPendentes() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
  toast.error("Marque ao menos um arquivo para enviar.");
  return;
}
    
    setEnviando(true);
    const novos: Doc[] = [];

    for (const p of alvos) {
      setPendentes((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "enviando", progresso: 50 } : x)));
      
      const ano = new Date(`${p.data}T12:00:00`).getFullYear();
      const sufixo = p.file.name.split(".").pop()?.toLowerCase() ?? "";
      const ext = EXT_POR_SUFIXO[sufixo] ?? "pdf";
      const categoria = CATEGORIA_POR_TIPO[p.tipo] ?? "Relatório";

      const formData = new FormData();
      formData.append("file", p.file); formData.append("nome", p.file.name); formData.append("ext", ext);
      formData.append("categoria", categoria); formData.append("ano", String(ano)); formData.append("nucleo", p.nucleo);

      try {
        const res = await fetch("http://localhost:8000/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Erro na rede");
        const resp = await res.json();
        
        novos.push({ id: resp.id, nome: p.file.name, ext: ext as any, categoria, ano, nucleo: p.nucleo, upload: resp.upload, url: resp.url });
        setPendentes((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "concluido", progresso: 100 } : x)));
      } catch (e) {
        toast.error(`Falha ao enviar: ${p.file.name}`);
      }
    }

    onDocsUploaded(novos); // Avisa o index.tsx para atualizar a lista principal
    
    const anos = novos.map((n) => n.ano);
    if (anos.length > 0) {
      setFiltrosUpload((f) => ({ ...f, tipos: [], anoDe: Math.min(ANO_MIN, ...anos, f.anoDe), anoAte: Math.max(ANO_MAX, ...anos, f.anoAte), nucleo: "Todos" }));
    }
    
    const restantes = pendentes.filter((p) => !p.sel);
    setPendentes(restantes);
    setErros([]);
    setEnviando(false);
    
    if (novos.length > 0) toast.success(`${novos.length} documentos salvos no Banco!`);
  }

  const documentosUpload = useMemo(() => acervo.filter((d) => {
    const tipoOk = filtrosUpload.tipos.length === 0 || filtrosUpload.tipos.includes(TIPO_POR_CATEGORIA[d.categoria] ?? "");
    const anoOk = d.ano >= filtrosUpload.anoDe && d.ano <= filtrosUpload.anoAte;
    const nucleoOk = filtrosUpload.nucleo === "Todos" || d.nucleo === filtrosUpload.nucleo;
    return tipoOk && anoOk && nucleoOk;
  }), [filtrosUpload, acervo]);

  const chipsUpload: Chip[] = [
    ...filtrosUpload.tipos.map((t) => ({ id: `tipo-${t}`, label: `Tipo: ${t}`, onRemove: () => setFiltrosUpload(f => ({ ...f, tipos: f.tipos.filter(x => x !== t) })) })),
    ...(filtrosUpload.anoDe !== ANO_MIN || filtrosUpload.anoAte !== ANO_MAX ? [{ id: "periodo", label: filtrosUpload.anoDe === filtrosUpload.anoAte ? `Ano: ${filtrosUpload.anoDe}` : `Período: ${filtrosUpload.anoDe}–${filtrosUpload.anoAte}`, onRemove: () => setFiltrosUpload(f => ({ ...f, anoDe: ANO_MIN, anoAte: ANO_MAX })) }] : []),
    ...(filtrosUpload.nucleo !== "Todos" ? [{ id: "nucleo", label: `Núcleo: ${filtrosUpload.nucleo}`, onRemove: () => setFiltrosUpload(f => ({ ...f, nucleo: "Todos" })) }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 border-b border-border pb-6">
        <h2 className="text-3xl font-semibold tracking-tight">Central de Upload</h2>
        <p className="mt-1 text-sm text-muted-foreground">Arraste seus arquivos para a nuvem local da FCJA e configure os metadados em lote.</p>
      </header>
      
      <div className="space-y-6">
        <div onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)} onDrop={(e) => { e.preventDefault(); setArrastando(false); receberArquivos(e.dataTransfer.files); }} className={`flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-12 text-center transition-all ${arrastando ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-white"}`}>
          <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={(e) => { receberArquivos(e.target.files); e.target.value = ""; }} />
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-2"><CloudUpload className="h-8 w-8" /></span>
          <p className="text-lg font-medium text-foreground">Arraste e solte seus arquivos aqui</p>
          <p className="text-sm text-muted-foreground mb-4">Arquivos PDF, Word ou Excel (até 25 MB)</p>
          <Button onClick={() => inputRef.current?.click()}>Selecionar arquivos no PC</Button>
        </div>

        {erros.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            {erros.map((e) => <p key={e} className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {e}</p>)}
          </div>
        )}

        {pendentes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Checkbox checked={pendentes.every((p) => p.sel)} onCheckedChange={(v) => setPendentes((prev) => prev.map((p) => ({ ...p, sel: v === true })))} disabled={enviando} /> Selecionar todos
                </label>
                <span className="text-sm text-muted-foreground">{selecionados.length}/{pendentes.length} marcados</span>
              </div>
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-2">
                {pendentes.map((p) => (
                  <li key={p.id} className={`rounded-xl border p-3 transition-colors ${p.editado ? "bg-emerald-50/50 border-emerald-200" : "bg-muted/30 border-transparent"}`}>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={p.sel} onCheckedChange={() => setPendentes((prev) => prev.map((x) => (x.id === p.id ? { ...x, sel: !x.sel } : x)))} disabled={enviando} />
                      <span className="min-w-0 flex-1 truncate font-medium">{p.file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatarTamanho(p.file.size)}</span>
                      <button onClick={() => setPendentes((prev) => prev.filter((x) => x.id !== p.id))} disabled={enviando} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-2 pl-7 text-xs text-muted-foreground">{p.tipo} · {new Date(`${p.data}T12:00:00`).getFullYear()} · {p.nucleo}</p>
                    {p.status !== "aguardando" && (
                      <div className="mt-3 flex items-center gap-3 pl-7">
                        <Progress value={p.progresso} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{p.status === "concluido" ? "Concluído" : `${p.progresso}%`}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-foreground">Cadastro em lote</p>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={cadData} onChange={(e) => { setCadData(e.target.value); setPendentes((prev) => prev.map((p) => (p.sel ? { ...p, data: e.target.value } : p))); }} /></div>
                <div className="space-y-2"><Label>Ano</Label>
                  <Select value={String(new Date(`${cadData}T12:00:00`).getFullYear())} onValueChange={(v) => { const nova = `${v}${cadData.slice(4)}`; setCadData(nova); setPendentes((prev) => prev.map((p) => (p.sel ? { ...p, data: nova } : p))); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ANOS.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Tipologia</Label>
                  <Select value={cadTipo} onValueChange={(v) => { setCadTipo(v); setPendentes((prev) => prev.map((p) => (p.sel ? { ...p, tipo: v } : p))); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Núcleo</Label>
                  <Select value={cadNucleo} onValueChange={(v) => { setCadNucleo(v); setPendentes((prev) => prev.map((p) => (p.sel ? { ...p, nucleo: v } : p))); }}>
                    <SelectTrigger className="[&>span]:truncate"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-w-[min(28rem,90vw)]">{NUCLEOS.filter(n => n !== "Todos").map(n => (<SelectItem key={n} value={n}>{n}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <Button variant="outline" onClick={aplicarEmLote} disabled={enviando || selecionados.length === 0}>Aplicar aos {selecionados.length} marcados</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setPendentes([]); setErros([]); }} disabled={enviando}>Limpar Fila</Button>
                  <Button variant="brand" onClick={cadastrarPendentes} disabled={enviando}>{enviando ? "Enviando…" : `Salvar ${selecionados.length} no Banco`}</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Gerenciamento do Acervo</h3>
            <p className="text-sm text-muted-foreground">Visualize, edite ou exporte os documentos já cadastrados no banco de dados.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={abrirPastaWindows} className="gap-2 bg-white"><FolderOpen className="h-4 w-4" /> Abrir Pasta no Windows</Button>
            <Button variant="outline" onClick={() => setModalFiltrosUpload(true)} className="gap-2 bg-white"><SlidersHorizontal className="h-4 w-4" /> Filtrar Tabela</Button>
          </div>
        </div>
        <FilterChips chips={chipsUpload} onLimpar={() => setFiltrosUpload(INICIAL)} />
        <DocumentTable docs={documentosUpload} onView={onView} onDownload={onDownload} onDelete={onDelete} onDeleteMany={onDeleteMany} onEdit={onEdit} />
      </div>

      <Dialog open={modalFiltrosUpload} onOpenChange={setModalFiltrosUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Filtros da Tabela</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 grid min-w-0">
              <Label>Tipologias</Label>
              <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-slate-50/50 p-3 space-y-3">
                {TIPOS.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-primary">
                    <Checkbox checked={filtrosUpload.tipos.includes(t)} onCheckedChange={(checked) => { setFiltrosUpload((f) => ({ ...f, tipos: checked ? [...f.tipos, t] : f.tipos.filter((x) => x !== t) })); }} />
                    <span className="truncate">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 grid min-w-0">
              <Label>Núcleo de Pesquisa</Label>
              <Select value={filtrosUpload.nucleo} onValueChange={(v) => setFiltrosUpload(f => ({ ...f, nucleo: v }))}>
                <SelectTrigger className="w-full max-w-full overflow-hidden [&>span]:truncate [&>span]:min-w-0 text-left"><SelectValue /></SelectTrigger>
                <SelectContent className="max-w-[min(90vw,30rem)]">{NUCLEOS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano Inicial</Label>
                <Select value={String(filtrosUpload.anoDe)} onValueChange={(v) => setFiltrosUpload(f => ({ ...f, anoDe: Number(v), anoAte: Math.max(Number(v), f.anoAte) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano Final</Label>
                <Select value={String(filtrosUpload.anoAte)} onValueChange={(v) => setFiltrosUpload(f => ({ ...f, anoAte: Number(v), anoDe: Math.min(Number(v), f.anoDe) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={() => setModalFiltrosUpload(false)}>Aplicar e Fechar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}