import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Clock,
  Files,
  Filter,
  Plus,
  Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FilterChips, type Chip } from "@/components/ged/FilterChips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sidebar } from "@/components/ged/Sidebar";
import { BarrasAno, PizzaNucleos } from "@/components/ged/Charts";
import { DocumentTable } from "@/components/ged/DocumentTable";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CATEGORIA_POR_TIPO,
  DOCUMENTOS,
  TIPOS,
  TIPO_POR_CATEGORIA,
  NUCLEOS,
} from "@/components/ged/data";
import { ANOS } from "@/components/ged/data";
import type { Doc } from "@/components/ged/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FCJA Docs — Gestão Eletrônica de Documentos" },
      {
        name: "description",
        content:
          "Painel GED da FCJA: filtre, analise e gerencie documentos por tipo, ano e núcleo com dashboards em tempo real.",
      },
      { property: "og:title", content: "FCJA Docs — Gestão Eletrônica de Documentos" },
      {
        property: "og:description",
        content:
          "Painel GED da FCJA com filtros avançados, indicadores e gráficos de documentos por núcleo e ano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Filtros = { tipos: string[]; anoDe: number; anoAte: number; nucleo: string };

const ANO_MIN = 2024;
const ANO_MAX = 2026;

const INICIAL: Filtros = { tipos: [], anoDe: ANO_MIN, anoAte: ANO_MAX, nucleo: "Todos" };

const EXT_POR_SUFIXO: Record<string, Doc["ext"]> = {
  pdf: "pdf",
  xlsx: "xlsx",
  xls: "xlsx",
  csv: "xlsx",
  docx: "docx",
  doc: "docx",
};

const TAMANHO_MAX = 25 * 1024 * 1024;

type Pendente = {
  id: string;
  file: File;
  sel: boolean;
  data: string;
  tipo: string;
  nucleo: string;
  progresso: number;
  status: "aguardando" | "enviando" | "concluido";
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Index() {
  // 1. Estado para armazenar os dados reais da API (inicia com os falsos como backup)
  const [documentosApi, setDocumentosApi] = useState<Doc[]>(DOCUMENTOS);

  const [filtros, setFiltros] = useState<Filtros>(INICIAL);
  const [enviados, setEnviados] = useState<Doc[]>([]);

  // 2. Este bloco puxa os dados do Python assim que a tela abre
  useEffect(() => {
    fetch("http://localhost:8000/api/documentos")
      .then((res) => {
        if (!res.ok) throw new Error("Falha na rede");
        return res.json();
      })
      .then((dados) => {
        setDocumentosApi(dados);
        toast.success("Conectado ao Backend!", { 
          description: "Os documentos estão vindo da sua API local." 
        });
      })
      .catch((err) => {
        console.error("Erro na API:", err);
        toast.error("API Python desligada", { 
          description: "Mostrando documentos de demonstração." 
        });
      });
  }, []);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [cadData, setCadData] = useState(hoje());
  const [cadNucleo, setCadNucleo] = useState<string>(NUCLEOS[1]!);
  const [cadTipo, setCadTipo] = useState<string>(TIPOS[1]!);
  const [erros, setErros] = useState<string[]>([]);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resumo, setResumo] = useState<{ total: number; recusados: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [removidos, setRemovidos] = useState<string[]>([]);
  const [edicoes, setEdicoes] = useState<
    Record<string, { nome: string; categoria: string; ano: number; nucleo: string }>
  >({});
  const acervo = useMemo(
    () =>
      [...enviados, ...documentosApi]
        .filter((d) => !removidos.includes(d.id))
        .map((d) => (edicoes[d.id] ? { ...d, ...edicoes[d.id]! } : d)),
    [enviados, removidos, edicoes, documentosApi],
  );
  const selecionados = pendentes.filter((p) => p.sel);

  function receberArquivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const novosErros: string[] = [];
    const aceitos: Pendente[] = [];

    for (const file of Array.from(lista)) {
      const sufixo = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!EXT_POR_SUFIXO[sufixo]) {
        novosErros.push(`${file.name}: formato não aceito (use PDF, DOCX ou XLSX).`);
        continue;
      }
      if (file.size > TAMANHO_MAX) {
        novosErros.push(`${file.name}: ${formatarTamanho(file.size)} excede o limite de 25 MB.`);
        continue;
      }
      if (file.size === 0) {
        novosErros.push(`${file.name}: arquivo vazio.`);
        continue;
      }
      if (pendentes.some((p) => p.file.name === file.name && p.file.size === file.size)) {
        novosErros.push(`${file.name}: já está na lista de envio.`);
        continue;
      }
      if (aceitos.some((p) => p.file.name === file.name && p.file.size === file.size)) continue;
      aceitos.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        sel: true,
        data: cadData,
        tipo: cadTipo,
        nucleo: filtros.nucleo !== "Todos" ? filtros.nucleo : cadNucleo,
        progresso: 0,
        status: "aguardando",
      });
    }

    setErros(novosErros);
    if (novosErros.length > 0) {
      toast.error(
        novosErros.length === 1
          ? "1 arquivo foi recusado"
          : `${novosErros.length} arquivos foram recusados`,
        { description: novosErros[0] },
      );
    }
    if (aceitos.length > 0) {
      setErroForm(null);
      setResumo(null);
      setPendentes((prev) => [...prev, ...aceitos]);
      toast.success(
        aceitos.length === 1
          ? "1 arquivo pronto para cadastro"
          : `${aceitos.length} arquivos prontos para cadastro`,
        { description: "Selecione os arquivos e aplique o cadastro em lote." },
      );
      if (filtros.nucleo !== "Todos") setCadNucleo(filtros.nucleo);
    }
  }

  function removerPendente(id: string) {
    setPendentes((prev) => prev.filter((p) => p.id !== id));
  }

  function alternarSel(id: string) {
    setPendentes((prev) => prev.map((p) => (p.id === id ? { ...p, sel: !p.sel } : p)));
  }

  function alternarTodos(valor: boolean) {
    setPendentes((prev) => prev.map((p) => ({ ...p, sel: valor })));
  }

  function aplicarCampos(patch: Partial<Pick<Pendente, "data" | "tipo" | "nucleo">>) {
    setPendentes((prev) => prev.map((p) => (p.sel ? { ...p, ...patch } : p)));
  }

  function aplicarEmLote() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
      setErroForm("Marque ao menos um arquivo para aplicar o cadastro em lote.");
      return;
    }
    setErroForm(null);
    setPendentes((prev) =>
      prev.map((p) => (p.sel ? { ...p, data: cadData, tipo: cadTipo, nucleo: cadNucleo } : p)),
    );
    toast.success(`Cadastro aplicado a ${alvos.length} arquivo(s)`, {
      description: `${cadTipo} · ${new Date(`${cadData}T12:00:00`).getFullYear()} · ${cadNucleo}`,
    });
  }

  function validarItem(p: Pendente) {
    if (!p.data) return "Informe a data do documento.";
    const data = new Date(`${p.data}T12:00:00`);
    if (Number.isNaN(data.getTime())) return "Data inválida.";
    if (data.getTime() > Date.now() + 86400000) return "A data não pode ser futura.";
    if (data.getFullYear() < 1900) return "Ano da data é inválido.";
    if (!p.tipo) return "Selecione o tipo de documento.";
    if (!p.nucleo || p.nucleo === "Todos") return "Selecione o núcleo de pesquisa.";
    return null;
  }

  async function cadastrarPendentes() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
      const msg = "Marque ao menos um arquivo para enviar.";
      setErroForm(msg);
      toast.error("Não foi possível cadastrar", { description: msg });
      return;
    }
    
    for (const p of alvos) {
      const erro = validarItem(p);
      if (erro) {
        const msg = `${p.file.name}: ${erro}`;
        setErroForm(msg);
        toast.error("Não foi possível cadastrar", { description: msg });
        return;
      }
    }
    
    setErroForm(null);
    setEnviando(true);
    setResumo(null);

    const novos: Doc[] = [];

    for (let i = 0; i < alvos.length; i++) {
      const p = alvos[i]!;
      setPendentes((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: "enviando", progresso: 50 } : x)),
      );
      
      const data = new Date(`${p.data}T12:00:00`);
      const sufixo = p.file.name.split(".").pop()?.toLowerCase() ?? "";
      const ext = EXT_POR_SUFIXO[sufixo] ?? "pdf";
      const categoria = CATEGORIA_POR_TIPO[p.tipo] ?? "Relatório";
      const ano = data.getFullYear();

      // ==========================================
      // NOVA LÓGICA DE UPLOAD REAL PARA O PYTHON
      // ==========================================
      const formData = new FormData();
      formData.append("file", p.file);
      formData.append("nome", p.file.name);
      formData.append("ext", ext);
      formData.append("categoria", categoria);
      formData.append("ano", String(ano));
      formData.append("nucleo", p.nucleo);

      try {
        const res = await fetch("http://localhost:8000/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Erro na rede ao enviar arquivo");

        const respostaApi = await res.json();
        
        novos.push({
          id: respostaApi.id, // ID verdadeiro gerado pelo Banco de Dados
          nome: p.file.name,
          ext: ext as "pdf" | "xlsx" | "docx",
          categoria: categoria,
          ano: ano,
          nucleo: p.nucleo,
          upload: respostaApi.upload,
          url: `http://localhost:8000/arquivos/${p.file.name}`,
        });

        setPendentes((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, status: "concluido", progresso: 100 } : x)),
        );
      } catch (erro) {
        console.error("Falha no upload:", erro);
        toast.error(`Falha ao enviar o arquivo: ${p.file.name}`);
      }
    }

    // Atualiza a tabela com os novos arquivos do banco
    setDocumentosApi((prev) => [...novos, ...prev]);
    
    const anos = novos.map((n) => n.ano);
    if (anos.length > 0) {
      setFiltros((f) => ({
        tipos: [],
        anoDe: Math.min(ANO_MIN, ...anos, f.anoDe),
        anoAte: Math.max(ANO_MAX, ...anos, f.anoAte),
        nucleo: "Todos",
      }));
    }
    
    const restantes = pendentes.filter((p) => !p.sel);
    setPendentes(restantes);
    setErros([]);
    setEnviando(false);
    setResumo({ total: novos.length, recusados: restantes.length });
    
    if (novos.length > 0) {
        toast.success(
          novos.length === 1
            ? "1 documento salvo no Banco de Dados!"
            : `${novos.length} documentos salvos no Banco de Dados!`,
          {
            description:
              restantes.length > 0
                ? `${restantes.length} arquivo(s) continuam aguardando cadastro.`
                : "Todos os arquivos foram guardados em C:/FCJA_Dados/arquivos",
          },
        );
    }
    
    if (restantes.length === 0) setDialogAberto(false);
  }

  function abrirDoc(doc: Doc) {
    if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
    else toast.info("Pré-visualização indisponível", { description: "Documento de demonstração." });
  }

  function baixarDoc(doc: Doc) {
    if (!doc.url) {
      toast.info("Download indisponível", { description: "Documento de demonstração." });
      return;
    }
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.nome;
    a.click();
  }

  async function removerDoc(doc: Doc) {
    try {
      // 1. Envia a ordem de DELETE para o Python
      const res = await fetch(`http://localhost:8000/api/documentos/${doc.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Falha ao apagar no backend");

      // 2. Tira o documento da tela
      setDocumentosApi((prev) => prev.filter((d) => d.id !== doc.id));
      setEnviados((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Documento removido definitivamente", { description: doc.nome });
      
    } catch (erro) {
      console.error(erro);
      toast.error("Erro ao remover", { description: "Não foi possível apagar o documento." });
    }
  }

  async function removerDocs(lista: Doc[]) {
    if (lista.length === 0) return;
    
    try {
      // 1. Envia a ordem de DELETE para todos os arquivos marcados ao mesmo tempo
      await Promise.all(
        lista.map(doc => 
          fetch(`http://localhost:8000/api/documentos/${doc.id}`, { method: "DELETE" })
        )
      );

      // 2. Tira os documentos da tela
      const ids = lista.map((d) => d.id);
      setDocumentosApi((prev) => prev.filter((d) => !ids.includes(d.id)));
      setEnviados((prev) => prev.filter((d) => !ids.includes(d.id)));

      toast.success(`${lista.length} documento(s) removido(s) definitivamente`, {
        description:
          lista.length <= 3
            ? lista.map((d) => d.nome).join(", ")
            : `${lista
                .slice(0, 3)
                .map((d) => d.nome)
                .join(", ")} e mais ${lista.length - 3}.`,
      });
    } catch (erro) {
      console.error(erro);
      toast.error("Erro na remoção em lote", { description: "Ocorreu um erro na comunicação." });
    }
  }

  async function editarDoc(
    doc: Doc,
    dados: { nome: string; categoria: string; ano: number; nucleo: string },
  ) {
    try {
      // 1. Envia os novos dados para o Python (via JSON)
      const res = await fetch(`http://localhost:8000/api/documentos/${doc.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });

      if (!res.ok) throw new Error("Falha ao atualizar no backend");
      
      const respostaApi = await res.json();

      // 2. Atualiza a tabela na tela com as novas informações
      setDocumentosApi((prev) => 
        prev.map((d) => (d.id === doc.id ? { ...d, ...dados, url: respostaApi.url || d.url } : d))
      );
      
      toast.success("Documento atualizado", { description: dados.nome });
    } catch (erro) {
      console.error(erro);
      toast.error("Erro na atualização", { description: "Não foi possível editar o documento." });
    }
  }

  const documentos = useMemo(
    () =>
      acervo.filter((d) => {
        const tipoOk =
          filtros.tipos.length === 0 ||
          filtros.tipos.includes(TIPO_POR_CATEGORIA[d.categoria] ?? "");
        const anoOk = d.ano >= filtros.anoDe && d.ano <= filtros.anoAte;
        const nucleoOk = filtros.nucleo === "Todos" || d.nucleo === filtros.nucleo;
        return tipoOk && anoOk && nucleoOk;
      }),
    [filtros, acervo],
  );

  const chips: Chip[] = [
    ...filtros.tipos.map((t) => ({
      id: `tipo-${t}`,
      label: `Tipo: ${t}`,
      onRemove: () => setFiltros((f) => ({ ...f, tipos: f.tipos.filter((x) => x !== t) })),
    })),
    ...(filtros.anoDe !== ANO_MIN || filtros.anoAte !== ANO_MAX
      ? [
          {
            id: "periodo",
            label:
              filtros.anoDe === filtros.anoAte
                ? `Ano: ${filtros.anoDe}`
                : `Período: ${filtros.anoDe}–${filtros.anoAte}`,
            onRemove: () => setFiltros((f) => ({ ...f, anoDe: ANO_MIN, anoAte: ANO_MAX })),
          },
        ]
      : []),
    ...(filtros.nucleo !== "Todos"
      ? [
          {
            id: "nucleo",
            label: `Núcleo: ${filtros.nucleo}`,
            onRemove: () => setFiltros((f) => ({ ...f, nucleo: "Todos" })),
          },
        ]
      : []),
  ];

  const ultimoDoc = acervo.length > 0 ? acervo[0] : null;

  const kpis = [
    {
      label: "Total de Documentos",
      valor: acervo.length.toLocaleString("pt-BR"),
      sub: "Acervo completo",
      icon: Files,
    },
    {
      label: "Filtro Atual",
      valor: `${documentos.length}`,
      sub: "Encontrados",
      icon: Filter,
    },
    {
      label: "Último Upload",
      // Exibe a data real do banco ou um tracinho se estiver vazio
      valor: ultimoDoc ? ultimoDoc.upload : "--/--/----", 
      // Exibe o nome real do arquivo
      sub: ultimoDoc ? ultimoDoc.nome : "Nenhum documento", 
      icon: Clock,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      <Sidebar
        tipos={filtros.tipos}
        onToggleTipo={(t) =>
          setFiltros((f) => ({
            ...f,
            tipos: f.tipos.includes(t) ? f.tipos.filter((x) => x !== t) : [...f.tipos, t],
          }))
        }
        anoDe={filtros.anoDe}
        anoAte={filtros.anoAte}
        onAnoDe={(v) => setFiltros((f) => ({ ...f, anoDe: v, anoAte: Math.max(v, f.anoAte) }))}
        onAnoAte={(v) => setFiltros((f) => ({ ...f, anoAte: v, anoDe: Math.min(v, f.anoDe) }))}
        nucleo={filtros.nucleo}
        onNucleo={(v) => setFiltros((f) => ({ ...f, nucleo: v }))}
        onLimpar={() => setFiltros(INICIAL)}
        temFiltros={chips.length > 0}
      />

      <main className="min-w-0 flex-1 space-y-8 p-6 lg:p-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              Painel de Documentos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fundação Casa de José Américo · visão analítica do acervo digital
            </p>
          </div>
          <Dialog
            open={dialogAberto}
            onOpenChange={(v) => {
              setDialogAberto(v);
              if (!v) {
                setPendentes([]);
                setErros([]);
                setErroForm(null);
                setResumo(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="brand" size="lg" className="shrink-0">
                <Plus /> Adicionar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] w-[min(60rem,96vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
              <DialogHeader className="shrink-0 border-b border-border p-6 pb-4 text-left">
                <DialogTitle>Adicionar e Cadastrar Documento</DialogTitle>
                <DialogDescription>
                  Formatos aceitos: PDF, DOCX, XLSX · até 25 MB por arquivo.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastando(false);
                  receberArquivos(e.dataTransfer.files);
                }}
                className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border-2 border-dashed px-6 py-5 text-center transition-colors hover:border-primary hover:bg-accent/50 ${
                  arrastando ? "border-primary bg-accent/50" : "border-border bg-secondary/50"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={(e) => {
                    receberArquivos(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <CloudUpload className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium">Arraste e solte seus arquivos aqui</p>
                <p className="text-xs text-muted-foreground">ou</p>
                <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  Selecionar arquivos
                </Button>
              </div>

              {erros.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  {erros.map((e) => (
                    <p key={e} className="flex items-start gap-2 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{e}</span>
                    </p>
                  ))}
                </div>
              )}

              {resumo && pendentes.length === 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 p-3 text-xs text-primary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Resumo: {resumo.total} documento(s) cadastrado(s) com sucesso · 0 pendente(s).
                  </span>
                </div>
              )}

              {pendentes.length > 0 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Checkbox
                          checked={pendentes.every((p) => p.sel)}
                          onCheckedChange={(v) => alternarTodos(v === true)}
                          disabled={enviando}
                        />
                        Selecionar todos
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {selecionados.length}/{pendentes.length} marcados
                      </span>
                    </div>
                    <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1 text-sm">
                      {pendentes.map((p) => (
                        <li key={p.id} className="rounded-lg bg-card/60 p-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={p.sel}
                              onCheckedChange={() => alternarSel(p.id)}
                              disabled={enviando}
                              aria-label={`Selecionar ${p.file.name}`}
                            />
                            <span className="min-w-0 flex-1 truncate">{p.file.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatarTamanho(p.file.size)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remover ${p.file.name}`}
                              onClick={() => removerPendente(p.id)}
                              disabled={enviando}
                              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="mt-1 truncate pl-6 text-[11px] text-muted-foreground">
                            {p.tipo} · {new Date(`${p.data}T12:00:00`).getFullYear()} · {p.nucleo}
                          </p>
                          {p.status !== "aguardando" && (
                            <div className="mt-1.5 flex items-center gap-2 pl-6">
                              <Progress value={p.progresso} className="h-1.5 flex-1" />
                              <span className="w-14 shrink-0 text-right text-[11px] text-muted-foreground">
                                {p.status === "concluido" ? "Concluído" : `${p.progresso}%`}
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4 rounded-xl border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cadastro em lote (arquivos marcados)
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Data do documento</Label>
                        <Input
                          type="date"
                          value={cadData}
                          onChange={(e) => {
                            setCadData(e.target.value);
                            aplicarCampos({ data: e.target.value });
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Período (ano)</Label>
                        <Select
                          value={String(new Date(`${cadData}T12:00:00`).getFullYear())}
                          onValueChange={(v) => {
                            const nova = `${v}${cadData.slice(4)}`;
                            setCadData(nova);
                            aplicarCampos({ data: nova });
                          }}
                        >
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
                        <Label className="text-xs text-muted-foreground">Tipo de documento</Label>
                        <Select
                          value={cadTipo}
                          onValueChange={(v) => {
                            setCadTipo(v);
                            aplicarCampos({ tipo: v });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Núcleo de pesquisa</Label>
                      <Select
                        value={cadNucleo}
                        onValueChange={(v) => {
                          setCadNucleo(v);
                          aplicarCampos({ nucleo: v });
                        }}
                      >
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 max-w-[min(28rem,90vw)]">
                          {NUCLEOS.filter((n) => n !== "Todos").map((n) => (
                            <SelectItem key={n} value={n} className="items-start whitespace-normal">
                              <span className="block leading-snug">{n}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={aplicarEmLote}
                      disabled={enviando || selecionados.length === 0}
                    >
                      Aplicar aos {selecionados.length} marcados
                    </Button>
                  </div>

                  {erroForm && (
                    <p className="flex items-center gap-2 text-xs font-medium text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" /> {erroForm}
                    </p>
                  )}

                  {resumo && (
                    <p className="text-xs text-muted-foreground">
                      Último envio: {resumo.total} cadastrado(s) · {resumo.recusados} ainda
                      pendente(s).
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPendentes([]);
                        setErros([]);
                        setErroForm(null);
                      }}
                      disabled={enviando}
                    >
                      Limpar
                    </Button>
                    <Button variant="brand" onClick={cadastrarPendentes} disabled={enviando}>
                      {enviando
                        ? "Enviando…"
                        : `Cadastrar ${selecionados.length} documento(s)`}
                    </Button>
                  </div>
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <FilterChips chips={chips} onLimpar={() => setFiltros(INICIAL)} />

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{kpi.valor}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <kpi.icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <PizzaNucleos docs={documentos} />
          <BarrasAno docs={documentos} />
        </section>

        <DocumentTable
          docs={documentos}
          onView={abrirDoc}
          onDownload={baixarDoc}
          onDelete={removerDoc}
          onDeleteMany={removerDocs}
          onEdit={editarDoc}
        />
      </main>
    </div>
  );
}
