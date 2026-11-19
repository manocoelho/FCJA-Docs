import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Layers,
  Lock,
  Printer,
  Save,
  Sparkles,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarraFerramentasEditor } from "@/components/ged/BarraFerramentasEditor";
import { ModalPlanilhaEditor } from "@/components/ged/ModalPlanilhaEditor";
import { SeletorHierarquico } from "@/components/ged/SeletorHierarquico";
import {
  CLASSES_FIM_PADRAO,
  NIVEIS_ACESSO_OPCOES,
  NUCLEOS,
  SIGLA_POR_NUCLEO,
  STATUS_DOCUMENTO_OPCOES,
  type Doc,
} from "@/components/ged/data";
import { TIPOLOGIAS_MEIO } from "@/components/ged/codigos";
import {
  OPCOES_FORMATO_EDITOR,
  TEMPLATES_EDITOR_SIGAD,
  gerarArquivoPorFormatoEditor,
  gerarArquivoXlsxParaCaptura,
  imprimirOuSalvarPdfEditor,
  type ConfigPaginaEditor,
  type FormatoCapturaSigad,
  type FormatoExportacaoEditor,
} from "@/lib/editor-documentos-export";
import {
  buscarClassesPcd,
  buscarDossies,
  type ClassePcdItem,
  type DossieItem,
} from "@/lib/pcd-dossie-api";
import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";

interface TelaEditorDocumentosProps {
  usuarioLogado: string | null;
  usuarioPapel: string | null;
  onDocsUploaded: (novosDocs: Doc[]) => void;
  onIrParaAcervo?: (() => void) | undefined;
}

const STORAGE_KEY_RASCUNHO = "fcja_sigad_editor_rascunho_v1";

const CFG_PAGINA_INICIAL: ConfigPaginaEditor = {
  mostrarCabecalho: true,
  mostrarRodape: true,
  cabecalhoInstituicao: "FUNDAÇÃO CASA DE JOSÉ AMÉRICO (FCJA) — GOVERNO DA PARAÍBA",
  cabecalhoSubtitulo: "Núcleo de Pesquisa e Documentação Arquivística — SIGAD FCJA",
  rodapeTexto:
    "Av. Cabo Branco, 3336 — Cabo Branco, João Pessoa - PB · Documento produzido no SIGAD FCJA",
  mostrarNumeracaoPagina: true,
  orientacao: "retrato",
  margem: "abnt",
  espacamentoLinhas: "1.5",
  zoom: 100,
};

