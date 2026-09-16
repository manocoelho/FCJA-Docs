import { createFileRoute } from "@tanstack/react-router";
import { PainelAdmin } from "@/components/ged/PainelAdmin";
import { TelaLogin } from "@/components/ged/TelaLogin";
import { TelaDashboard } from "@/components/ged/TelaDashboard";
import { TelaExplorador } from "@/components/ged/TelaExplorador";
import { TelaUpload } from "@/components/ged/TelaUpload";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CloudUpload, FolderOpen, LayoutDashboard, LogOut, Library, Shield
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOCUMENTOS } from "@/components/ged/data";
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
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='%233b82f6'/><path d='m16 6 4 14' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M12 6v14' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M8 8v12' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M4 4v16' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>"
      }
    ]
  }),
  component: Index,
});

function Index() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("fcja_user");
    return null;
  });

  const [usuarioPapel, setUsuarioPapel] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("fcja_role");
    return null;
  });

  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "explorador" | "upload" | "permissoes">("dashboard");
  const [modoStorage, setModoStorage] = useState<"LOCAL" | "EXTERNO">("LOCAL");
  
  const [sysStatus, setSysStatus] = useState<{ total_bytes: number; usado_bytes: number; livre_bytes: number; acervo_bytes: number } | null>(null);

  // Estados do Visualizador
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [dadosPlanilha, setDadosPlanilha] = useState<{ colunas: string[]; linhas: any[] } | null>(null);
  const [carregandoView, setCarregandoView] = useState(false);

  const [documentosApi, setDocumentosApi] = useState<Doc[]>(DOCUMENTOS);
  const [enviados, setEnviados] = useState<Doc[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [edicoes, setEdicoes] = useState<Record<string, { nome: string; categoria: string; ano: number; nucleo: string }>>({});

  function atualizarStatusHD() {
    fetch("http://localhost:8000/api/sistema/status")
      .then(res => res.json())
      .then(data => { 
        if (data.sucesso) {
          setSysStatus(data);
          setModoStorage(data.modo);
        }
      })
      .catch(err => console.error("Erro ao ler HD:", err));
  }

  useEffect(() => {
    atualizarStatusHD();
  }, []);

  async function alternarArmazenamento(novoModo: "LOCAL" | "EXTERNO") {
    if (modoStorage === novoModo) return;
    const toastId = toast.loading(`Iniciando conexão com o disco ${novoModo}...`);
    
    try {
      const res = await fetch("http://localhost:8000/api/sistema/armazenamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: novoModo })
      });
      const data = await res.json();
      
      if (data.sucesso) {
        setModoStorage(data.modo);
        toast.success("Banco de Dados transferido!", { id: toastId, description: `Lendo informações da pasta: ${data.pasta}` });
        
        const resDocs = await fetch("http://localhost:8000/api/documentos");
        const docs = await resDocs.json();
        setDocumentosApi(docs);
        setEnviados([]); 
        
        const resStatus = await fetch("http://localhost:8000/api/sistema/status");
        const statusData = await resStatus.json();
        if(statusData.sucesso) setSysStatus(statusData);
        
      } else {
        toast.error("Falha na transição", { id: toastId, description: data.erro });
      }
    } catch (e) {
      toast.error("Erro de Rede", { id: toastId, description: "O servidor Backend não respondeu." });
    }
  }

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

  const acervo = useMemo(
    () =>
      [...enviados, ...documentosApi]
        .filter((d) => !removidos.includes(d.id))
        .map((d) => (edicoes[d.id] ? { ...d, ...edicoes[d.id]! } : d)),
    [enviados, removidos, edicoes, documentosApi],
  );

  async function abrirDoc(doc: Doc) {
    setViewDoc(doc);
    setDadosPlanilha(null);
    
    if (doc.ext === "xlsx") {
      setCarregandoView(true);
      try {
        const res = await fetch(`http://localhost:8000/api/visualizar-planilha/${doc.id}`);
        const data = await res.json();
        if (data.colunas) {
          setDadosPlanilha(data);
        } else {
          toast.error("Erro ao ler dados da planilha.");
        }
      } catch (e) {
        toast.error("Falha ao se conectar com o leitor Python.");
      } finally {
        setCarregandoView(false);
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
      const res = await fetch(`http://localhost:8000/api/documentos/${doc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao apagar no backend");

      setDocumentosApi((prev) => prev.filter((d) => d.id !== doc.id));
      setEnviados((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Documento removido definitivamente", { description: doc.nome });
      atualizarStatusHD();
    } catch (erro) {
      console.error(erro);
      toast.error("Erro ao remover", { description: "Não foi possível apagar o documento." });
    }
  }

  async function removerDocs(lista: Doc[]) {
    if (lista.length === 0) return;
    try {
      await Promise.all(
        lista.map(doc => fetch(`http://localhost:8000/api/documentos/${doc.id}`, { method: "DELETE" }))
      );
      const ids = lista.map((d) => d.id);
      setDocumentosApi((prev) => prev.filter((d) => !ids.includes(d.id)));
      setEnviados((prev) => prev.filter((d) => !ids.includes(d.id)));

      toast.success(`${lista.length} documento(s) removido(s) definitivamente`, {
        description: lista.length <= 3 ? lista.map((d) => d.nome).join(", ") : `${lista.slice(0, 3).map((d) => d.nome).join(", ")} e mais ${lista.length - 3}.`,
      });
      atualizarStatusHD();
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
      const res = await fetch(`http://localhost:8000/api/documentos/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      if (!res.ok) throw new Error("Falha ao atualizar no backend");
      
      const respostaApi = await res.json();
      setDocumentosApi((prev) => 
        prev.map((d) => (d.id === doc.id ? { ...d, ...dados, url: respostaApi.url || d.url } : d))
      );
      toast.success("Documento atualizado", { description: dados.nome });
    } catch (erro) {
      console.error(erro);
      toast.error("Erro na atualização", { description: "Não foi possível editar o documento." });
    }
  }

  if (!usuarioLogado) {
    return (
      <TelaLogin 
        onLoginSuccess={(nome, papel) => {
          setUsuarioLogado(nome);
          setUsuarioPapel(papel);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/20">
      
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-slate-950 text-slate-300 shadow-xl">
        <div>
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-primary text-white shadow-lg shadow-primary/20">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">FCJA Docs</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Acervo Digital
              </p>
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
            {usuarioPapel === "admin" && (
              <button 
                onClick={() => setAbaAtiva("permissoes")}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${abaAtiva === "permissoes" ? "bg-emerald-600 text-white" : "hover:bg-white/10 hover:text-white"}`}
              >
                <Shield className="h-5 w-5 text-emerald-400" /> Gerenciar Acessos
              </button>
            )}
          </nav>
        </div>
        
        <div className="border-t border-white/10 p-4">
          <div className="mb-6 rounded-xl bg-white/5 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Banco de Dados Ativo</p>
            <div className="flex rounded-lg bg-slate-950 p-1 text-xs">
              <button
                onClick={() => alternarArmazenamento("LOCAL")}
                className={`flex-1 rounded-md py-2 text-center font-medium transition-all ${modoStorage === "LOCAL" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                Disco (C:)
              </button>
              <button
                onClick={() => alternarArmazenamento("EXTERNO")}
                className={`flex-1 rounded-md py-2 text-center font-medium transition-all ${modoStorage === "EXTERNO" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                HD Externo
              </button>
            </div>
          </div>
          <div className="mb-4 px-4 text-xs">
            <p className="text-slate-500">Conectado como:</p>
            <p className="font-semibold text-white">{usuarioLogado}</p>
          </div>
          <button 
            onClick={() => { sessionStorage.removeItem("fcja_user"); sessionStorage.removeItem("fcja_role"); setUsuarioLogado(null); setUsuarioPapel(null); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {abaAtiva === "dashboard" && <TelaDashboard acervo={acervo} sysStatus={sysStatus} />}
        {abaAtiva === "explorador" && <TelaExplorador acervo={acervo} modoStorage={modoStorage} onAbrirDoc={abrirDoc} />}
        {abaAtiva === "upload" && (
          <TelaUpload 
            acervo={acervo} 
            onDocsUploaded={(novos) => {
              setDocumentosApi((prev) => [...novos, ...prev]);
              atualizarStatusHD();
            }} 
            onView={abrirDoc} 
            onDownload={baixarDoc} 
            onDelete={removerDoc} 
            onDeleteMany={removerDocs} 
            onEdit={editarDoc} 
          />
        )}
        {abaAtiva === "permissoes" && usuarioPapel === "admin" && <PainelAdmin />}
      </main>

      <Dialog open={viewDoc !== null} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="flex h-[85vh] max-w-6xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="truncate">{viewDoc?.nome}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden rounded-md border bg-slate-50">
            {viewDoc?.ext === "pdf" ? (
              <iframe src={viewDoc?.url} className="h-full w-full border-0" title="Visualizador PDF" />
            ) : carregandoView ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <span className="animate-pulse">Processando dados com o Python...</span>
              </div>
            ) : dadosPlanilha ? (
              <div className="h-full overflow-auto p-4">
                <table className="w-full text-left text-sm border-collapse bg-white shadow-sm ring-1 ring-slate-200">
                  <thead className="sticky top-0 bg-slate-100 shadow-sm">
                    <tr>
                      {dadosPlanilha.colunas.map((col, idx) => (
                        <th key={idx} className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPlanilha.linhas.map((linha, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {dadosPlanilha.colunas.map((col, idx) => (
                          <td key={idx} className="whitespace-nowrap border-b border-r border-slate-100 px-4 py-2 text-slate-600">{linha[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                Este formato ({viewDoc?.ext}) ainda não possui visualização nativa na plataforma.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}