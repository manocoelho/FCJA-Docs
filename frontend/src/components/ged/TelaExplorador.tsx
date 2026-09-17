import { useState, useMemo } from "react";
import { Folder, FolderOpen, HardDrive, ChevronRight, FileText, FileSpreadsheet, FileType2, Image as ImageIcon } from "lucide-react";
import { NUCLEOS, type Doc } from "@/components/ged/data";

interface TelaExploradorProps {
  acervo: Doc[];
  modoStorage: "LOCAL" | "EXTERNO";
  onAbrirDoc: (doc: Doc) => void;
}

export function TelaExplorador({ acervo, modoStorage, onAbrirDoc }: TelaExploradorProps) {
  const [pastaSelecionada, setPastaSelecionada] = useState<string>("Todos");
  const [subPastaAno, setSubPastaAno] = useState<number | null>(null);
  const [subPastaTipo, setSubPastaTipo] = useState<string | null>(null);

  const documentosExplorador = useMemo(() => {
    if (pastaSelecionada === "Todos") return acervo;
    return acervo.filter((d) => d.nucleo === pastaSelecionada);
  }, [acervo, pastaSelecionada]);

  return (
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
                <HardDrive className="h-4 w-4 shrink-0" /> 
                {modoStorage === "EXTERNO" ? "Armazenamento Externo" : "Disco Local (C:)"}
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
                
                {/* 1. MOSTRAR PASTAS DOS ANOS */}
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

                {/* 2. MOSTRAR PASTAS DAS TIPOLOGIAS */}
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

                {/* 3. MOSTRAR OS ARQUIVOS FINAIS */}
                {(pastaSelecionada === "Todos" || (subPastaAno && subPastaTipo)) && (
                  documentosExplorador
                    .filter(d => pastaSelecionada === "Todos" || (d.ano === subPastaAno && d.categoria === subPastaTipo))
                    .map((doc) => (
                      <tr key={doc.id} onDoubleClick={() => onAbrirDoc(doc)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                        <td className="flex items-center gap-3 px-6 py-3">
                          {doc.ext === "pdf" && <FileText className="h-5 w-5 shrink-0 text-red-500 transition-transform group-hover:scale-110" />}
                          {doc.ext === "xlsx" && <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-500 transition-transform group-hover:scale-110" />}
                          {doc.ext === "docx" && <FileType2 className="h-5 w-5 shrink-0 text-blue-500 transition-transform group-hover:scale-110" />}
                          {doc.ext === "tiff" && <ImageIcon className="h-5 w-5 shrink-0 text-orange-500 transition-transform group-hover:scale-110" />}
                          <span className="font-medium text-slate-700 transition-colors group-hover:text-primary max-w-[280px] truncate" title={doc.nome}>{doc.nome}</span>
                        </td>
                        <td className="px-6 py-3 text-slate-500">{doc.categoria}</td>
                        <td className="px-6 py-3 text-slate-500">{doc.ano}</td>
                        <td className="px-6 py-3 text-right text-slate-500">{doc.upload}</td>
                      </tr>
                    ))
                )}

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
  );
}