export function TelaEditorDocumentos({
  usuarioLogado,
  usuarioPapel,
  onDocsUploaded,
  onIrParaAcervo,
}: TelaEditorDocumentosProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selecaoSalvaRef = useRef<Range | null>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);

  const [tituloDoc, setTituloDoc] = useState<string>("Relatorio_Tecnico_Pesquisa_FCJA");
  const [formatoSelecionado, setFormatoSelecionado] =
    useState<FormatoExportacaoEditor>("pdf");
  const [formatoCaptura, setFormatoCaptura] = useState<FormatoCapturaSigad>("pdf");
  const [templateId, setTemplateId] = useState<string>("relatorio_pesquisa");
  const [cfgPagina, setCfgPagina] = useState<ConfigPaginaEditor>(CFG_PAGINA_INICIAL);
  const [htmlAtual, setHtmlAtual] = useState<string>(
    TEMPLATES_EDITOR_SIGAD[1]?.htmlCorpo || TEMPLATES_EDITOR_SIGAD[0]!.htmlCorpo
  );
  const [ultimoRascunhoSalvo, setUltimoRascunhoSalvo] = useState<string>("");

  // Modais de Objetos Ricos (Tabela, Planilha, Imagem)
  const [modalTabela, setModalTabela] = useState(false);
  const [tabLinhas, setTabLinhas] = useState("4");
  const [tabColunas, setTabColunas] = useState("4");
  const [tabCorCabecalho, setTabCorCabecalho] = useState("#1e3a8a");
  const [tabIncluirCabecalho, setTabIncluirCabecalho] = useState(true);

  const [modalPlanilha, setModalPlanilha] = useState(false);

  const [modalImagem, setModalImagem] = useState(false);
  const [imgBase64, setImgBase64] = useState<string>("");
  const [imgNomeArquivo, setImgNomeArquivo] = useState<string>("");
  const [imgLarguraPct, setImgLarguraPct] = useState<string>("75");
  const [imgAlinhamento, setImgAlinhamento] = useState<"left" | "center" | "right">("center");
  const [imgLegendaContexto, setImgLegendaContexto] = useState<string>("");
  const [imgFonteAutoria, setImgFonteAutoria] = useState<string>("Acervo FCJA");

  // Modal de Captura Arquivística no SIGAD (Documento .docx ou Planilha .xlsx)
  const [modalCapturaSigad, setModalCapturaSigad] = useState(false);
  const [arquivoPlanilhaPronto, setArquivoPlanilhaPronto] = useState<File | null>(null);
  const [capturandoNoSigad, setCapturandoNoSigad] = useState(false);

  // Metadados e-ARQ Brasil v2 para a Captura Direta
  const [capNucleo, setCapNucleo] = useState<string>(NUCLEOS[1]!);
  const [capSigla, setCapSigla] = useState<string>(SIGLA_POR_NUCLEO[NUCLEOS[1]!] || "");
  const [capTipoAtividade, setCapTipoAtividade] = useState<string>("Atividade-Fim");
  const [capCodigoClasse, setCapCodigoClasse] = useState<string>("FIM.100.01.001");
  const [capDescricaoClasse, setCapDescricaoClasse] = useState<string>(
    CLASSES_FIM_PADRAO[0]!.titulo
  );
  const [capTipologia, setCapTipologia] = useState<string>("Relatório");
  const [capDescricaoContextual, setCapDescricaoContextual] = useState<string>(
    TEMPLATES_EDITOR_SIGAD[1]?.descricaoSugerida || ""
  );
  const [capAutor, setCapAutor] = useState<string>(
    usuarioLogado
      ? `${usuarioLogado} — Fundação Casa de José Américo (FCJA)`
      : "Fundação Casa de José Américo (FCJA)"
  );
  const [capStatusDoc, setCapStatusDoc] = useState<string>("ORIGINAL");
  const [capNivelAcesso, setCapNivelAcesso] = useState<string>("OSTENSIVO");
  const [capHipoteseLegal, setCapHipoteseLegal] = useState<string>("");
  const [capDossieId, setCapDossieId] = useState<string>("AVULSO");

  const [classesFim, setClassesFim] = useState<
    ReadonlyArray<{
      codigo: string;
      titulo: string;
      destinacaoFinal: string;
      observacoesTtd?: string | undefined;
    }>
  >(CLASSES_FIM_PADRAO);
  const [dossiesAbertos, setDossiesAbertos] = useState<DossieItem[]>([]);

  // Inicializa o conteúdo do editor e carrega classes PCD / Dossiês
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_RASCUNHO);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed.tituloDoc) setTituloDoc(parsed.tituloDoc);
        if (parsed.cfgPagina) setCfgPagina({ ...CFG_PAGINA_INICIAL, ...parsed.cfgPagina });
        if (parsed.htmlAtual && editorRef.current) {
          editorRef.current.innerHTML = parsed.htmlAtual;
          setHtmlAtual(parsed.htmlAtual);
          return;
        }
      }
    } catch {
      // ignora erro de localStorage
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlAtual;
    }
  }, []);

  useEffect(() => {
    buscarClassesPcd("Atividade-Fim")
      .then((lista: ClassePcdItem[]) => {
        if (lista && lista.length > 0) {
          setClassesFim(
            lista.map((c) => ({
              codigo: c.codigo,
              titulo: c.titulo,
              destinacaoFinal: c.destinacaoFinal,
              observacoesTtd: c.observacoesTtd,
            }))
          );
        }
      })
      .catch(() => {});

    buscarDossies()
      .then((lista: DossieItem[]) => {
        setDossiesAbertos(lista.filter((d) => d.statusDossie === "ABERTO"));
      })
      .catch(() => {});
  }, []);

  function sincronizarHtmlDoDom() {
    if (!editorRef.current) return;
    const novoHtml = editorRef.current.innerHTML;
    setHtmlAtual(novoHtml);
  }

  function salvarRascunhoLocal(silencioso = false) {
    const conteudo = editorRef.current?.innerHTML ?? htmlAtual;
    try {
      localStorage.setItem(
        STORAGE_KEY_RASCUNHO,
        JSON.stringify({
          tituloDoc,
          cfgPagina,
          htmlAtual: conteudo,
        })
      );
      const hora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setUltimoRascunhoSalvo(hora);
      if (!silencioso) {
        toast.success("Rascunho salvo localmente no navegador!");
      }
    } catch {
      // ignora quota
    }
  }

  // Salvamento automático a cada alteração
  useEffect(() => {
    const timer = setTimeout(() => {
      salvarRascunhoLocal(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [htmlAtual, tituloDoc, cfgPagina]);

  function salvarSelecaoCursor() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      selecaoSalvaRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restaurarSelecaoCursor() {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && selecaoSalvaRef.current) {
      sel.removeAllRanges();
      sel.addRange(selecaoSalvaRef.current);
    }
  }

  function executarComando(cmd: string, valor?: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, valor);
    sincronizarHtmlDoDom();
  }

  function inserirHtmlNoCursor(html: string) {
    restaurarSelecaoCursor();
    document.execCommand("insertHTML", false, html);
    sincronizarHtmlDoDom();
  }

  function aplicarTemplate(id: string) {
    const tpl = TEMPLATES_EDITOR_SIGAD.find((t) => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    if (editorRef.current) {
      editorRef.current.innerHTML = tpl.htmlCorpo;
    }
    setHtmlAtual(tpl.htmlCorpo);
    setCfgPagina((prev) => ({
      ...prev,
      cabecalhoSubtitulo: tpl.cabecalhoSubtitulo,
    }));
    setCapTipologia(tpl.categoriaSugerida);
    setCapTipoAtividade(tpl.tipoAtividadeSugerida);
    if (tpl.descricaoSugerida) {
      setCapDescricaoContextual(tpl.descricaoSugerida);
    }
    toast.success(`Modelo "${tpl.nome}" carregado na folha A4!`);
  }

  function confirmarInsercaoTabela() {
    const numL = Math.min(40, Math.max(1, Number(tabLinhas) || 3));
    const numC = Math.min(12, Math.max(1, Number(tabColunas) || 3));

    let thead = "";
    if (tabIncluirCabecalho) {
      const ths = Array.from({ length: numC })
        .map(
          (_, i) =>
            `<th style="border: 1px solid #94a3b8; background-color: ${tabCorCabecalho}; color: ${
              tabCorCabecalho === "#f1f5f9" ? "#0f172a" : "#ffffff"
            }; padding: 8px 10px; text-align: left; font-weight: 700;">Cabeçalho ${i + 1}</th>`
        )
        .join("");
      thead = `<thead><tr>${ths}</tr></thead>`;
    }

    const trs = Array.from({ length: numL })
      .map((_, r) => {
        const tds = Array.from({ length: numC })
          .map(
            (__, c) =>
              `<td style="border: 1px solid #cbd5e1; padding: 8px 10px;">Célula ${r + 1}.${
                c + 1
              }</td>`
          )
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");

    const tabelaHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 10.5pt;">
        ${thead}
        <tbody>${trs}</tbody>
      </table>
      <p><br/></p>
    `;

    inserirHtmlNoCursor(tabelaHtml);
    setModalTabela(false);
  }

  function aoSelecionarArquivoImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error("A imagem excede 12 MB.");
      return;
    }
    setImgNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImgBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function confirmarInsercaoImagem() {
    if (!imgBase64) {
      toast.error("Selecione uma imagem no computador primeiro.");
      return;
    }
    const alignCss =
      imgAlinhamento === "center"
        ? "margin-left: auto; margin-right: auto; text-align: center;"
        : imgAlinhamento === "right"
          ? "margin-left: auto; text-align: right;"
          : "margin-right: auto; text-align: left;";

    const legendaBloco = imgLegendaContexto.trim()
      ? `<figcaption style="margin-top: 6px; font-size: 9.5pt; color: #334155; font-style: italic; line-height: 1.35;">
           <strong>Contexto / Legenda:</strong> ${imgLegendaContexto.trim()}
           ${imgFonteAutoria.trim() ? `<br/><span style="font-size: 8.5pt; color: #64748b;">Fonte / Autoria: ${imgFonteAutoria.trim()}</span>` : ""}
         </figcaption>`
      : "";

    const htmlImg = `
      <figure style="margin: 16px 0; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; ${alignCss}">
        <img src="${imgBase64}" alt="${imgLegendaContexto || imgNomeArquivo}" style="width: ${imgLarguraPct}%; max-width: 100%; height: auto; border-radius: 4px; display: inline-block;" />
        ${legendaBloco}
      </figure>
      <p><br/></p>
    `;

    inserirHtmlNoCursor(htmlImg);
    setModalImagem(false);
    setImgBase64("");
    setImgNomeArquivo("");
    setImgLegendaContexto("");
  }

  function inserirLinkRapido() {
    salvarSelecaoCursor();
    const url = window.prompt("Informe o endereço URL do link (ex: https://fcja.pb.gov.br):", "https://");
    if (!url || url === "https://") return;
    const texto = window.prompt("Texto de exibição do link:", url) || url;
    inserirHtmlNoCursor(
      `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${texto}</a>`
    );
  }

  function inserirChecklistItem() {
    salvarSelecaoCursor();
    inserirHtmlNoCursor(
      `<p style="margin: 4px 0;"><input type="checkbox" style="margin-right: 8px;" /> Item de verificação arquivística</p>`
    );
  }

  function inserirQuebraDePagina() {
    salvarSelecaoCursor();
    inserirHtmlNoCursor(
      `<div style="page-break-after: always; border-top: 2px dashed #94a3b8; margin: 28px 0; padding-top: 4px; text-align: center; font-size: 9pt; color: #64748b; user-select: none;">— Quebra de Página A4 —</div><p><br/></p>`
    );
  }

  function inserirCarimboProtocolo() {
    salvarSelecaoCursor();
    const agora = new Date();
    const dataFmt = agora.toLocaleDateString("pt-BR");
    const horaFmt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    inserirHtmlNoCursor(
      `<div style="border: 1.5px solid #1e3a8a; background-color: #eff6ff; border-radius: 6px; padding: 10px 14px; margin: 14px 0; font-family: Arial, sans-serif; font-size: 9.5pt; color: #1e3a8a;">
         <strong>SIGAD FCJA — REGISTRO DE PRODUÇÃO NATODIGITAL (e-ARQ Brasil v2)</strong><br/>
         <span>Agente Produtor: ${usuarioLogado || "Pesquisador FCJA"} · Data/Hora: ${dataFmt} às ${horaFmt}</span>
       </div><p><br/></p>`
    );
  }

  function baixarNoFormato(formato: FormatoExportacaoEditor) {
    const conteudo = editorRef.current?.innerHTML ?? htmlAtual;
    const file = gerarArquivoPorFormatoEditor(formato, tituloDoc, conteudo, cfgPagina);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Arquivo "${file.name}" salvo no computador!`, {
      description: `Formato exportado: .${formato.toUpperCase()}`,
    });
  }

  function exportarPlanilhaXlsxLocal(nomeAba: string, colunas: string[], linhas: string[][]) {
    const file = gerarArquivoXlsxParaCaptura(nomeAba || tituloDoc, nomeAba, colunas, linhas);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Planilha "${file.name}" baixada no computador!`);
  }

  function prepararCapturaPlanilhaXlsxNoSigad(
    nomeAba: string,
    colunas: string[],
    linhas: string[][]
  ) {
    const file = gerarArquivoXlsxParaCaptura(nomeAba || tituloDoc, nomeAba, colunas, linhas);
    setArquivoPlanilhaPronto(file);
    setFormatoCaptura("xlsx");
    setCapTipologia("Planilha");
    setModalCapturaSigad(true);
  }

  function abrirModalCapturaDocumento() {
    sincronizarHtmlDoDom();
    setArquivoPlanilhaPronto(null);
    if (
      formatoSelecionado === "pdf" ||
      formatoSelecionado === "docx" ||
      formatoSelecionado === "xlsx" ||
      formatoSelecionado === "csv"
    ) {
      setFormatoCaptura(formatoSelecionado);
    } else {
      setFormatoCaptura("pdf");
    }
    setModalCapturaSigad(true);
  }

  async function executarCapturaDiretaNoSigad(e: React.FormEvent) {
    e.preventDefault();
    setCapturandoNoSigad(true);

    try {
      const conteudo = editorRef.current?.innerHTML ?? htmlAtual;
      const arquivoFinal =
        arquivoPlanilhaPronto ??
        gerarArquivoPorFormatoEditor(formatoCaptura, tituloDoc, conteudo, cfgPagina);
      const extBackend: Doc["ext"] =
        arquivoPlanilhaPronto || formatoCaptura === "xlsx" || formatoCaptura === "csv"
          ? "xlsx"
          : formatoCaptura === "pdf"
            ? "pdf"
            : "docx";
      const anoAtual = new Date().getFullYear();

      const formData = new FormData();
      formData.append("file", arquivoFinal);
      formData.append("nome", arquivoFinal.name);
      formData.append("ext", extBackend);
      formData.append("tipo_atividade", capTipoAtividade);
      formData.append("codigo_classificacao", capCodigoClasse);
      formData.append("descricao_codigo", capDescricaoClasse);
      formData.append("descricao", capDescricaoContextual.trim());
      formData.append("categoria", capTipologia || "Documento");
      formData.append("ano", String(anoAtual));
      formData.append("nucleo", capNucleo);
      formData.append("sigla", capSigla);
      formData.append("autor", capAutor || "Fundação Casa de José Américo (FCJA)");
      formData.append("status_documento", capStatusDoc || "ORIGINAL");
      formData.append("nivel_acesso", capNivelAcesso || "OSTENSIVO");
      formData.append("hipotese_legal", capHipoteseLegal || "");
      if (capDossieId && capDossieId !== "AVULSO") {
        formData.append("dossie_id", capDossieId);
      }
      formData.append("usuario_responsavel", usuarioLogado || "sistema");
      formData.append("papel_usuario", usuarioPapel || "");

      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: obterHeadersAuth(),
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Falha ao protocolar e capturar o documento no servidor SIGAD.");
      }

      const resp = await res.json();
      const novoDoc: Doc = {
        id: resp.id,
        numeroProtocolo: resp.numeroProtocolo,
        tipoAtividade: capTipoAtividade,
        codigoClassificacao: capCodigoClasse,
        descricaoCodigo: capDescricaoClasse,
        descricao: resp.descricao ?? capDescricaoContextual.trim(),
        nome: arquivoFinal.name,
        ext: extBackend,
        categoria: capTipologia || "Documento",
        ano: anoAtual,
        nucleo: capNucleo,
        sigla: capSigla,
        upload: resp.upload,
        hora: resp.hora,
        url: resp.url,
        tamanho: resp.tamanho,
        hashSha256: resp.hashSha256,
        formatoMime: resp.formatoMime,
        genero: resp.genero,
        autor: resp.autor,
        statusDocumento: resp.statusDocumento,
        meio: resp.meio,
        faseArquivistica: resp.faseArquivistica,
        nivelAcesso: resp.nivelAcesso,
        hipoteseLegal: resp.hipoteseLegal,
        fixidadeVerificada: resp.fixidadeVerificada,
        ultimaVerificacaoFixidade: resp.ultimaVerificacaoFixidade,
        usuarioCaptura: usuarioLogado || "sistema",
        dossieId: resp.dossieId ?? null,
        codigoDossie: resp.codigoDossie || "",
        prazoCorrenteAnos: resp.prazoCorrenteAnos,
        prazoIntermediariaAnos: resp.prazoIntermediariaAnos,
        anoDestinacaoFinal: resp.anoDestinacaoFinal,
        destinacaoPrevista: resp.destinacaoPrevista,
      };

      onDocsUploaded([novoDoc]);
      setModalCapturaSigad(false);
      toast.success(`Documento natodigital capturado sob protocolo ${resp.numeroProtocolo}!`, {
        description: `Fixidade SHA-256 gerada (${(resp.hashSha256 || "").slice(0, 14)}...) e vinculado ao acervo.`,
      });
      if (onIrParaAcervo) {
        onIrParaAcervo();
      }
    } catch (erro: unknown) {
      const msg = erro instanceof Error ? erro.message : "Erro ao capturar no SIGAD.";
      toast.error("Não foi possível capturar o documento", { description: msg });
    } finally {
      setCapturandoNoSigad(false);
    }
  }

  // Estatísticas em tempo real do documento
  const estatisticasTexto = useMemo(() => {
    const textoLimpo = htmlAtual
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const palavras = textoLimpo ? textoLimpo.split(" ").length : 0;
    const caracteres = textoLimpo.length;
    const qtdTabelas = (htmlAtual.match(/<table/gi) || []).length;
    const qtdImagens = (htmlAtual.match(/<img/gi) || []).length;
    return { palavras, caracteres, qtdTabelas, qtdImagens };
  }, [htmlAtual]);

  // Dimensões visuais da folha A4 conforme orientação e margens
  const larguraFolhaPx = cfgPagina.orientacao === "paisagem" ? 1056 : 816;
  const alturaMinFolhaPx = cfgPagina.orientacao === "paisagem" ? 816 : 1080;
  const paddingFolha =
    cfgPagina.margem === "abnt"
      ? "72px 56px 56px 82px"
      : cfgPagina.margem === "estreita"
        ? "38px 38px 38px 38px"
        : cfgPagina.margem === "larga"
          ? "72px 96px 72px 96px"
          : "64px 64px 64px 64px";

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* BARRA SUPERIOR DO ESTÚDIO (ESTILO GOOGLE DOCS) */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-[260px] flex-1 max-w-lg">
            <div className="flex items-center gap-1.5">
              <Input
                value={tituloDoc}
                onChange={(e) => setTituloDoc(e.target.value)}
                placeholder="Título do Documento..."
                className="h-8 border-transparent bg-slate-50 px-2.5 text-base font-bold text-slate-900 hover:border-slate-300 focus-visible:bg-white focus-visible:border-blue-500"
              />
              {/* Seletor de Formato de Salvamento / Exportação */}
              <select
                aria-label="Formato do arquivo"
                value={formatoSelecionado}
                onChange={(e) => {
                  const novoFmt = e.target.value as FormatoExportacaoEditor;
                  setFormatoSelecionado(novoFmt);
                  if (
                    novoFmt === "pdf" ||
                    novoFmt === "docx" ||
                    novoFmt === "xlsx" ||
                    novoFmt === "csv"
                  ) {
                    setFormatoCaptura(novoFmt);
                  }
                }}
                className="h-8 cursor-pointer rounded-md border border-blue-200 bg-blue-50 px-2 font-mono text-xs font-bold text-blue-700 hover:bg-blue-100 focus:outline-none"
                title="Escolha o formato principal para salvar ou capturar o documento"
              >
                {OPCOES_FORMATO_EDITOR.map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.rotuloCurto}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 px-1 text-[11px] text-slate-500">
              <span>
                <strong>{estatisticasTexto.palavras}</strong> palavras
              </span>
              <span>·</span>
              <span>
                <strong>{estatisticasTexto.caracteres}</strong> caracteres
              </span>
              <span>·</span>
              <span>
                <strong>{estatisticasTexto.qtdTabelas}</strong> tabela(s)
              </span>
              <span>·</span>
              <span>
                <strong>{estatisticasTexto.qtdImagens}</strong> imagem(ns)
              </span>
              {ultimoRascunhoSalvo && (
                <>
                  <span>·</span>
                  <span className="text-emerald-700 font-medium">
                    Salvo às {ultimoRascunhoSalvo}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seletor de Modelos Institucionais da FCJA */}
          <div className="w-64">
            <Select value={templateId} onValueChange={aplicarTemplate}>
              <SelectTrigger className="h-9 bg-slate-50 text-xs font-medium">
                <SelectValue placeholder="Escolher Modelo Institucional..." />
              </SelectTrigger>
              <SelectContent className="max-w-md">
                {TEMPLATES_EDITOR_SIGAD.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ações Principais do Documento */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aplicarTemplate("em_branco")}
            className="gap-1.5 text-xs"
          >
            <FilePlus2 className="h-3.5 w-3.5 text-slate-600" />
            Novo em Branco
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => salvarRascunhoLocal(false)}
            className="gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5 text-blue-600" />
            Salvar Rascunho
          </Button>

          {/* Botão Principal + Menu "Salvar Como..." em 8 Formatos */}
          <div className="inline-flex items-center rounded-md shadow-2xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => baixarNoFormato(formatoSelecionado)}
              className="gap-1.5 rounded-r-none border-r-0 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              Baixar (.{formatoSelecionado})
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-l-none px-2 text-indigo-700 hover:bg-indigo-50"
                  title="Escolher outro formato para baixar"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="text-xs">
                  Salvar Documento no Computador Como...
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {OPCOES_FORMATO_EDITOR.map((op) => (
                  <DropdownMenuItem
                    key={op.valor}
                    onClick={() => {
                      setFormatoSelecionado(op.valor);
                      baixarNoFormato(op.valor);
                    }}
                    className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        {op.rotuloCompleto}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                        {op.rotuloCurto}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{op.descricao}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              imprimirOuSalvarPdfEditor(
                tituloDoc,
                editorRef.current?.innerHTML ?? htmlAtual,
                cfgPagina
              )
            }
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-700" />
            Imprimir A4
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={abrirModalCapturaDocumento}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm text-xs font-semibold"
          >
            <CloudUpload className="h-4 w-4" />
            Protocolar e Capturar no SIGAD
          </Button>
        </div>
      </header>

      {/* RIBBON COMPLETA DE FORMATAÇÃO (ESTILO GOOGLE DOCS / WORD) */}
      <BarraFerramentasEditor
        cfgPagina={cfgPagina}
        onChangeCfgPagina={(parcial) =>
          setCfgPagina((prev) => ({ ...prev, ...parcial }))
        }
        onComando={executarComando}
        onAbrirModalTabela={() => {
          salvarSelecaoCursor();
          setModalTabela(true);
        }}
        onAbrirModalPlanilha={() => {
          salvarSelecaoCursor();
          setModalPlanilha(true);
        }}
        onAbrirModalImagem={() => {
          salvarSelecaoCursor();
          setModalImagem(true);
        }}
        onInserirLink={inserirLinkRapido}
        onInserirChecklist={inserirChecklistItem}
        onInserirQuebraPagina={inserirQuebraDePagina}
        onInserirCarimboProtocolo={inserirCarimboProtocolo}
        onImprimirPdf={() =>
          imprimirOuSalvarPdfEditor(
            tituloDoc,
            editorRef.current?.innerHTML ?? htmlAtual,
            cfgPagina
          )
        }
      />

      {/* MESA DE EDIÇÃO COM RÉGUA VISUAL E FOLHA A4 REALISTA */}
      <div className="overflow-x-auto rounded-2xl border border-slate-300/80 bg-slate-200/75 py-8 px-4 shadow-inner">
        <div
          className="mx-auto transition-all duration-200"
          style={{
            width: `${larguraFolhaPx}px`,
            transform: `scale(${cfgPagina.zoom / 100})`,
            transformOrigin: "top center",
          }}
        >
          {/* Régua Milimetrada Superior A4 */}
          <div className="mb-2 flex h-6 w-full items-end justify-between rounded-t-md border border-slate-300 bg-slate-100 px-6 pb-1 font-mono text-[9px] text-slate-400 select-none">
            {Array.from({ length: cfgPagina.orientacao === "paisagem" ? 29 : 21 }).map(
              (_, cm) => (
                <div key={cm} className="flex flex-col items-center">
                  <span>{cm + 1}</span>
                  <div className="h-1.5 w-px bg-slate-400" />
                </div>
              )
            )}
          </div>

          {/* Folha de Papel A4 */}
          <div
            className="relative flex flex-col justify-between bg-white shadow-2xl ring-1 ring-slate-300"
            style={{
              width: `${larguraFolhaPx}px`,
              minHeight: `${alturaMinFolhaPx}px`,
              padding: paddingFolha,
            }}
          >
            <div>
              {/* ZONA DE CABEÇALHO DA PÁGINA (EDITÁVEL) */}
              {cfgPagina.mostrarCabecalho && (
                <div className="group relative mb-6 border-b-2 border-blue-900 pb-3 transition-colors hover:bg-blue-50/30">
                  <span className="absolute -top-5 right-0 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-800 opacity-0 transition-opacity group-hover:opacity-100">
                    Cabeçalho Institucional (Clique para editar)
                  </span>
                  <input
                    value={cfgPagina.cabecalhoInstituicao}
                    onChange={(e) =>
                      setCfgPagina((prev) => ({
                        ...prev,
                        cabecalhoInstituicao: e.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-xs font-bold uppercase tracking-wide text-slate-900 focus:outline-none"
                    placeholder="Nome da Instituição no Cabeçalho..."
                  />
                  <input
                    value={cfgPagina.cabecalhoSubtitulo}
                    onChange={(e) =>
                      setCfgPagina((prev) => ({
                        ...prev,
                        cabecalhoSubtitulo: e.target.value,
                      }))
                    }
                    className="mt-0.5 w-full bg-transparent text-[11px] text-slate-600 focus:outline-none"
                    placeholder="Subtítulo / Setor / Núcleo de Pesquisa..."
                  />
                </div>
              )}

              {/* CORPO PRINCIPAL DO DOCUMENTO (CONTENTEDITABLE RICO) */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={sincronizarHtmlDoDom}
                onBlur={salvarSelecaoCursor}
                onKeyUp={salvarSelecaoCursor}
                onMouseUp={salvarSelecaoCursor}
                style={{
                  lineHeight: cfgPagina.espacamentoLinhas,
                  minHeight: `${alturaMinFolhaPx - 280}px`,
                }}
                className="prose prose-slate max-w-none focus:outline-none text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-400 [&_th]:p-2 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
              />
            </div>

            {/* ZONA DE RODAPÉ DA PÁGINA (EDITÁVEL) */}
            {cfgPagina.mostrarRodape && (
              <div className="group relative mt-10 border-t border-slate-300 pt-3 transition-colors hover:bg-blue-50/30">
                <span className="absolute -top-5 right-0 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-800 opacity-0 transition-opacity group-hover:opacity-100">
                  Rodapé da Página (Clique para editar)
                </span>
                <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500">
                  <input
                    value={cfgPagina.rodapeTexto}
                    onChange={(e) =>
                      setCfgPagina((prev) => ({
                        ...prev,
                        rodapeTexto: e.target.value,
                      }))
                    }
                    className="flex-1 bg-transparent text-[10px] text-slate-500 focus:outline-none"
                    placeholder="Texto do rodapé..."
                  />
                  {cfgPagina.mostrarNumeracaoPagina && (
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      Página 1
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: INSERIR TABELA PERSONALIZADA */}
      <Dialog open={modalTabela} onOpenChange={setModalTabela}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5 text-blue-600" />
              Inserir Tabela no Documento
            </DialogTitle>
            <DialogDescription>
              Defina a quantidade de linhas e colunas e o estilo do cabeçalho. Após inserir, você
              pode digitar livremente dentro de cada célula.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Número de Linhas</Label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={tabLinhas}
                  onChange={(e) => setTabLinhas(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Número de Colunas</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={tabColunas}
                  onChange={(e) => setTabColunas(e.target.value)}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <Checkbox
                checked={tabIncluirCabecalho}
                onCheckedChange={(v) => setTabIncluirCabecalho(v === true)}
              />
              Incluir linha de cabeçalho destacada
            </label>

            {tabIncluirCabecalho && (
              <div className="space-y-1.5">
                <Label>Estilo do Cabeçalho</Label>
                <Select value={tabCorCabecalho} onValueChange={setTabCorCabecalho}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="#1e3a8a">Azul Institucional FCJA</SelectItem>
                    <SelectItem value="#f1f5f9">Cinza Claro Acadêmico (ABNT)</SelectItem>
                    <SelectItem value="#065f46">Verde Preservação Digital</SelectItem>
                    <SelectItem value="#334155">Ardósia Escuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalTabela(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarInsercaoTabela}>Inserir Tabela</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CONSTRUTOR DE PLANILHA CALCULADA (.XLSX / SHEETS) */}
      <ModalPlanilhaEditor
        aberto={modalPlanilha}
        onFechar={() => setModalPlanilha(false)}
        onInserirTabelaNoTexto={inserirHtmlNoCursor}
        onExportarXlsxLocal={exportarPlanilhaXlsxLocal}
        onCapturarXlsxNoSigad={prepararCapturaPlanilhaXlsxNoSigad}
      />

      {/* MODAL 3: INSERIR IMAGEM COM LEGENDA E CONTEXTO ICONOGRÁFICO */}
      <Dialog open={modalImagem} onOpenChange={setModalImagem}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-600" />
              Inserir Imagem / Fotografia Contextualizada
            </DialogTitle>
            <DialogDescription>
              Selecione uma imagem do computador e registre sua legenda e contexto histórico
              (pessoas, local, data e fonte) para preservação da informação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <input
              ref={inputImgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={aoSelecionarArquivoImagem}
            />

            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/40 p-5 text-center">
              {imgBase64 ? (
                <div className="space-y-2">
                  <img
                    src={imgBase64}
                    alt="Prévia"
                    className="mx-auto max-h-44 rounded-lg border object-contain shadow-xs"
                  />
                  <p className="text-xs font-medium text-purple-900">{imgNomeArquivo}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputImgRef.current?.click()}
                  >
                    Trocar Imagem
                  </Button>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-purple-500" />
                  <p className="text-xs font-medium text-slate-700">
                    Formatos aceitos: PNG, JPG, JPEG, WEBP ou SVG
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => inputImgRef.current?.click()}
                    className="mt-1 bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Escolher Imagem no Computador
                  </Button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Largura na Folha A4</Label>
                <Select value={imgLarguraPct} onValueChange={setImgLarguraPct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="35">Pequena (35%)</SelectItem>
                    <SelectItem value="50">Média (50%)</SelectItem>
                    <SelectItem value="75">Grande (75%)</SelectItem>
                    <SelectItem value="100">Largura Total (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Alinhamento</Label>
                <Select
                  value={imgAlinhamento}
                  onValueChange={(v) =>
                    setImgAlinhamento(v as "left" | "center" | "right")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Alinhada à Esquerda</SelectItem>
                    <SelectItem value="center">Centralizada</SelectItem>
                    <SelectItem value="right">Alinhada à Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Legenda & Contexto da Fotografia / Imagem (Preservação NOBRADE)</Label>
              <Textarea
                rows={2}
                value={imgLegendaContexto}
                onChange={(e) => setImgLegendaContexto(e.target.value)}
                placeholder="Ex: Fotografia de José Américo de Almeida em gabinete (João Pessoa, 1935)..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fonte / Fundo / Autoria da Imagem</Label>
              <Input
                value={imgFonteAutoria}
                onChange={(e) => setImgFonteAutoria(e.target.value)}
                placeholder="Ex: Fundo José Américo — Arquivo Fotográfico FCJA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImagem(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarInsercaoImagem}>Inserir no Documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: PROTOCOLAR E CAPTURAR DOCUMENTO NATODIGITAL NO SIGAD */}
      <Dialog open={modalCapturaSigad} onOpenChange={setModalCapturaSigad}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" /> Captura Arquivística Natodigital · e-ARQ Brasil v2
              </span>
            </div>
            <DialogTitle className="mt-1">
              Protocolar e Capturar{" "}
              {arquivoPlanilhaPronto
                ? "Planilha (.xlsx)"
                : `Documento (.${formatoCaptura.toUpperCase()})`}{" "}
              no SIGAD
            </DialogTitle>
            <DialogDescription>
              Escolha o formato de preservação/armazenamento abaixo. O sistema irá empacotar o
              arquivo criado, calcular o hash criptográfico <strong>SHA-256 (PREMIS)</strong>,
              atribuir o <strong>Número Único de Protocolo (NUP)</strong> e indexar sua{" "}
              <strong>Descrição Contextual (`dc.description`)</strong> para o Archivematica e AtoM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={executarCapturaDiretaNoSigad} className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-5">
                <Label>Nome do Arquivo a Protocolar</Label>
                <Input
                  required
                  value={
                    arquivoPlanilhaPronto
                      ? arquivoPlanilhaPronto.name.replace(/\.xlsx$/i, "")
                      : tituloDoc
                  }
                  onChange={(e) => setTituloDoc(e.target.value)}
                  disabled={!!arquivoPlanilhaPronto}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label>Formato do Arquivo</Label>
                <Select
                  value={arquivoPlanilhaPronto ? "xlsx" : formatoCaptura}
                  onValueChange={(v) => setFormatoCaptura(v as FormatoCapturaSigad)}
                  disabled={!!arquivoPlanilhaPronto}
                >
                  <SelectTrigger className="font-mono text-xs font-bold text-blue-700 bg-blue-50/60 border-blue-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">.PDF (Preservação / Leitura)</SelectItem>
                    <SelectItem value="docx">.DOCX (Microsoft Word)</SelectItem>
                    <SelectItem value="xlsx">.XLSX (Planilha Excel)</SelectItem>
                    <SelectItem value="csv">.CSV (Dados Tabulares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-4">
                <Label>Autor / Produtor Arquivístico</Label>
                <Input
                  required
                  value={capAutor}
                  onChange={(e) => setCapAutor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Núcleo de Pesquisa Produtor</Label>
              <Select
                value={capNucleo}
                onValueChange={(v) => {
                  setCapNucleo(v);
                  setCapSigla(SIGLA_POR_NUCLEO[v] || "FCJA");
                }}
              >
                <SelectTrigger className="w-full [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,40rem)]">
                  {NUCLEOS.filter((n) => n !== "Todos").map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição Contextual / Âmbito e Conteúdo (Preservação OAIS / Hipátia / AtoM) */}
            <div className="space-y-1.5 rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="font-semibold text-slate-900">
                  Descrição / Contexto do Documento (Âmbito e Conteúdo — Preservação Digital)
                </Label>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  Exportado em <code>dc.description</code> (Archivematica / AtoM)
                </span>
              </div>
              <Textarea
                rows={3}
                value={capDescricaoContextual}
                onChange={(e) => setCapDescricaoContextual(e.target.value)}
                placeholder="Descreva o contexto histórico, objetivos, fontes analisadas ou informações essenciais para que este documento possa ser interpretado no futuro..."
                className="bg-white text-sm"
              />
            </div>

            {/* Classificação PCD / Natureza da Atividade */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5 font-semibold">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Natureza da Atividade & Classe PCD / TTD
                </Label>
                <div className="inline-flex rounded-lg border bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCapTipoAtividade("Atividade-Fim");
                      if (classesFim[0]) {
                        setCapCodigoClasse(classesFim[0].codigo);
                        setCapDescricaoClasse(classesFim[0].titulo);
                      }
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      capTipoAtividade === "Atividade-Fim"
                        ? "bg-purple-600 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    Atividade-Fim (Guarda Permanente)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCapTipoAtividade("Atividade-Meio");
                      setCapCodigoClasse("");
                      setCapDescricaoClasse("");
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      capTipoAtividade === "Atividade-Meio"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    Atividade-Meio (Administrativa)
                  </button>
                </div>
              </div>

              {capTipoAtividade === "Atividade-Fim" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Classe Finalística (PCD FCJA)</Label>
                    <Select
                      value={capCodigoClasse || classesFim[0]?.codigo || "FIM.100.01.001"}
                      onValueChange={(cod) => {
                        const cl = classesFim.find((c) => c.codigo === cod);
                        setCapCodigoClasse(cod);
                        setCapDescricaoClasse(cl?.titulo || "");
                      }}
                    >
                      <SelectTrigger className="bg-white [&>span]:truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-w-xl">
                        {classesFim.map((c) => (
                          <SelectItem key={c.codigo} value={c.codigo}>
                            {c.codigo} — {c.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Espécie / Tipologia Documental</Label>
                    <Select value={capTipologia} onValueChange={setCapTipologia}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIPOLOGIAS_MEIO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <SeletorHierarquico
                  onSelecionar={(cod, desc) => {
                    setCapCodigoClasse(cod);
                    setCapDescricaoClasse(desc);
                  }}
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Espécie / Tipologia Documental</Label>
                    <Select value={capTipologia} onValueChange={setCapTipologia}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIPOLOGIAS_MEIO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </SeletorHierarquico>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Status Diplomático</Label>
                <Select value={capStatusDoc} onValueChange={setCapStatusDoc}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_DOCUMENTO_OPCOES.map((op) => (
                      <SelectItem key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  Nível de Acesso (LAI/LGPD)
                </Label>
                <Select value={capNivelAcesso} onValueChange={setCapNivelAcesso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEIS_ACESSO_OPCOES.map((op) => (
                      <SelectItem key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                  Juntada em Dossiê
                </Label>
                <Select value={capDossieId} onValueChange={setCapDossieId}>
                  <SelectTrigger className="[&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVULSO">Documento Avulso</SelectItem>
                    {dossiesAbertos.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.codigoDossie} — {d.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {capNivelAcesso !== "OSTENSIVO" && (
              <div className="space-y-1.5">
                <Label>Hipótese Legal de Restrição (LAI / LGPD)</Label>
                <Input
                  value={capHipoteseLegal}
                  onChange={(e) => setCapHipoteseLegal(e.target.value)}
                  placeholder="Ex: Art. 31 da Lei nº 12.527/2011 — Informação Pessoal"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalCapturaSigad(false)}
                disabled={capturandoNoSigad}
              >
                Voltar ao Editor
              </Button>
              <Button
                type="submit"
                disabled={capturandoNoSigad}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                {capturandoNoSigad
                  ? "Protocolando e Calculando SHA-256..."
                  : "Confirmar Captura no SIGAD"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
