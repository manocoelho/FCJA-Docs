import { createFileRoute } from "@tanstack/react-router";
import { PainelAdmin } from "@/components/ged/PainelAdmin";
import { TelaLogin } from "@/components/ged/TelaLogin";
import { TelaDashboard } from "@/components/ged/TelaDashboard";
import { TelaExplorador } from "@/components/ged/TelaExplorador";
import { TelaUpload } from "@/components/ged/TelaUpload";
import { TelaAuditoriaSigad } from "@/components/ged/TelaAuditoriaSigad";
import { useState } from "react";
import { toast } from "sonner";
import {
  CloudUpload,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Library,
  Shield,
  ExternalLink,
  Fingerprint,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/components/ged/data";
import { API_BASE_URL, resolveUrl } from "@/lib/api";
import { useAcervoSigad } from "@/hooks/useAcervoSigad";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SIGAD FCJA — Gestão Arquivística de Documentos (e-ARQ Brasil v2)" },
      {
        name: "description",
        content:
          "SIGAD da Fundação Casa de José Américo: captura arquivística, fixidade SHA-256 (PREMIS), trilha de auditoria e-ARQ Brasil v2 e dashboards.",
      },
      { property: "og:title", content: "SIGAD FCJA — Gestão Arquivística de Documentos" },
      {
        property: "og:description",
        content:
          "Sistema Informatizado de Gestão Arquivística de Documentos da FCJA (e-ARQ Brasil v2).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='%233b82f6'/><path d='m16 6 4 14' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M12 6v14' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M8 8v12' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M4 4v16' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>",
      },
    ],
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

  const [abaAtiva, setAbaAtiva] = useState<
    "dashboard" | "explorador" | "upload" | "auditoria" | "permissoes"
  >("dashboard");

  // Estados do Visualizador
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [dadosPlanilha, setDadosPlanilha] = useState<{ colunas: string[]; linhas: any[] } | null>(
    null
  );
  const [carregandoView, setCarregandoView] = useState(false);

  // Hook isolado de estado e regras de negócio do Acervo SIGAD (SRP)
  const {
    acervo,
    sysStatus,
    recarregarDocumentos,
    adicionarDocumentosCapturados,
    removerDoc,
    removerDocs,
    editarDoc,
    auditarFixidadeDoc,
  } = useAcervoSigad(usuarioLogado, usuarioPapel);

  async function abrirDoc(doc: Doc) {
    setViewDoc(doc);
    setDadosPlanilha(null);

    if (doc.ext === "xlsx") {
      setCarregandoView(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/visualizar-planilha/${doc.id}`);
        const data = await res.json();

        if (data.colunas) {
          setDadosPlanilha(data);
        } else {
          toast.error("Não foi possível abrir a planilha", { description: data.erro });
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
    a.href = resolveUrl(doc.url);
    a.download = doc.nome;
    a.click();
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
              <h1 className="text-xl font-bold tracking-tight text-white">SIGAD FCJA</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
                e-ARQ Brasil v2
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 p-4">
            <button
              onClick={() => setAbaAtiva("dashboard")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                abaAtiva === "dashboard"
                  ? "bg-primary text-white"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" /> Dashboard Analítico
            </button>
            <button
              onClick={() => setAbaAtiva("explorador")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                abaAtiva === "explorador"
                  ? "bg-primary text-white"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <FolderOpen className="h-5 w-5" /> Explorador do Acervo
            </button>
            <button
              onClick={() => setAbaAtiva("upload")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                abaAtiva === "upload"
                  ? "bg-primary text-white"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <CloudUpload className="h-5 w-5" /> Captura & Acervo
            </button>
            <button
              onClick={() => setAbaAtiva("auditoria")}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                abaAtiva === "auditoria"
                  ? "bg-primary text-white"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Fingerprint className="h-5 w-5 text-blue-400" /> Auditoria & Fixidade
            </button>
            {usuarioPapel === "admin" && (
              <button
                onClick={() => setAbaAtiva("permissoes")}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  abaAtiva === "permissoes"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-white/10 hover:text-white"
                }`}
              >
                <Shield className="h-5 w-5 text-emerald-400" /> Gerenciar Acessos
              </button>
            )}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 px-4 text-xs">
            <p className="text-slate-500">Agente conectado:</p>
            <p className="font-semibold text-white">{usuarioLogado}</p>
            {usuarioPapel && (
              <span className="mt-0.5 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-blue-300">
                {usuarioPapel}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("fcja_user");
              sessionStorage.removeItem("fcja_role");
              setUsuarioLogado(null);
              setUsuarioPapel(null);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {abaAtiva === "dashboard" && <TelaDashboard acervo={acervo} sysStatus={sysStatus} />}
        {abaAtiva === "explorador" && <TelaExplorador acervo={acervo} onAbrirDoc={abrirDoc} />}
        {abaAtiva === "upload" && (
          <TelaUpload
            acervo={acervo}
            usuarioLogado={usuarioLogado}
            usuarioPapel={usuarioPapel}
            onDocsUploaded={adicionarDocumentosCapturados}
            onView={abrirDoc}
            onDownload={baixarDoc}
            onDelete={removerDoc}
            onDeleteMany={removerDocs}
            onEdit={editarDoc}
            onVerifyFixity={auditarFixidadeDoc}
          />
        )}
        {abaAtiva === "auditoria" && (
          <TelaAuditoriaSigad
            usuarioLogado={usuarioLogado}
            usuarioPapel={usuarioPapel}
            onFixidadeAtualizada={recarregarDocumentos}
          />
        )}
        {abaAtiva === "permissoes" && usuarioPapel === "admin" && <PainelAdmin />}
      </main>

      <Dialog open={viewDoc !== null} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="flex h-[85vh] max-w-6xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewDoc?.numeroProtocolo && (
                <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs text-blue-700">
                  {viewDoc.numeroProtocolo}
                </span>
              )}
              <span className="truncate">{viewDoc?.nome}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden rounded-md border bg-slate-50">
            {viewDoc?.ext === "pdf" ? (
              <iframe
                src={resolveUrl(viewDoc?.url || "")}
                className="h-full w-full border-0"
                title="Visualizador PDF"
              />
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
                        <th
                          key={idx}
                          className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPlanilha.linhas.map((linha, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {dadosPlanilha.colunas.map((col, idx) => (
                          <td
                            key={idx}
                            className="whitespace-nowrap border-b border-r border-slate-100 px-4 py-2 text-slate-600"
                          >
                            {linha[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center gap-4 text-slate-500">
                <p>Este formato ({viewDoc?.ext}) não possui visualização direta no navegador.</p>
                <Button
                  variant="outline"
                  onClick={() => viewDoc && baixarDoc(viewDoc)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Baixar Arquivo para Visualizar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
