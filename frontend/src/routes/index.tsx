import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle2, CloudUpload, Clock, Files, Filter, Plus, Trash2,
  Eye, EyeOff, LayoutDashboard, FolderOpen, HardDrive, LogOut, SlidersHorizontal,
  FileSpreadsheet, FileText, FileType2, ChevronRight, Folder
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

const ANO_MIN = 2022;
const ANO_MAX = 2027;

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
  editado?: boolean; // <-- 1.
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function formatarTamanho(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const tamanhos = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + tamanhos[i];
}

function Index() {

  // --- CONTROLE DE LOGIN ---
  const [usuarioLogado, setUsuarioLogado] = useState(() => localStorage.getItem("fcja_user"));
  const [loginInput, setLoginInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

// --- CONTROLE DO WEB DESKTOP ---
  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "explorador" | "upload">("dashboard");
  const [pastaSelecionada, setPastaSelecionada] = useState<string>("Todos");
  
  // NAVEGAÇÃO PROFUNDA (Ano e Tipologia)
  const [subPastaAno, setSubPastaAno] = useState<number | null>(null);
  const [subPastaTipo, setSubPastaTipo] = useState<string | null>(null);
  
  // Filtros do Dashboard
  const [filtrosDash, setFiltrosDash] = useState<Filtros>(INICIAL);
  const [modalFiltrosDash, setModalFiltrosDash] = useState(false);
  
  // Filtros da Aba de Upload
  const [filtrosUpload, setFiltrosUpload] = useState<Filtros>(INICIAL);
  const [modalFiltrosUpload, setModalFiltrosUpload] = useState(false);
  
  const [sysStatus, setSysStatus] = useState<{ total_bytes: number; usado_bytes: number; livre_bytes: number; acervo_bytes: number } | null>(null);

  // Busca o status do HD assim que o sistema liga
  useEffect(() => {
    fetch("http://localhost:8000/api/sistema/status")
      .then(res => res.json())
      .then(data => { if (data.sucesso) setSysStatus(data); })
      .catch(err => console.error("Erro ao ler HD:", err));
  }, []);

  async function abrirPastaWindows() {
    try {
      await fetch("http://localhost:8000/api/sistema/abrir-pasta", { method: "POST" });
      toast.success("Explorador do Windows aberto no servidor!");
    } catch (e) {
      toast.error("Não foi possível abrir a pasta.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErroLogin("");
    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginInput, senha: senhaInput }),
      });
      const data = await res.json();
      
      if (data.sucesso) {
        localStorage.setItem("fcja_user", data.nome);
        setUsuarioLogado(data.nome);
        toast.success(`Bem-vindo(a), ${data.nome}!`);
      } else {
        setErroLogin("Credenciais inválidas. Tente novamente.");
      }
    } catch (err) {
      setErroLogin("Erro ao conectar com o servidor.");
    }
  }

  // 1. Estado para armazenar os dados reais da API (inicia com os falsos como backup)
  const [documentosApi, setDocumentosApi] = useState<Doc[]>(DOCUMENTOS);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [excelData, setExcelData] = useState<string>("");
  const [carregandoExcel, setCarregandoExcel] = useState(false);

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
      prev.map((p) => (p.sel ? { 
          ...p, 
          data: cadData, 
          tipo: cadTipo, 
          nucleo: cadNucleo,
          sel: false,    // <-- 2. Desmarca automaticamente
          editado: true  // <-- 3. Avisa que o arquivo foi modificado
      } : p)),
    );
    toast.success(`Cadastro aplicado a ${alvos.length} arquivo(s)`, {
      description: `${cadTipo} ·${new Date(`${cadData}T12:00:00`).getFullYear()} · ${cadNucleo}`,
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
      // LÓGICA DE UPLOAD REAL PARA O PYTHON
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
          url: respostaApi.url,
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
      setFiltrosDash((f) => ({ ...f, tipos: [], anoDe: Math.min(ANO_MIN, ...anos, f.anoDe), anoAte: Math.max(ANO_MAX, ...anos, f.anoAte), nucleo: "Todos" }));
      setFiltrosUpload((f) => ({ ...f, tipos: [], anoDe: Math.min(ANO_MIN, ...anos, f.anoDe), anoAte: Math.max(ANO_MAX, ...anos, f.anoAte), nucleo: "Todos" }));
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

  async function abrirDoc(doc: Doc) {
    if (!doc.url) {
      toast.info("Pré-visualização indisponível", { description: "Documento de demonstração." });
      return;
    }

    // Abre a janela e define qual documento será mostrado
    setViewDoc(doc);
    setViewModalOpen(true);
    setExcelData("");

    // Se for planilha, o React vai ler a aba 1 e converter para HTML
    if (doc.ext === "xlsx") {
      setCarregandoExcel(true);
      try {
        const res = await fetch(doc.url);
        if (!res.ok) throw new Error("Falha ao baixar planilha");
        const arrayBuffer = await res.arrayBuffer();
        
        // Lê o arquivo binário
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const primeiraAba = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[primeiraAba!];

        if (!worksheet) throw new Error("A planilha está vazia.");
        
        // Transforma os dados numa tabela HTML bonitinha
        const html = XLSX.utils.sheet_to_html(worksheet);
        setExcelData(html);
      } catch (erro) {
        console.error("Erro na leitura do Excel:", erro);
        setExcelData("<p class='text-destructive'>Erro ao carregar a planilha. O arquivo pode estar corrompido.</p>");
      } finally {
        setCarregandoExcel(false);
      }
    }
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

  // --- DADOS DO DASHBOARD ---
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

  // --- DADOS DO UPLOAD (Tabela) ---
  const documentosUpload = useMemo(() => acervo.filter((d) => {
    const tipoOk = filtrosUpload.tipos.length === 0 || filtrosUpload.tipos.includes(TIPO_POR_CATEGORIA[d.categoria] ?? "");
    const anoOk = d.ano >= filtrosUpload.anoDe && d.ano <= filtrosUpload.anoAte;
    const nucleoOk = filtrosUpload.nucleo === "Todos" || d.nucleo === filtrosUpload.nucleo;
    return tipoOk && anoOk && nucleoOk;
  }), [filtrosUpload, acervo]);

  // --- DADOS DO EXPLORADOR (Pastas) ---
  const documentosExplorador = useMemo(() => {
    if (pastaSelecionada === "Todos") return acervo;
    return acervo.filter((d) => d.nucleo === pastaSelecionada);
  }, [acervo, pastaSelecionada]);

  const chipsUpload: Chip[] = [
    ...filtrosUpload.tipos.map((t) => ({ id: `tipo-${t}`, label: `Tipo: ${t}`, onRemove: () => setFiltrosUpload(f => ({ ...f, tipos: f.tipos.filter(x => x !== t) })) })),
    ...(filtrosUpload.anoDe !== ANO_MIN || filtrosUpload.anoAte !== ANO_MAX ? [{ id: "periodo", label: filtrosUpload.anoDe === filtrosUpload.anoAte ? `Ano: ${filtrosUpload.anoDe}` : `Período: ${filtrosUpload.anoDe}–${filtrosUpload.anoAte}`, onRemove: () => setFiltrosUpload(f => ({ ...f, anoDe: ANO_MIN, anoAte: ANO_MAX })) }] : []),
    ...(filtrosUpload.nucleo !== "Todos" ? [{ id: "nucleo", label: `Núcleo: ${filtrosUpload.nucleo}`, onRemove: () => setFiltrosUpload(f => ({ ...f, nucleo: "Todos" })) }] : []),
  ];

  // === TELA DE LOGIN (AGORA NO LUGAR CORRETO PARA NÃO QUEBRAR O REACT) ===
  if (!usuarioLogado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-primary">FCJA Docs</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestão Eletrônica de Documentos</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input value={loginInput} onChange={e => setLoginInput(e.target.value)} placeholder="Ex: admin" required />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input 
                  type={mostrarSenha ? "text" : "password"} 
                  value={senhaInput} 
                  onChange={e => setSenhaInput(e.target.value)} 
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {erroLogin && <p className="mt-4 text-sm text-destructive text-center">{erroLogin}</p>}

          <Button type="submit" className="mt-6 w-full">Entrar no Sistema</Button>
        </form>
      </div>
    );
  }

  // === RETORNO DA TELA PRINCIPAL DO SISTEMA (WEB DESKTOP) ===
  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/20">
      
      {/* --- BARRA LATERAL (MENU DO SISTEMA) --- */}
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-slate-950 text-slate-300 shadow-xl">
        <div>
          <div className="flex h-20 items-center border-b border-white/10 px-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">FCJA Docs</h1>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest">Web Desktop</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 p-4">
            <button 
              onClick={() => setAbaAtiva("dashboard")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${abaAtiva === "dashboard" ? "bg-primary text-white" : "hover:bg-white/10 hover:text-white"}`}
            >
              <LayoutDashboard className="h-5 w-5" /> Dashboard Analítico
            </button>
            <button 
              onClick={() => setAbaAtiva("explorador")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${abaAtiva === "explorador" ? "bg-primary text-white" : "hover:bg-white/10 hover:text-white"}`}
            >
              <FolderOpen className="h-5 w-5" /> Explorador de Arquivos
            </button>
            <button 
              onClick={() => setAbaAtiva("upload")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${abaAtiva === "upload" ? "bg-primary text-white" : "hover:bg-white/10 hover:text-white"}`}
            >
              <CloudUpload className="h-5 w-5" /> Central de Upload
            </button>
          </nav>
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-4 px-4 text-xs">
            <p className="text-slate-500">Conectado como:</p>
            <p className="font-semibold text-white">{usuarioLogado}</p>
          </div>
          <button 
            onClick={() => { localStorage.removeItem("fcja_user"); setUsuarioLogado(null); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL (TELAS) --- */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* === TELA 1: DASHBOARD === */}
        {abaAtiva === "dashboard" && (
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

            {/* KPIs do HD e Documentos */}
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
        )}

        {/* === TELA 2: EXPLORADOR DE ARQUIVOS === */}
        {abaAtiva === "explorador" && (
          <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-7xl flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6 shrink-0">
              <h2 className="text-3xl font-semibold tracking-tight">Arquivos Locais</h2>
              <p className="mt-1 text-sm text-muted-foreground">Navegação estruturada: Núcleo {'>'} Ano {'>'} Tipologia. (Duplo clique para abrir)</p>
            </header>
            
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              
              {/* Lado Esquerdo: Árvore de Pastas (Núcleos) */}
              <div className="w-1/3 max-w-xs shrink-0 overflow-y-auto border-r border-border bg-slate-50/50 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Diretórios Raiz</h3>
                <ul className="space-y-1">
                  <li>
                    <button 
                      onClick={() => { setPastaSelecionada("Todos"); setSubPastaAno(null); setSubPastaTipo(null); }} 
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${pastaSelecionada === "Todos" ? "bg-primary/10 font-semibold text-primary" : "text-slate-600 hover:bg-slate-200/50"}`}
                    >
                      <HardDrive className="h-4 w-4 shrink-0" /> Disco Local (C:)
                    </button>
                  </li>
                  {NUCLEOS.filter(n => n !== "Todos").map(nucleo => (
                    <li key={nucleo}>
                      <button 
                        onClick={() => { setPastaSelecionada(nucleo); setSubPastaAno(null); setSubPastaTipo(null); }} 
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${pastaSelecionada === nucleo ? "bg-primary/10 font-semibold text-primary" : "text-slate-600 hover:bg-slate-200/50"}`}
                      >
                        <FolderOpen className={`mt-0.5 h-4 w-4 shrink-0 ${pastaSelecionada === nucleo ? "text-primary" : "text-slate-400"}`} />
                        <span className="line-clamp-2">{nucleo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lado Direito: Navegação Interna */}
              <div className="flex flex-1 flex-col overflow-hidden bg-white">
                
                {/* Barra de Endereço (Breadcrumbs Interativos) */}
                <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600">
                  <button onClick={() => { setPastaSelecionada("Todos"); setSubPastaAno(null); setSubPastaTipo(null); }} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <HardDrive className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">FCJA_Dados</span>
                  </button>
                  
                  {pastaSelecionada !== "Todos" && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      <button onClick={() => { setSubPastaAno(null); setSubPastaTipo(null); }} className={`hover:text-primary transition-colors truncate max-w-[200px] ${!subPastaAno ? "font-semibold text-slate-900" : "font-medium"}`}>
                        {pastaSelecionada}
                      </button>
                    </>
                  )}

                  {subPastaAno && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      <button onClick={() => setSubPastaTipo(null)} className={`hover:text-primary transition-colors ${!subPastaTipo ? "font-semibold text-slate-900" : "font-medium"}`}>
                        {subPastaAno}
                      </button>
                    </>
                  )}

                  {subPastaTipo && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-900 truncate max-w-[150px]">{subPastaTipo}</span>
                    </>
                  )}
                </div>
                
                {/* Tabela Interativa (Pastas ou Arquivos) */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm ring-1 ring-border">
                      <tr className="text-xs font-semibold text-slate-500">
                        <th className="px-6 py-3">Nome</th>
                        <th className="px-6 py-3">Tipologia</th>
                        <th className="px-6 py-3">Ano</th>
                        <th className="px-6 py-3 text-right">Data de Upload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      
                      {/* 1. MOSTRAR PASTAS DOS ANOS (Se só o Núcleo estiver selecionado) */}
                      {pastaSelecionada !== "Todos" && !subPastaAno && (
                        Array.from(new Set(documentosExplorador.map(d => d.ano))).sort((a, b) => b - a).map(ano => (
                          <tr key={ano} onDoubleClick={() => setSubPastaAno(ano)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                            <td className="flex items-center gap-3 px-6 py-3">
                              <Folder className="h-5 w-5 shrink-0 text-blue-400 fill-blue-400/20 transition-transform group-hover:scale-110" />
                              <span className="font-medium text-slate-700 transition-colors group-hover:text-primary">{ano}</span>
                            </td>
                            <td className="px-6 py-3 text-slate-400">Pasta de Arquivos</td>
                            <td className="px-6 py-3 text-slate-400">-</td>
                            <td className="px-6 py-3 text-right text-slate-400">-</td>
                          </tr>
                        ))
                      )}

                      {/* 2. MOSTRAR PASTAS DAS TIPOLOGIAS (Se o Ano estiver selecionado) */}
                      {pastaSelecionada !== "Todos" && subPastaAno && !subPastaTipo && (
                        Array.from(new Set(documentosExplorador.filter(d => d.ano === subPastaAno).map(d => d.categoria))).sort().map(tipo => (
                          <tr key={tipo} onDoubleClick={() => setSubPastaTipo(tipo)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                            <td className="flex items-center gap-3 px-6 py-3">
                              <Folder className="h-5 w-5 shrink-0 text-blue-400 fill-blue-400/20 transition-transform group-hover:scale-110" />
                              <span className="font-medium text-slate-700 transition-colors group-hover:text-primary">{tipo}</span>
                            </td>
                            <td className="px-6 py-3 text-slate-400">Pasta de Arquivos</td>
                            <td className="px-6 py-3 text-slate-500">{subPastaAno}</td>
                            <td className="px-6 py-3 text-right text-slate-400">-</td>
                          </tr>
                        ))
                      )}

                      {/* 3. MOSTRAR OS ARQUIVOS FINAIS (Se for Disco C: ou se tudo estiver selecionado) */}
                      {(pastaSelecionada === "Todos" || (subPastaAno && subPastaTipo)) && (
                        documentosExplorador
                          .filter(d => pastaSelecionada === "Todos" || (d.ano === subPastaAno && d.categoria === subPastaTipo))
                          .map((doc) => (
                            <tr key={doc.id} onDoubleClick={() => abrirDoc(doc)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                              <td className="flex items-center gap-3 px-6 py-3">
                                {doc.ext === "pdf" && <FileText className="h-5 w-5 shrink-0 text-red-500 transition-transform group-hover:scale-110" />}
                                {doc.ext === "xlsx" && <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-500 transition-transform group-hover:scale-110" />}
                                {doc.ext === "docx" && <FileType2 className="h-5 w-5 shrink-0 text-blue-500 transition-transform group-hover:scale-110" />}
                                <span className="font-medium text-slate-700 transition-colors group-hover:text-primary max-w-[280px] truncate" title={doc.nome}>{doc.nome}</span>
                              </td>
                              <td className="px-6 py-3 text-slate-500">{doc.categoria}</td>
                              <td className="px-6 py-3 text-slate-500">{doc.ano}</td>
                              <td className="px-6 py-3 text-right text-slate-500">{doc.upload}</td>
                            </tr>
                          ))
                      )}

                      {/* MENSAGEM VAZIA */}
                      {documentosExplorador.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-24 text-center text-slate-400">
                            <FolderOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
                            Esta pasta está vazia.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* === TELA 3: CENTRAL DE UPLOAD === */}
        {abaAtiva === "upload" && (
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 border-b border-border pb-6">
              <h2 className="text-3xl font-semibold tracking-tight">Central de Upload</h2>
              <p className="mt-1 text-sm text-muted-foreground">Arraste seus arquivos para a nuvem local da FCJA e configure os metadados em lote.</p>
            </header>
            
            <div className="space-y-6">
              {/* BOX DE ARRASTAR ARQUIVOS */}
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastando(false); receberArquivos(e.dataTransfer.files); }}
                className={`flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-12 text-center transition-all ${arrastando ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-white"}`}
              >
                <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={(e) => { receberArquivos(e.target.files); e.target.value = ""; }} />
                <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-2">
                  <CloudUpload className="h-8 w-8" />
                </span>
                <p className="text-lg font-medium text-foreground">Arraste e solte seus arquivos aqui</p>
                <p className="text-sm text-muted-foreground mb-4">Arquivos PDF, Word ou Excel (até 25 MB)</p>
                <Button onClick={() => inputRef.current?.click()}>Selecionar arquivos no PC</Button>
              </div>

              {erros.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  {erros.map((e) => <p key={e} className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {e}</p>)}
                </div>
              )}

              {/* LISTA DE PENDENTES */}
              {pendentes.length > 0 && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Checkbox checked={pendentes.every((p) => p.sel)} onCheckedChange={(v) => alternarTodos(v === true)} disabled={enviando} />
                        Selecionar todos
                      </label>
                      <span className="text-sm text-muted-foreground">{selecionados.length}/{pendentes.length} marcados</span>
                    </div>
                    <ul className="max-h-96 space-y-2 overflow-y-auto pr-2">
                      {pendentes.map((p) => (
                        <li key={p.id} className={`rounded-xl border p-3 transition-colors ${p.editado ? "bg-emerald-50/50 border-emerald-200" : "bg-muted/30 border-transparent"}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox checked={p.sel} onCheckedChange={() => alternarSel(p.id)} disabled={enviando} />
                            <span className="min-w-0 flex-1 truncate font-medium">{p.file.name}</span>
                            <span className="text-xs text-muted-foreground">{formatarTamanho(p.file.size)}</span>
                            <button onClick={() => removerPendente(p.id)} disabled={enviando} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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
                      <div className="space-y-2"><Label>Data</Label><Input type="date" value={cadData} onChange={(e) => { setCadData(e.target.value); aplicarCampos({ data: e.target.value }); }} /></div>
                      <div className="space-y-2"><Label>Ano</Label>
                        <Select value={String(new Date(`${cadData}T12:00:00`).getFullYear())} onValueChange={(v) => { const nova = `${v}${cadData.slice(4)}`; setCadData(nova); aplicarCampos({ data: nova }); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ANOS.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Tipologia</Label>
                        <Select value={cadTipo} onValueChange={(v) => { setCadTipo(v); aplicarCampos({ tipo: v }); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Núcleo</Label>
                        <Select value={cadNucleo} onValueChange={(v) => { setCadNucleo(v); aplicarCampos({ nucleo: v }); }}>
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

            {/* TABELA COM FILTROS INDEPENDENTES */}
            <div className="mt-12 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Gerenciamento do Acervo</h3>
                  <p className="text-sm text-muted-foreground">Visualize, edite ou exporte os documentos já cadastrados no banco de dados.</p>
                </div>
                
                {/* Botões lado a lado */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={abrirPastaWindows} className="gap-2 bg-white">
                    <FolderOpen className="h-4 w-4" /> Abrir Pasta no Windows
                  </Button>
                  <Button variant="outline" onClick={() => setModalFiltrosUpload(true)} className="gap-2 bg-white">
                    <SlidersHorizontal className="h-4 w-4" /> Filtrar Tabela
                  </Button>
                </div>
              </div>
              
              <FilterChips chips={chipsUpload} onLimpar={() => setFiltrosUpload(INICIAL)} />
              <DocumentTable docs={documentosUpload} onView={abrirDoc} onDownload={baixarDoc} onDelete={removerDoc} onDeleteMany={removerDocs} onEdit={editarDoc} />
            </div>
          </div>
        )}
      </main>

      {/* === MODAIS DE FILTROS INDEPENDENTES === */}
      
      {/* 1. Modal do Dashboard */}
      <Dialog open={modalFiltrosDash} onOpenChange={setModalFiltrosDash}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Filtros do Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
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

      {/* 2. Modal da Tabela de Upload */}
      <Dialog open={modalFiltrosUpload} onOpenChange={setModalFiltrosUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Filtros da Tabela</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
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

      {/* === MODAL VISUALIZADOR DE PDF E PLANILHAS === */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="flex max-h-[95vh] w-[min(70rem,96vw)] max-w-none flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="shrink-0 border-b border-border p-4 text-left">
              <DialogTitle className="flex items-center gap-2">
                <span className="truncate">{viewDoc?.nome}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-[60vh] flex-1 overflow-auto bg-muted/30 p-4">
              {viewDoc?.ext === "pdf" && (<iframe src={viewDoc.url} className="h-full min-h-[70vh] w-full rounded-md border bg-white shadow-sm" title="Visualizador" />)}
              {viewDoc?.ext === "xlsx" && (
                carregandoExcel ? <div className="flex h-full min-h-[40vh] items-center justify-center animate-pulse">Lendo planilha...</div>
                : <div className="rounded-md border bg-white p-4 shadow-sm"><style>{`.planilha-viewer table { border-collapse: collapse; min-width: 100%; font-size: 13px; } .planilha-viewer td, .planilha-viewer th { border: 1px solid #e2e8f0; padding: 6px 12px; } .planilha-viewer tr:nth-child(even) { background-color: #f8fafc; } .planilha-viewer tr:first-child { font-weight: bold; background-color: #f1f5f9; }`}</style><div className="planilha-viewer overflow-auto" dangerouslySetInnerHTML={{ __html: excelData }} /></div>
              )}
            </div>
          </DialogContent>
      </Dialog>

    </div>
  );
}