import { useState } from "react";
import {
  Archive,
  ArrowUpLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType2,
  Fingerprint,
  Folder,
  FolderKanban,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  LayoutList,
  Library,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NUCLEOS, SIGLA_POR_NUCLEO, type Doc } from "@/components/ged/data";
import { ModalMetadadosEarq } from "@/components/ged/ModalMetadadosEarq";
import { PainelInspecaoExplorador } from "@/components/ged/PainelInspecaoExplorador";
import {
  useExploradorSigad,
  type ItemPastaExplorador,
  type OrdenacaoExplorador,
  type RecorteCicloVital,
} from "@/hooks/useExploradorSigad";
import type { AbaSistemaSigad } from "@/hooks/useDashboardSigad";
import {
  formatarHashCurto,
  formatarTamanho,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";

interface TelaExploradorProps {
  acervo: Doc[];
  onAbrirDoc: (doc: Doc) => void;
  onBaixarDoc?: ((doc: Doc) => void) | undefined;
  onVerifyFixity?: ((doc: Doc) => Promise<unknown>) | undefined;
  onNavegarAba?: ((aba: AbaSistemaSigad) => void) | undefined;
}

export function TelaExplorador({
  acervo,
  onAbrirDoc,
  onBaixarDoc,
  onVerifyFixity,
  onNavegarAba,
}: TelaExploradorProps) {
  const [fichaCompletaDoc, setFichaCompletaDoc] = useState<Doc | null>(null);

  const {
    modoNavegacao,
    alterarModoNavegacao,
    pastaNucleo,
    setPastaNucleo,
    subPastaAno,
    setSubPastaAno,
    subPastaTipo,
    setSubPastaTipo,
    escopoAtividadePcd,
    setEscopoAtividadePcd,
    classePcdSelecionada,
    setClassePcdSelecionada,
    filtroStatusDossie,
    setFiltroStatusDossie,
    dossieSelecionadoCodigo,
    setDossieSelecionadoCodigo,
    recorteCiclo,
    setRecorteCiclo,
    subirNivel,
    podeSubirNivel,
    breadcrumbs,
    abrirDossieNoExplorador,
    abrirClassePcdNoExplorador,
    termoBusca,
    setTermoBusca,
    escopoBuscaGlobal,
    setEscopoBuscaGlobal,
    achatarSubpastas,
    setAchatarSubpastas,
    filtroFaseRapido,
    setFiltroFaseRapido,
    filtroAcessoRapido,
    setFiltroAcessoRapido,
    filtroExtensaoRapido,
    setFiltroExtensaoRapido,
    ordenacao,
    setOrdenacao,
    modoVisualizacao,
    setModoVisualizacao,
    limparFiltrosRapidos,
    possuiFiltrosRapidosAtivos,
    pastasVisiveis,
    documentosVisiveis,
    documentosFiltrados,
    exibirDocumentosNoNivelAtual,
    resumoEscopoAtual,
    classesPcdConsolidadas,
    dossiesConsolidados,
    sincronizandoContexto,
    sincronizarEstruturaSigad,
    docSelecionado,
    docSelecionadoId,
    setDocSelecionadoId,
    painelInspecaoAberto,
    setPainelInspecaoAberto,
    classePcdAtual,
    dossieAtual,
  } = useExploradorSigad(acervo);

  const rotuloEscopoAtual =
    breadcrumbs[breadcrumbs.length - 1]?.rotulo || "Acervo Completo FCJA";

  function renderIconeExtensao(ext: Doc["ext"], tamanhoClasse = "h-5 w-5") {
    switch (ext) {
      case "pdf":
        return <FileText className={`${tamanhoClasse} shrink-0 text-red-500`} />;
      case "xlsx":
        return (
          <FileSpreadsheet className={`${tamanhoClasse} shrink-0 text-emerald-600`} />
        );
      case "docx":
        return <FileType2 className={`${tamanhoClasse} shrink-0 text-blue-600`} />;
      case "tiff":
        return <ImageIcon className={`${tamanhoClasse} shrink-0 text-orange-500`} />;
      default:
        return <FileText className={`${tamanhoClasse} shrink-0 text-slate-500`} />;
    }
  }

  function estiloTemaPasta(cor: ItemPastaExplorador["corTema"]) {
    switch (cor) {
      case "purple":
        return {
          iconeBg: "bg-purple-50 text-purple-600 ring-1 ring-purple-200/70",
          badge: "bg-purple-100 text-purple-800",
          bordaHover: "hover:border-purple-300",
        };
      case "emerald":
        return {
          iconeBg: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70",
          badge: "bg-emerald-100 text-emerald-800",
          bordaHover: "hover:border-emerald-300",
        };
      case "amber":
        return {
          iconeBg: "bg-amber-50 text-amber-600 ring-1 ring-amber-200/70",
          badge: "bg-amber-100 text-amber-900",
          bordaHover: "hover:border-amber-300",
        };
      case "teal":
        return {
          iconeBg: "bg-teal-50 text-teal-600 ring-1 ring-teal-200/70",
          badge: "bg-teal-100 text-teal-800",
          bordaHover: "hover:border-teal-300",
        };
      case "slate":
        return {
          iconeBg: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
          badge: "bg-slate-100 text-slate-700",
          bordaHover: "hover:border-slate-300",
        };
      case "blue":
      default:
        return {
          iconeBg: "bg-blue-50 text-blue-600 ring-1 ring-blue-200/70",
          badge: "bg-blue-100 text-blue-800",
          bordaHover: "hover:border-blue-300",
        };
    }
  }

  return (
    <>
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 1. CABEÇALHO EXECUTIVO DO EXPLORADOR ARQUIVÍSTICO */}
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Explorador Arquivístico do Acervo
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Navegação multinível por Fundos e Núcleos Produtores, Plano de Classificação
              (PCD/TTD), Unidades de Arquivamento (Dossiês) e Ciclo Vital.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Fixidade SHA-256: {resumoEscopoAtual.taxaFixidade}% Íntegra
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={sincronizarEstruturaSigad}
              disabled={sincronizandoContexto}
              className="h-8 gap-1.5 bg-white text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${sincronizandoContexto ? "animate-spin" : ""}`}
              />
              Sincronizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPainelInspecaoAberto((v) => !v)}
              className={`h-8 gap-1.5 text-xs ${
                painelInspecaoAberto
                  ? "border-blue-200 bg-blue-50/60 text-blue-700"
                  : "bg-white text-slate-700"
              }`}
            >
              {painelInspecaoAberto ? (
                <>
                  <PanelRightClose className="h-3.5 w-3.5" />
                  Ocultar Inspetor
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  Mostrar Inspetor
                </>
              )}
            </Button>
          </div>
        </header>

        {/* 2. BARRA DE PERSPECTIVAS DE NAVEGAÇÃO ARQUIVÍSTICA */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white p-1.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => alterarModoNavegacao("nucleo")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                modoNavegacao === "nucleo"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Library className="h-3.5 w-3.5 text-blue-400" />
              1. Por Núcleo Produtor (Fundo)
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  modoNavegacao === "nucleo"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {NUCLEOS.length - 1}
              </span>
            </button>

            <button
              type="button"
              onClick={() => alterarModoNavegacao("pcd")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                modoNavegacao === "pcd"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              2. Por Plano de Classificação (PCD & TTD)
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  modoNavegacao === "pcd"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {classesPcdConsolidadas.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => alterarModoNavegacao("dossies")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                modoNavegacao === "dossies"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />
              3. Por Dossiês & Processos (Unidades)
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  modoNavegacao === "dossies"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {dossiesConsolidados.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => alterarModoNavegacao("ciclo_vital")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                modoNavegacao === "ciclo_vital"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
              4. Por Ciclo Vital, OAIS & Sigilo
            </button>
          </div>

          {/* Alternador Rápido: Agrupar em Pastas vs Achatar Todos os Documentos */}
          <div className="flex items-center gap-2 pr-1">
            <button
              type="button"
              onClick={() => setAchatarSubpastas((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                achatarSubpastas
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
              title="Exibe diretamente todos os documentos do escopo atual sem precisar entrar em cada subpasta"
            >
              <Sparkles className="h-3 w-3" />
              {achatarSubpastas ? "Visão Direta (Sem Subpastas)" : "Exibir Todos do Nível"}
            </button>
          </div>
        </div>

        {/* 3. BARRA DE PESQUISA INTEGRADA, FILTROS RÁPIDOS E MODO DE EXIBIÇÃO */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-2xs">
          {/* Busca Instantânea */}
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Pesquisar por Protocolo NUP, Título, Autor, Classe PCD, Dossiê ou Hash SHA-256..."
                className="h-9 pr-8 pl-9 text-xs"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {termoBusca.trim() && (
              <button
                type="button"
                onClick={() => setEscopoBuscaGlobal((v) => !v)}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  escopoBuscaGlobal
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }`}
              >
                {escopoBuscaGlobal ? "Escopo: Todo o Acervo" : "Escopo: Pasta Atual"}
              </button>
            )}
          </div>

          {/* Filtros Rápidos e Ordenação */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filtroFaseRapido} onValueChange={setFiltroFaseRapido}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="Fase TTD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Fases</SelectItem>
                <SelectItem value="CORRENTE">1ª Idade: Corrente</SelectItem>
                <SelectItem value="INTERMEDIARIA">2ª Idade: Intermed.</SelectItem>
                <SelectItem value="PERMANENTE">3ª Idade: Permanente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroAcessoRapido} onValueChange={setFiltroAcessoRapido}>
              <SelectTrigger className="h-9 w-[145px] text-xs">
                <SelectValue placeholder="Acesso LAI/LGPD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Acessos</SelectItem>
                <SelectItem value="OSTENSIVO">Ostensivo (Livre)</SelectItem>
                <SelectItem value="RESTRITO_LGPD">Restrito (LGPD)</SelectItem>
                <SelectItem value="SIGILOSO_LAI">Sigiloso (LAI)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroExtensaoRapido} onValueChange={setFiltroExtensaoRapido}>
              <SelectTrigger className="h-9 w-[125px] text-xs">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todos Formatos</SelectItem>
                <SelectItem value="pdf">PDF / PDF-A</SelectItem>
                <SelectItem value="tiff">TIFF (Matriz)</SelectItem>
                <SelectItem value="xlsx">Planilha XLSX</SelectItem>
                <SelectItem value="docx">Texto DOCX</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={ordenacao}
              onValueChange={(v) => setOrdenacao(v as OrdenacaoExplorador)}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="protocolo">Protocolo SIGAD</SelectItem>
                <SelectItem value="nome_asc">Título (A → Z)</SelectItem>
                <SelectItem value="nome_desc">Título (Z → A)</SelectItem>
                <SelectItem value="ano_desc">Ano (Mais recente)</SelectItem>
                <SelectItem value="ano_asc">Ano (Mais antigo)</SelectItem>
                <SelectItem value="tamanho_desc">Maior Tamanho</SelectItem>
                <SelectItem value="classe_pcd">Classe PCD</SelectItem>
              </SelectContent>
            </Select>

            {possuiFiltrosRapidosAtivos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltrosRapidos}
                className="h-9 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Limpar
              </Button>
            )}

            {/* Alternador Lista vs Grade */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setModoVisualizacao("lista")}
                className={`rounded-md p-1.5 transition-colors ${
                  modoVisualizacao === "lista"
                    ? "bg-white text-primary shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em Lista Detalhada"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao("grade")}
                className={`rounded-md p-1.5 transition-colors ${
                  modoVisualizacao === "grade"
                    ? "bg-white text-primary shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em Grade de Cartões"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. ÁREA PRINCIPAL DO EXPLORADOR (Árvore Lateral + Navegador Central + Inspetor Direito) */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {/* 4.1 COLUNA ESQUERDA: ÁRVORE DE NAVEGAÇÃO CONTEXTUAL */}
          <div className="w-64 shrink-0 overflow-y-auto border-r border-border bg-slate-50/60 p-3.5 xl:w-72">
            {/* ÁRVORE MODO 1: NÚCLEO PRODUTOR */}
            {modoNavegacao === "nucleo" && (
              <>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Fundos & Núcleos FCJA
                  </h3>
                  <span className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                    {acervo.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setPastaNucleo("Todos");
                        setSubPastaAno(null);
                        setSubPastaTipo(null);
                        setDocSelecionadoId(null);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        pastaNucleo === "Todos"
                          ? "bg-primary text-white font-semibold shadow-2xs"
                          : "text-slate-700 hover:bg-slate-200/60"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <HardDrive className="h-3.5 w-3.5 shrink-0" />
                        Todos os Núcleos (Raiz)
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          pastaNucleo === "Todos"
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {acervo.length}
                      </span>
                    </button>
                  </li>

                  {NUCLEOS.filter((n) => n !== "Todos").map((nucleo) => {
                    const qtd = acervo.filter((d) => d.nucleo === nucleo).length;
                    const ativo = pastaNucleo === nucleo;
                    const siglaCurta =
                      SIGLA_POR_NUCLEO[nucleo]?.split("_").pop() || "FCJA";
                    return (
                      <li key={nucleo}>
                        <button
                          type="button"
                          onClick={() => {
                            setPastaNucleo(nucleo);
                            setSubPastaAno(null);
                            setSubPastaTipo(null);
                            setDocSelecionadoId(null);
                          }}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                            ativo
                              ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/20"
                              : "text-slate-600 hover:bg-slate-200/50"
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <FolderOpen
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                ativo
                                  ? "text-primary"
                                  : qtd > 0
                                    ? "text-blue-500"
                                    : "text-slate-400"
                              }`}
                            />
                            <div className="min-w-0">
                              <span className="line-clamp-2 leading-snug">{nucleo}</span>
                              <span className="mt-0.5 block font-mono text-[9px] text-slate-400">
                                {siglaCurta}
                              </span>
                            </div>
                          </div>
                          {qtd > 0 && (
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                ativo
                                  ? "bg-primary text-white"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {qtd}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* ÁRVORE MODO 2: PLANO DE CLASSIFICAÇÃO (PCD & TTD) */}
            {modoNavegacao === "pcd" && (
              <>
                <h3 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Estrutura do PCD & TTD
                </h3>
                <div className="mb-3 space-y-1 border-b border-slate-200 pb-3">
                  {(
                    [
                      { valor: "TODAS", rotulo: "Todas as Classes PCD" },
                      { valor: "Atividade-Fim", rotulo: "Classes de Atividade-Fim" },
                      { valor: "Atividade-Meio", rotulo: "Classes de Atividade-Meio" },
                    ] as const
                  ).map((esc) => {
                    const ativo =
                      escopoAtividadePcd === esc.valor && !classePcdSelecionada;
                    return (
                      <button
                        key={esc.valor}
                        type="button"
                        onClick={() => {
                          setEscopoAtividadePcd(esc.valor);
                          setClassePcdSelecionada(null);
                          setDocSelecionadoId(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                          ativo
                            ? "bg-primary font-semibold text-white"
                            : "text-slate-700 hover:bg-slate-200/60"
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5 shrink-0" />
                        <span>{esc.rotulo}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Classes Documentais Ativas
                </p>
                <ul className="space-y-1">
                  {classesPcdConsolidadas
                    .filter(
                      (c) =>
                        escopoAtividadePcd === "TODAS" ||
                        c.tipoAtividade === escopoAtividadePcd
                    )
                    .map((cl) => {
                      const qtd = acervo.filter(
                        (d) => (d.codigoClassificacao || "000.00.00.000") === cl.codigo
                      ).length;
                      const ativo = classePcdSelecionada === cl.codigo;
                      return (
                        <li key={cl.codigo}>
                          <button
                            type="button"
                            onClick={() => {
                              setClassePcdSelecionada(cl.codigo);
                              setDocSelecionadoId(null);
                            }}
                            className={`flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                              ativo
                                ? "bg-purple-50 font-semibold text-purple-800 ring-1 ring-purple-200"
                                : "text-slate-600 hover:bg-slate-200/50"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="block font-mono text-[10px] font-bold text-purple-700">
                                {cl.codigo}
                              </span>
                              <span className="line-clamp-2 text-[11px] leading-snug">
                                {cl.titulo}
                              </span>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                              {qtd}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </>
            )}

            {/* ÁRVORE MODO 3: DOSSIÊS & PROCESSOS */}
            {modoNavegacao === "dossies" && (
              <>
                <h3 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Unidades de Arquivamento
                </h3>
                <div className="mb-3 space-y-1 border-b border-slate-200 pb-3">
                  {(
                    [
                      { valor: "TODOS", rotulo: "Todas as Unidades & Avulsos" },
                      { valor: "ABERTO", rotulo: "Dossiês Abertos (Em Curso)" },
                      { valor: "ENCERRADO", rotulo: "Dossiês Encerrados" },
                      {
                        valor: "RECOLHIDO_ARCHIVEMATICA",
                        rotulo: "Recolhidos ao RDC-Arq",
                      },
                      { valor: "AVULSOS", rotulo: "Documentos Avulsos (Sem Dossiê)" },
                    ] as const
                  ).map((st) => {
                    const ativo =
                      filtroStatusDossie === st.valor && !dossieSelecionadoCodigo;
                    return (
                      <button
                        key={st.valor}
                        type="button"
                        onClick={() => {
                          setFiltroStatusDossie(st.valor);
                          setDossieSelecionadoCodigo(null);
                          setDocSelecionadoId(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                          ativo
                            ? "bg-primary font-semibold text-white"
                            : "text-slate-700 hover:bg-slate-200/60"
                        }`}
                      >
                        <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{st.rotulo}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dossiês & Processos Abertos
                </p>
                <ul className="space-y-1">
                  {dossiesConsolidados.map((ds) => {
                    const ativo = dossieSelecionadoCodigo === ds.codigoDossie;
                    return (
                      <li key={ds.codigoDossie}>
                        <button
                          type="button"
                          onClick={() => {
                            setDossieSelecionadoCodigo(ds.codigoDossie);
                            setDocSelecionadoId(null);
                          }}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                            ativo
                              ? "bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-200"
                              : "text-slate-600 hover:bg-slate-200/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="block font-mono text-[10px] font-bold text-emerald-700">
                              {ds.codigoDossie}
                            </span>
                            <span className="line-clamp-2 text-[11px] leading-snug">
                              {ds.titulo}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                            {ds.totalDocumentos}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* ÁRVORE MODO 4: CICLO VITAL, PRESERVAÇÃO & SIGILO */}
            {modoNavegacao === "ciclo_vital" && (
              <>
                <h3 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Recortes de Governança
                </h3>
                <ul className="space-y-1">
                  {(
                    [
                      { valor: "TODOS", rotulo: "Visão Geral das 3 Idades & Sigilo" },
                      { valor: "FASE_CORRENTE", rotulo: "1ª Idade: Arquivo Corrente" },
                      {
                        valor: "FASE_INTERMEDIARIA",
                        rotulo: "2ª Idade: Arquivo Intermediário",
                      },
                      {
                        valor: "GUARDA_PERMANENTE",
                        rotulo: "3ª Idade: Guarda Permanente",
                      },
                      {
                        valor: "RECOLHIDOS_OAIS",
                        rotulo: "Pacotes SIP / AIP (Archivematica)",
                      },
                      {
                        valor: "ELIMINACAO_PREVISTA",
                        rotulo: "Guarda Temporária (Eliminação TTD)",
                      },
                      {
                        valor: "ACESSO_OSTENSIVO",
                        rotulo: "Acesso Ostensivo (Público)",
                      },
                      {
                        valor: "ACESSO_RESTRITO_LAI_LGPD",
                        rotulo: "Acesso Restrito (LGPD & LAI)",
                      },
                    ] as Array<{ valor: RecorteCicloVital; rotulo: string }>
                  ).map((item) => {
                    const ativo = recorteCiclo === item.valor;
                    return (
                      <li key={item.valor}>
                        <button
                          type="button"
                          onClick={() => {
                            setRecorteCiclo(item.valor);
                            setDocSelecionadoId(null);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            ativo
                              ? "bg-primary font-semibold text-white"
                              : "text-slate-700 hover:bg-slate-200/60"
                          }`}
                        >
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.rotulo}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* 4.2 COLUNA CENTRAL: BARRA DE ENDEREÇO (BREADCRUMBS) + CONTEÚDO (PASTAS E DOCUMENTOS) */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
            {/* Barra de Endereço Multinível (Breadcrumbs Interativos) */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/70 px-4 py-2.5 text-xs">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {podeSubirNivel && (
                  <button
                    type="button"
                    onClick={subirNivel}
                    className="mr-1.5 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100"
                    title="Voltar para o nível anterior"
                  >
                    <ArrowUpLeft className="h-3.5 w-3.5" />
                    Subir Nível
                  </button>
                )}

                {breadcrumbs.map((passo, idx) => (
                  <div key={passo.id} className="flex items-center gap-1 min-w-0">
                    {idx > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                    <button
                      type="button"
                      onClick={passo.onClick}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors max-w-[260px] ${
                        passo.ativo
                          ? "bg-blue-50/80 font-semibold text-slate-900 ring-1 ring-blue-200/70"
                          : "font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                      }`}
                    >
                      {passo.codigo && (
                        <span className="shrink-0 rounded bg-white px-1.5 py-0.2 font-mono text-[10px] font-bold text-blue-700 ring-1 ring-slate-200">
                          {passo.codigo}
                        </span>
                      )}
                      <span className="truncate">{passo.rotulo}</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {pastasVisiveis.length > 0 && (
                  <span>
                    <strong>{pastasVisiveis.length}</strong> pasta(s)
                  </span>
                )}
                {pastasVisiveis.length > 0 && exibirDocumentosNoNivelAtual && (
                  <span>·</span>
                )}
                <span>
                  <strong>{documentosFiltrados.length}</strong> documento(s) no escopo (
                  {formatarTamanho(resumoEscopoAtual.tamanhoTotalBytes)})
                </span>
              </div>
            </div>

            {/* Área Rolável Principal (Pastas e/ou Documentos) */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* MODO VISUALIZAÇÃO EM GRADE (CARDS) */}
              {modoVisualizacao === "grade" ? (
                <div className="space-y-6">
                  {/* Grade de Pastas / Classes / Dossiês */}
                  {pastasVisiveis.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Agrupamentos & Unidades deste Nível ({pastasVisiveis.length})
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pastasVisiveis.map((pasta) => {
                          const tema = estiloTemaPasta(pasta.corTema);
                          return (
                            <div
                              key={pasta.id}
                              onClick={pasta.onAbrir}
                              className={`group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:shadow-md ${tema.bordaHover}`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className={`rounded-xl p-2.5 ${tema.iconeBg}`}>
                                    {pasta.tipoPasta === "dossie" ? (
                                      <FolderKanban className="h-5 w-5" />
                                    ) : pasta.tipoPasta === "classe_pcd" ? (
                                      <Layers className="h-5 w-5" />
                                    ) : (
                                      <Folder className="h-5 w-5 fill-current/15" />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    {pasta.codigoBadge && (
                                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                                        {pasta.codigoBadge}
                                      </span>
                                    )}
                                    {pasta.statusBadge && (
                                      <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${tema.badge}`}
                                      >
                                        {pasta.statusBadge}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <h5 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary">
                                  {pasta.titulo}
                                </h5>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {pasta.subtitulo}
                                </p>
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                                <span>
                                  <strong>{pasta.quantidadeDocs}</strong> item(ns) ·{" "}
                                  {formatarTamanho(pasta.tamanhoTotalBytes)}
                                </span>
                                <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                                  Abrir →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grade de Documentos Arquivísticos */}
                  {exibirDocumentosNoNivelAtual && documentosVisiveis.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Documentos Arquivísticos ({documentosVisiveis.length})
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {documentosVisiveis.map((doc) => {
                          const selecionado = docSelecionadoId === doc.id;
                          const ehRestrito =
                            doc.nivelAcesso === "RESTRITO_LGPD" ||
                            doc.nivelAcesso === "SIGILOSO_LAI";
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setDocSelecionadoId(doc.id)}
                              onDoubleClick={() => onAbrirDoc(doc)}
                              className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                                selecionado
                                  ? "border-blue-400 bg-blue-50/40 ring-2 ring-blue-200"
                                  : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200/80">
                                    {renderIconeExtensao(doc.ext, "h-6 w-6")}
                                  </div>
                                  <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                                    {doc.numeroProtocolo || `ID-${doc.id.slice(0, 6)}`}
                                  </span>
                                </div>

                                <h5
                                  className="mt-3 truncate text-sm font-semibold text-slate-900 group-hover:text-primary"
                                  title={doc.nome}
                                >
                                  {doc.nome}
                                </h5>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {doc.categoria} · Ano {doc.ano} ·{" "}
                                  {doc.tamanho ? formatarTamanho(doc.tamanho) : doc.ext.toUpperCase()}
                                </p>

                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700">
                                    {doc.codigoClassificacao || "000.00.00.000"}
                                  </span>
                                  {doc.codigoDossie ? (
                                    <span className="rounded bg-purple-50 px-1.5 py-0.5 font-semibold text-purple-700">
                                      Dossiê
                                    </span>
                                  ) : (
                                    <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">
                                      Avulso
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold ${
                                      ehRestrito
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {ehRestrito && <Lock className="h-2.5 w-2.5" />}
                                    {rotuloNivelAcesso(doc.nivelAcesso)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5">
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  {formatarHashCurto(doc.hashSha256, 8)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFichaCompletaDoc(doc);
                                    }}
                                    className="h-7 px-2 text-[11px] text-slate-600"
                                  >
                                    Ficha
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAbrirDoc(doc);
                                    }}
                                    className="h-7 gap-1 px-2.5 text-[11px]"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Abrir
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MODO VISUALIZAÇÃO EM LISTA DETALHADA (TABELA ARQUIVÍSTICA) */
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[11px] font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-xs">
                      <tr>
                        <th className="px-4 py-3">Item / Identificação no Acervo</th>
                        <th className="px-3 py-3">Protocolo / Código</th>
                        <th className="px-3 py-3">Classificação PCD & Vínculo</th>
                        <th className="px-3 py-3">Ciclo Vital & Acesso</th>
                        <th className="px-3 py-3">Fixidade / Volume</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* 1. LINHAS DE PASTAS / CLASSES PCD / DOSSIÊS */}
                      {pastasVisiveis.map((pasta) => {
                        const tema = estiloTemaPasta(pasta.corTema);
                        return (
                          <tr
                            key={pasta.id}
                            onClick={pasta.onAbrir}
                            className="group cursor-pointer bg-slate-50/30 transition-colors hover:bg-blue-50/40"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`rounded-lg p-2 ${tema.iconeBg}`}>
                                  {pasta.tipoPasta === "dossie" ? (
                                    <FolderKanban className="h-4 w-4" />
                                  ) : pasta.tipoPasta === "classe_pcd" ? (
                                    <Layers className="h-4 w-4" />
                                  ) : (
                                    <Folder className="h-4 w-4 fill-current/15" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 group-hover:text-primary line-clamp-1">
                                    {pasta.titulo}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {pasta.subtitulo}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {pasta.codigoBadge ? (
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                                  {pasta.codigoBadge}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <span
                                className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${tema.badge}`}
                              >
                                {pasta.statusBadge || "Diretório Arquivístico"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[11px] text-slate-600">
                              <span>
                                Perm.: <strong>{pasta.guardaPermanenteCount}</strong>
                              </span>
                              {pasta.restritosCount > 0 && (
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                                  {pasta.restritosCount} restrito(s)
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <p className="font-semibold text-slate-800">
                                {pasta.quantidadeDocs} documento(s)
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatarTamanho(pasta.tamanhoTotalBytes)}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-slate-200 group-hover:bg-primary group-hover:text-white group-hover:ring-primary transition-colors">
                                Abrir Pasta
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* 2. LINHAS DE DOCUMENTOS ARQUIVÍSTICOS */}
                      {exibirDocumentosNoNivelAtual &&
                        documentosVisiveis.map((doc, idx) => {
                          const selecionado = docSelecionadoId === doc.id;
                          const ehRestrito =
                            doc.nivelAcesso === "RESTRITO_LGPD" ||
                            doc.nivelAcesso === "SIGILOSO_LAI";
                          return (
                            <tr
                              key={doc.id}
                              onClick={() => setDocSelecionadoId(doc.id)}
                              onDoubleClick={() => onAbrirDoc(doc)}
                              className={`group cursor-pointer transition-colors ${
                                selecionado
                                  ? "bg-blue-50/80"
                                  : "hover:bg-slate-50/90"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {modoNavegacao === "dossies" &&
                                    dossieSelecionadoCodigo &&
                                    dossieSelecionadoCodigo !== "__AVULSOS__" && (
                                      <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 font-mono text-[10px] font-bold text-purple-800"
                                        title="Ordem sequencial da peça no Dossiê"
                                      >
                                        {idx + 1}
                                      </span>
                                    )}
                                  {renderIconeExtensao(doc.ext, "h-5 w-5")}
                                  <div className="min-w-0 max-w-xs xl:max-w-sm">
                                    <p
                                      className="truncate font-semibold text-slate-900 group-hover:text-primary"
                                      title={doc.nome}
                                    >
                                      {doc.nome}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {doc.categoria} · Ano {doc.ano} ·{" "}
                                      {doc.autor || "FCJA"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700">
                                  {doc.numeroProtocolo || `ID-${doc.id.slice(0, 6)}`}
                                </span>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  Capturado em {doc.upload}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <span className="font-mono text-[11px] font-bold text-slate-800">
                                  {doc.codigoClassificacao || "000.00.00.000"}
                                </span>
                                <p className="mt-0.5 text-[10px]">
                                  {doc.codigoDossie ? (
                                    <span className="font-semibold text-purple-700">
                                      Dossiê: {doc.codigoDossie}
                                    </span>
                                  ) : (
                                    <span className="text-amber-700">
                                      Documento Avulso
                                    </span>
                                  )}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                    {doc.faseArquivistica || "CORRENTE"}
                                  </span>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                    {rotuloStatusDocumento(doc.statusDocumento)}
                                  </span>
                                </div>
                                <span
                                  className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                    ehRestrito
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {ehRestrito && <Lock className="h-2.5 w-2.5" />}
                                  {rotuloNivelAcesso(doc.nivelAcesso)}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <div className="flex items-center gap-1">
                                  <Fingerprint
                                    className={`h-3.5 w-3.5 ${
                                      doc.fixidadeVerificada === false
                                        ? "text-red-500"
                                        : "text-emerald-600"
                                    }`}
                                  />
                                  <span className="font-mono text-[10px] text-slate-600">
                                    {formatarHashCurto(doc.hashSha256, 8)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {doc.tamanho
                                    ? formatarTamanho(doc.tamanho)
                                    : doc.ext.toUpperCase()}
                                  {doc.pacoteSipId ? ` · SIP` : ""}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <div
                                  className="inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFichaCompletaDoc(doc)}
                                    className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                                    title="Abrir Ficha Arquivística e PREMIS"
                                  >
                                    Ficha
                                  </Button>
                                  {onBaixarDoc && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onBaixarDoc(doc)}
                                      className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                                      title="Baixar Arquivo"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAbrirDoc(doc)}
                                    className="h-7 gap-1 border-blue-200 bg-blue-50/50 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Abrir
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ESTADO VAZIO */}
              {pastasVisiveis.length === 0 &&
                (!exibirDocumentosNoNivelAtual || documentosVisiveis.length === 0) && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
                    <FolderOpen className="mb-3 h-12 w-12 text-slate-300" />
                    <h4 className="text-sm font-semibold text-slate-700">
                      Nenhum item encontrado neste nível ou filtro
                    </h4>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">
                      Verifique os filtros ativos na barra superior ou suba um nível na
                      árvore de diretórios para explorar outras unidades do acervo.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      {possuiFiltrosRapidosAtivos && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={limparFiltrosRapidos}
                          className="text-xs"
                        >
                          Limpar Filtros de Busca
                        </Button>
                      )}
                      {podeSubirNivel && (
                        <Button size="sm" onClick={subirNivel} className="text-xs">
                          Voltar ao Nível Anterior
                        </Button>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* 4.3 COLUNA DIREITA: PAINEL DE INSPEÇÃO DIPLOMÁTICA E DIAGNÓSTICO DO ESCOPO */}
          {painelInspecaoAberto && (
            <PainelInspecaoExplorador
              docSelecionado={docSelecionado}
              onLimparSelecao={() => setDocSelecionadoId(null)}
              classePcdAtual={classePcdAtual}
              dossieAtual={dossieAtual}
              resumoEscopo={resumoEscopoAtual}
              rotuloEscopoAtual={rotuloEscopoAtual}
              documentosEscopo={documentosFiltrados}
              onAbrirDoc={onAbrirDoc}
              onBaixarDoc={onBaixarDoc}
              onAbrirFichaCompleta={(doc) => setFichaCompletaDoc(doc)}
              onVerificarFixidade={onVerifyFixity}
              onIrParaDossie={abrirDossieNoExplorador}
              onIrParaClassePcd={abrirClassePcdNoExplorador}
              onNavegarAba={onNavegarAba}
            />
          )}
        </div>
      </div>

      {/* Modal Completo da Ficha Descritiva e PREMIS */}
      <ModalMetadadosEarq
        doc={fichaCompletaDoc}
        onClose={() => setFichaCompletaDoc(null)}
        onVerificarFixidade={onVerifyFixity}
      />
    </>
  );
}
