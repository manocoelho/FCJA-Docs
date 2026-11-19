/**
 * Motor de Templates Arquivísticos, Geração Multi-Formato (.pdf, .docx, .xlsx, .csv, .odt, .html, .txt, .md)
 * e Impressão A4 de Alta Fidelidade do Estúdio SIGAD Docs (SRP).
 */
import * as XLSX from "xlsx";

export type FormatoExportacaoEditor =
  | "pdf"
  | "docx"
  | "xlsx"
  | "csv"
  | "odt"
  | "html"
  | "txt"
  | "md";

export type FormatoCapturaSigad = "pdf" | "docx" | "xlsx" | "csv";

export const OPCOES_FORMATO_EDITOR: ReadonlyArray<{
  valor: FormatoExportacaoEditor;
  extensao: string;
  rotuloCurto: string;
  rotuloCompleto: string;
  descricao: string;
  suportaCapturaSigad: boolean;
}> = [
  {
    valor: "pdf",
    extensao: ".pdf",
    rotuloCurto: ".PDF",
    rotuloCompleto: "Documento PDF (.pdf) — Preservação & Leitura Universal",
    descricao: "Gera arquivo PDF A4 paginado nativo (abre direto no visualizador do SIGAD)",
    suportaCapturaSigad: true,
  },
  {
    valor: "docx",
    extensao: ".docx",
    rotuloCurto: ".DOCX",
    rotuloCompleto: "Microsoft Word (.docx) — Documento de Texto Editável",
    descricao: "Compatível com Microsoft Word, LibreOffice Writer e Google Docs",
    suportaCapturaSigad: true,
  },
  {
    valor: "xlsx",
    extensao: ".xlsx",
    rotuloCurto: ".XLSX",
    rotuloCompleto: "Planilha Microsoft Excel (.xlsx) — Tabelas & Dados",
    descricao: "Converte as tabelas e estruturas do documento em planilha Excel multi-abas",
    suportaCapturaSigad: true,
  },
  {
    valor: "csv",
    extensao: ".csv",
    rotuloCurto: ".CSV",
    rotuloCompleto: "Dados Tabulares Abertos (.csv) — UTF-8",
    descricao: "Exporta tabelas e linhas em formato aberto separado por ponto e vírgula",
    suportaCapturaSigad: true,
  },
  {
    valor: "odt",
    extensao: ".odt",
    rotuloCurto: ".ODT",
    rotuloCompleto: "OpenDocument Text (.odt) — LibreOffice / Padrão Aberto",
    descricao: "Formato aberto ISO/IEC 26300 para suites de escritório livres",
    suportaCapturaSigad: false,
  },
  {
    valor: "html",
    extensao: ".html",
    rotuloCurto: ".HTML",
    rotuloCompleto: "Página Web Autocontida (.html) — HTML5 A4",
    descricao: "Documento web completo com estilos, cabeçalho, tabelas e imagens embutidas",
    suportaCapturaSigad: false,
  },
  {
    valor: "txt",
    extensao: ".txt",
    rotuloCurto: ".TXT",
    rotuloCompleto: "Texto Puro (.txt) — UTF-8 Sem Formatação",
    descricao: "Extrai todo o conteúdo textual estruturado em texto simples universal",
    suportaCapturaSigad: false,
  },
  {
    valor: "md",
    extensao: ".md",
    rotuloCurto: ".MD",
    rotuloCompleto: "Documento Markdown (.md) — Documentação Técnica",
    descricao: "Converte títulos, listas, citações e tabelas para sintaxe Markdown",
    suportaCapturaSigad: false,
  },
] as const;

export interface ConfigPaginaEditor {
  mostrarCabecalho: boolean;
  mostrarRodape: boolean;
  cabecalhoInstituicao: string;
  cabecalhoSubtitulo: string;
  rodapeTexto: string;
  mostrarNumeracaoPagina: boolean;
  orientacao: "retrato" | "paisagem";
  margem: "abnt" | "normal" | "estreita" | "larga";
  espacamentoLinhas: "1.0" | "1.15" | "1.5" | "2.0";
  zoom: number;
}

export interface TemplateEditorialSigad {
  id: string;
  nome: string;
  categoriaSugerida: string;
  tipoAtividadeSugerida: "Atividade-Fim" | "Atividade-Meio";
  descricaoSugerida: string;
  cabecalhoSubtitulo: string;
  htmlCorpo: string;
}

export const TEMPLATES_EDITOR_SIGAD: TemplateEditorialSigad[] = [
  {
    id: "em_branco",
    nome: "Documento em Branco (Folha A4)",
    categoriaSugerida: "Documento",
    tipoAtividadeSugerida: "Atividade-Fim",
    descricaoSugerida: "",
    cabecalhoSubtitulo: "Núcleo de Pesquisa e Documentação Arquivística — SIGAD FCJA",
    htmlCorpo: `
      <h1 style="font-size: 20pt; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Título do Documento Arquivístico</h1>
      <p style="font-size: 11pt; color: #475569; margin-bottom: 16px;"><em>Subtítulo ou referência temática do núcleo de pesquisa</em></p>
      <p style="font-size: 12pt; line-height: 1.5; text-align: justify;">Comece a redigir o conteúdo do documento aqui. Utilize a barra de ferramentas superior para formatar parágrafos, inserir tabelas, planilhas calculadas, fotografias contextualizadas, citações e quebras de página.</p>
    `,
  },
  {
    id: "relatorio_pesquisa",
    nome: "Relatório Técnico de Pesquisa Histórica / Patrimonial",
    categoriaSugerida: "Relatório",
    tipoAtividadeSugerida: "Atividade-Fim",
    descricaoSugerida:
      "Relatório técnico circunstanciado de pesquisa documental e levantamento de fontes primárias produzido no âmbito dos núcleos de pesquisa da FCJA.",
    cabecalhoSubtitulo: "Relatório Técnico de Pesquisa — Guarda Permanente (RDC-Arq)",
    htmlCorpo: `
      <h1 style="font-size: 18pt; font-weight: 700; text-align: center; text-transform: uppercase; margin-bottom: 6px;">Relatório Técnico de Pesquisa Documental</h1>
      <p style="font-size: 11pt; text-align: center; color: #334155; margin-bottom: 20px;"><strong>Fundação Casa de José Américo (FCJA)</strong> · João Pessoa - PB</p>
      <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 16px 0;" />
      <h2 style="font-size: 14pt; font-weight: 700; color: #1e3a8a; margin-top: 16px; margin-bottom: 8px;">1. Identificação e Contexto do Objeto de Pesquisa</h2>
      <p style="font-size: 12pt; text-align: justify; margin-bottom: 12px;">Descreva aqui o escopo histórico, documental ou arqueológico do levantamento realizado pelo núcleo, especificando o período cronológico (datas-limite), o fundo documental e os objetivos alcançados.</p>
      <h2 style="font-size: 14pt; font-weight: 700; color: #1e3a8a; margin-top: 16px; margin-bottom: 8px;">2. Quadro Descritivo de Fontes Levantadas</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 10.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Código / Cota</th>
            <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Título / Espécie Documental</th>
            <th style="border: 1px solid #94a3b8; padding: 8px; text-align: center;">Data-Limite</th>
            <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Estado de Conservação / Contexto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">FCJA-DOC-001</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Correspondência / Manuscrito</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1930</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Digitalizado em matriz TIFF 300 DPI</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">FCJA-DOC-002</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Recorte Hemerográfico</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1932</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Íntegro, catalogado para o AtoM</td>
          </tr>
        </tbody>
      </table>
      <h2 style="font-size: 14pt; font-weight: 700; color: #1e3a8a; margin-top: 16px; margin-bottom: 8px;">3. Parecer Técnico e Encaminhamento para Preservação (RDC-Arq)</h2>
      <p style="font-size: 12pt; text-align: justify;">Registre as conclusões da equipe técnica e as recomendações de descrição NOBRADE para futura admissão no Archivematica e difusão no portal AtoM.</p>
    `,
  },
  {
    id: "dossie_iconografico",
    nome: "Ficha de Contextualização Fotográfica / Iconográfica (NOBRADE)",
    categoriaSugerida: "Dossiê",
    tipoAtividadeSugerida: "Atividade-Fim",
    descricaoSugerida:
      "Dossiê descritivo e contextual de registro fotográfico/audiovisual contendo identificação de personalidades, local, data tópica e contexto histórico para preservação OAIS.",
    cabecalhoSubtitulo: "Acervo Iconográfico e Audiovisual — Contextualização NOBRADE / OAIS",
    htmlCorpo: `
      <h1 style="font-size: 17pt; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Ficha de Contextualização de Registro Iconográfico / Fotográfico</h1>
      <p style="font-size: 10.5pt; color: #475569; margin-bottom: 16px;">Padrão de Informação de Representação e Contexto (NOBRADE / Modelo OAIS ISO 14721)</p>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt;">
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; width: 32%; font-weight: 700;">Título Atribuído / Legenda:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">[Informe o título formal da fotografia ou conjunto iconográfico]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-weight: 700;">Data Tópica e Cronológica:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">João Pessoa - PB, [Dia/Mês/Ano ou década aproximada]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-weight: 700;">Autoria / Fotógrafo / Estúdio:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">[Nome do fotógrafo ou agência produtora]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-weight: 700;">Pessoas / Personalidades Identificadas:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">[Da esquerda para a direita: Nome 1, Nome 2, Nome 3...]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-weight: 700;">Dimensão, Suporte e Cromia:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Fotografia em Preto e Branco (P&amp;B) / Papel Gelatina-Prata / Matriz Digital</td>
          </tr>
        </tbody>
      </table>
      <h2 style="font-size: 13pt; font-weight: 700; color: #1e3a8a; margin-top: 16px; margin-bottom: 6px;">Contexto Histórico e Âmbito e Conteúdo (dc.description)</h2>
      <p style="font-size: 12pt; text-align: justify; margin-bottom: 12px;">Descreva detalhadamente o evento retratado, a relevância histórica do registro, o ambiente arquitetônico ou paisagístico e as conexões com outros documentos do fundo da Fundação Casa de José Américo. Utilize o botão <strong>"Imagem"</strong> na barra de ferramentas acima para inserir a reprodução fotográfica diretamente abaixo.</p>
    `,
  },
  {
    id: "oficio_institucional",
    nome: "Ofício / Comunicação Interna Institucional FCJA",
    categoriaSugerida: "Ofício",
    tipoAtividadeSugerida: "Atividade-Meio",
    descricaoSugerida:
      "Expediente administrativo oficial emitido no âmbito da Fundação Casa de José Américo.",
    cabecalhoSubtitulo: "Gerência Executiva de Documentação e Arquivo (GEDA / FCJA)",
    htmlCorpo: `
      <p style="font-size: 11.5pt; font-weight: 700; margin-bottom: 4px;">OFÍCIO Nº 001/${new Date().getFullYear()} — GEDA/FCJA</p>
      <p style="font-size: 11.5pt; text-align: right; margin-bottom: 20px;">João Pessoa - PB, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.</p>
      <p style="font-size: 11.5pt; margin-bottom: 4px;"><strong>Ao(À) Senhor(a):</strong></p>
      <p style="font-size: 11.5pt; margin-bottom: 4px;">[Nome do Destinatário]</p>
      <p style="font-size: 11.5pt; margin-bottom: 18px;">[Cargo / Setor / Instituição]</p>
      <p style="font-size: 11.5pt; font-weight: 700; margin-bottom: 16px;">Assunto: Encaminhamento de Documentação Arquivística Digital</p>
      <p style="font-size: 12pt; text-align: justify; text-indent: 2cm; margin-bottom: 12px;">Senhor(a) Coordenador(a),</p>
      <p style="font-size: 12pt; text-align: justify; text-indent: 2cm; margin-bottom: 12px;">1. Encaminhamos, por meio deste expediente protocolado no Sistema Informatizado de Gestão Arquivística de Documentos (SIGAD FCJA), os registros referentes às atividades desenvolvidas pelo núcleo.</p>
      <p style="font-size: 12pt; text-align: justify; text-indent: 2cm; margin-bottom: 28px;">2. Permanecemos à disposição para esclarecimentos técnicos adicionais.</p>
      <p style="font-size: 12pt; text-align: center; margin-top: 36px;">Atenciosamente,</p>
      <p style="font-size: 12pt; text-align: center; font-weight: 700; margin-top: 28px;">__________________________________________________<br/>Responsável Técnico / Pesquisador<br/><span style="font-weight: 400; font-size: 10.5pt;">Fundação Casa de José Américo (FCJA)</span></p>
    `,
  },
  {
    id: "ata_reuniao",
    nome: "Ata de Reunião de Núcleo de Pesquisa",
    categoriaSugerida: "Ata",
    tipoAtividadeSugerida: "Atividade-Meio",
    descricaoSugerida:
      "Ata de reunião ordinária/extraordinária de acompanhamento das metas de pesquisa e preservação documental.",
    cabecalhoSubtitulo: "Registro de Deliberações e Acompanhamento de Projeto",
    htmlCorpo: `
      <h1 style="font-size: 16pt; font-weight: 700; text-align: center; text-transform: uppercase; margin-bottom: 16px;">Ata de Reunião Técnica — Núcleo de Pesquisa FCJA</h1>
      <p style="font-size: 12pt; text-align: justify; margin-bottom: 12px;">Aos <strong>${new Date().getDate()} dias do mês de ${new Date().toLocaleDateString("pt-BR", { month: "long" })} de ${new Date().getFullYear()}</strong>, reuniram-se os pesquisadores e arquivistas da Fundação Casa de José Américo para deliberar sobre a seguinte pauta:</p>
      <ol style="font-size: 12pt; margin-left: 24px; margin-bottom: 16px;">
        <li>Revisão e indexação dos documentos capturados no SIGAD;</li>
        <li>Preenchimento dos metadados de contexto e descrição (NOBRADE) para preservação no Archivematica;</li>
        <li>Organização dos Dossiês Temáticos do núcleo.</li>
      </ol>
      <h2 style="font-size: 13pt; font-weight: 700; color: #1e3a8a; margin-bottom: 8px;">Deliberações e Encaminhamentos</h2>
      <p style="font-size: 12pt; text-align: justify;">Ficou definido pela equipe que todos os documentos produzidos serão acompanhados de descrição contextual detalhada para assegurar sua interpretabilidade futura no Repositório Arquivístico Digital Confiável (RDC-Arq).</p>
    `,
  },
];

function limparExtensoesNome(nomeBase: string): string {
  return (
    nomeBase
      .trim()
      .replace(/\.(docx|doc|pdf|xlsx|xls|csv|odt|html|htm|txt|md)$/i, "")
      .trim() || "Documento_SIGAD"
  );
}

/**
 * Monta um documento HTML completo compatível com Microsoft Word (.docx / .doc),
 * LibreOffice (.odt) e navegadores (.html).
 */
export function construirDocumentoWordHtml(
  titulo: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): string {
  const tamanhoPagina =
    cfg.orientacao === "paisagem" ? "29.7cm 21.0cm" : "21.0cm 29.7cm";
  const margensCss =
    cfg.margem === "abnt"
      ? "3cm 2cm 2cm 3cm"
      : cfg.margem === "estreita"
        ? "1.27cm 1.27cm 1.27cm 1.27cm"
        : cfg.margem === "larga"
          ? "2.54cm 3.17cm 2.54cm 3.17cm"
          : "2.5cm 2.5cm 2.5cm 2.5cm";

  const cabecalhoBloco = cfg.mostrarCabecalho
    ? `<div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-family: Arial, sans-serif;">
         <p style="margin: 0; font-size: 11pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">${cfg.cabecalhoInstituicao}</p>
         <p style="margin: 2px 0 0 0; font-size: 9pt; color: #475569;">${cfg.cabecalhoSubtitulo}</p>
       </div>`
    : "";

  const rodapeBloco = cfg.mostrarRodape
    ? `<div style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 32px; font-family: Arial, sans-serif; font-size: 8.5pt; color: #64748b; display: flex; justify-content: space-between;">
         <span>${cfg.rodapeTexto}</span>
         ${cfg.mostrarNumeracaoPagina ? "<span>Página 1</span>" : ""}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${titulo}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: ${tamanhoPagina};
      margin: ${margensCss};
    }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 12pt;
      line-height: ${cfg.espacamentoLinhas};
      color: #0f172a;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    blockquote {
      margin-left: 4cm;
      font-size: 10pt;
      line-height: 1.15;
      border-left: 3px solid #cbd5e1;
      padding-left: 10px;
      color: #334155;
    }
  </style>
</head>
<body>
  ${cabecalhoBloco}
  <div class="documento-corpo">
    ${corpoHtml}
  </div>
  ${rodapeBloco}
</body>
</html>`;
}

// ============================================================================
// GERADOR NATIVO DE PDF (%PDF-1.4 A4 COM SUPORTE A ACENTUAÇÃO PT-BR WINANSI)
// ============================================================================

interface LinhaPdfEstruturada {
  texto: string;
  fonte: "F1" | "F2" | "F3"; // F1=Regular, F2=Bold, F3=Italic
  tamanhoPt: number;
  recuoX: number;
  espacoAntes: number;
  espacoDepois: number;
  corRgb: [number, number, number];
  linhaHorizontalAbaixo?: boolean;
}

function normalizarCaractereWinAnsi(texto: string): string {
  return texto
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022|\u00B7/g, "-")
    .replace(/\u00A0/g, " ");
}

function escaparStringLiteralPdf(texto: string): string {
  const norm = normalizarCaractereWinAnsi(texto);
  let out = "";
  for (let i = 0; i < norm.length; i++) {
    const code = norm.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += "\\" + norm[i];
    } else if (code >= 32 && code <= 126) {
      out += norm[i];
    } else if (code >= 160 && code <= 255) {
      out += "\\" + code.toString(8).padStart(3, "0");
    } else {
      out += " ";
    }
  }
  return out;
}

function quebrarTextoEmLinhas(texto: string, maxCharsPorLinha: number): string[] {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (!limpo) return [];
  const palavras = limpo.split(" ");
  const resultado: string[] = [];
  let atual = "";

  for (const p of palavras) {
    if (!atual) {
      atual = p;
    } else if (atual.length + 1 + p.length <= maxCharsPorLinha) {
      atual += " " + p;
    } else {
      resultado.push(atual);
      atual = p;
    }
  }
  if (atual) resultado.push(atual);
  return resultado;
}

function extrairLinhasEstruturadasDoHtml(
  corpoHtml: string,
  orientacao: "retrato" | "paisagem"
): LinhaPdfEstruturada[] {
  const linhas: LinhaPdfEstruturada[] = [];
  const maxBase = orientacao === "paisagem" ? 115 : 82;

  if (typeof DOMParser === "undefined") {
    const textoSimples = corpoHtml.replace(/<[^>]+>/g, " ").trim();
    for (const l of quebrarTextoEmLinhas(textoSimples, maxBase)) {
      linhas.push({
        texto: l,
        fonte: "F1",
        tamanhoPt: 11,
        recuoX: 0,
        espacoAntes: 2,
        espacoDepois: 4,
        corRgb: [0.06, 0.09, 0.16],
      });
    }
    return linhas;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${corpoHtml}</div>`, "text/html");
  const raiz = doc.body.firstElementChild || doc.body;

  function processarNo(el: Element) {
    const tag = el.tagName.toUpperCase();

    if (tag === "H1") {
      const partes = quebrarTextoEmLinhas(el.textContent || "", Math.floor(maxBase * 0.72));
      partes.forEach((p, i) => {
        linhas.push({
          texto: p,
          fonte: "F2",
          tamanhoPt: 16,
          recuoX: 0,
          espacoAntes: i === 0 ? 10 : 2,
          espacoDepois: i === partes.length - 1 ? 8 : 2,
          corRgb: [0.06, 0.09, 0.16],
        });
      });
      return;
    }

    if (tag === "H2" || tag === "H3") {
      const tam = tag === "H2" ? 13 : 11.5;
      const partes = quebrarTextoEmLinhas(el.textContent || "", Math.floor(maxBase * 0.82));
      partes.forEach((p, i) => {
        linhas.push({
          texto: p,
          fonte: "F2",
          tamanhoPt: tam,
          recuoX: 0,
          espacoAntes: i === 0 ? 10 : 2,
          espacoDepois: i === partes.length - 1 ? 6 : 2,
          corRgb: [0.12, 0.23, 0.54],
        });
      });
      return;
    }

    if (tag === "HR") {
      linhas.push({
        texto: "",
        fonte: "F1",
        tamanhoPt: 8,
        recuoX: 0,
        espacoAntes: 6,
        espacoDepois: 6,
        corRgb: [0.75, 0.8, 0.86],
        linhaHorizontalAbaixo: true,
      });
      return;
    }

    if (tag === "TABLE") {
      const trs = Array.from(el.querySelectorAll("tr"));
      trs.forEach((tr, rowIdx) => {
        const celulas = Array.from(tr.querySelectorAll("th, td")).map((c) =>
          (c.textContent || "").replace(/\s+/g, " ").trim()
        );
        const linhaTabela = celulas.join("  |  ");
        const ehHeader = tr.querySelector("th") !== null || rowIdx === 0;
        const partes = quebrarTextoEmLinhas(linhaTabela, Math.floor(maxBase * 0.92));
        partes.forEach((p, i) => {
          linhas.push({
            texto: p,
            fonte: ehHeader ? "F2" : "F1",
            tamanhoPt: 9.5,
            recuoX: 6,
            espacoAntes: i === 0 ? 4 : 1,
            espacoDepois: i === partes.length - 1 ? 4 : 1,
            corRgb: ehHeader ? [0.12, 0.23, 0.54] : [0.15, 0.2, 0.28],
            linhaHorizontalAbaixo: i === partes.length - 1,
          });
        });
      });
      return;
    }

    if (tag === "UL" || tag === "OL") {
      const itens = Array.from(el.querySelectorAll(":scope > li"));
      itens.forEach((li, idx) => {
        const prefixo = tag === "OL" ? `${idx + 1}. ` : "- ";
        const partes = quebrarTextoEmLinhas(
          prefixo + (li.textContent || ""),
          Math.floor(maxBase * 0.88)
        );
        partes.forEach((p, i) => {
          linhas.push({
            texto: p,
            fonte: "F1",
            tamanhoPt: 11,
            recuoX: 14,
            espacoAntes: i === 0 ? 3 : 1,
            espacoDepois: i === partes.length - 1 ? 3 : 1,
            corRgb: [0.06, 0.09, 0.16],
          });
        });
      });
      return;
    }

    if (tag === "BLOCKQUOTE") {
      const partes = quebrarTextoEmLinhas(el.textContent || "", Math.floor(maxBase * 0.78));
      partes.forEach((p, i) => {
        linhas.push({
          texto: p,
          fonte: "F3",
          tamanhoPt: 10,
          recuoX: 36,
          espacoAntes: i === 0 ? 6 : 1,
          espacoDepois: i === partes.length - 1 ? 6 : 1,
          corRgb: [0.25, 0.3, 0.38],
        });
      });
      return;
    }

    if (tag === "FIGURE") {
      const cap = el.querySelector("figcaption")?.textContent || "Imagem / Registro Iconográfico";
      const partes = quebrarTextoEmLinhas(`[Figura: ${cap}]`, Math.floor(maxBase * 0.88));
      partes.forEach((p) => {
        linhas.push({
          texto: p,
          fonte: "F3",
          tamanhoPt: 9.5,
          recuoX: 10,
          espacoAntes: 4,
          espacoDepois: 4,
          corRgb: [0.25, 0.3, 0.38],
        });
      });
      return;
    }

    if (tag === "P" || tag === "DIV") {
      // Se tiver filhos de bloco complexos (ex: table dentro de div), recursiona
      const temFilhoBloco = Array.from(el.children).some((c) =>
        ["TABLE", "UL", "OL", "H1", "H2", "H3", "BLOCKQUOTE", "FIGURE", "DIV", "P"].includes(
          c.tagName.toUpperCase()
        )
      );
      if (temFilhoBloco) {
        Array.from(el.children).forEach(processarNo);
        return;
      }

      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt) return;
      const ehItalico = el.querySelector("em, i") !== null && txt.length < 120;
      const ehNegrito = el.querySelector("strong, b") !== null && txt.length < 100;
      const partes = quebrarTextoEmLinhas(txt, maxBase);
      partes.forEach((p, i) => {
        linhas.push({
          texto: p,
          fonte: ehNegrito ? "F2" : ehItalico ? "F3" : "F1",
          tamanhoPt: 11,
          recuoX: 0,
          espacoAntes: i === 0 ? 4 : 1,
          espacoDepois: i === partes.length - 1 ? 5 : 1,
          corRgb: [0.06, 0.09, 0.16],
        });
      });
      return;
    }

    if (el.children.length > 0) {
      Array.from(el.children).forEach(processarNo);
    }
  }

  Array.from(raiz.children).forEach(processarNo);

  if (linhas.length === 0) {
    const txt = (raiz.textContent || "").trim() || "Documento SIGAD FCJA";
    quebrarTextoEmLinhas(txt, maxBase).forEach((l) => {
      linhas.push({
        texto: l,
        fonte: "F1",
        tamanhoPt: 11,
        recuoX: 0,
        espacoAntes: 2,
        espacoDepois: 4,
        corRgb: [0.06, 0.09, 0.16],
      });
    });
  }

  return linhas;
}

/**
 * Gera um arquivo binário PDF (%PDF-1.4) A4 real, multipágina, com cabeçalho,
 * rodapé, tabelas e acentuação completa (WinAnsiEncoding) para download ou captura no SIGAD.
 */
export function gerarArquivoPdfParaCaptura(
  nomeBase: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);
  const nomeFinal = `${nomeLimpo}.pdf`;

  const larguraPt = cfg.orientacao === "paisagem" ? 841.89 : 595.28;
  const alturaPt = cfg.orientacao === "paisagem" ? 595.28 : 841.89;
  const margemX = cfg.margem === "estreita" ? 36 : cfg.margem === "larga" ? 72 : 56;
  const topoInicialY = alturaPt - 54;
  const limiteRodapeY = 64;

  const linhasDoc = extrairLinhasEstruturadasDoHtml(corpoHtml, cfg.orientacao);
  const fatorEspaco = Number(cfg.espacamentoLinhas) || 1.35;

  // Paginação das linhas em páginas A4
  const paginas: LinhaPdfEstruturada[][] = [];
  let paginaAtual: LinhaPdfEstruturada[] = [];
  let cursorY = cfg.mostrarCabecalho ? topoInicialY - 46 : topoInicialY;

  for (const linha of linhasDoc) {
    const alturaLinha = linha.tamanhoPt * fatorEspaco + linha.espacoAntes + linha.espacoDepois;
    if (cursorY - alturaLinha < limiteRodapeY && paginaAtual.length > 0) {
      paginas.push(paginaAtual);
      paginaAtual = [];
      cursorY = cfg.mostrarCabecalho ? topoInicialY - 46 : topoInicialY;
    }
    paginaAtual.push(linha);
    cursorY -= alturaLinha;
  }
  if (paginaAtual.length > 0 || paginas.length === 0) {
    paginas.push(paginaAtual);
  }

  // Construção dos streams gráficos de cada página
  const streamsPaginas: string[] = paginas.map((linhasPag, idxPag) => {
    const cmds: string[] = [];
    let y = topoInicialY;

    // Cabeçalho Institucional
    if (cfg.mostrarCabecalho) {
      cmds.push("0.06 0.09 0.16 rg");
      cmds.push(
        `BT /F2 10 Tf ${margemX} ${y.toFixed(2)} Td (${escaparStringLiteralPdf(
          cfg.cabecalhoInstituicao
        )}) Tj ET`
      );
      y -= 13;
      cmds.push("0.28 0.33 0.41 rg");
      cmds.push(
        `BT /F1 8.5 Tf ${margemX} ${y.toFixed(2)} Td (${escaparStringLiteralPdf(
          cfg.cabecalhoSubtitulo
        )}) Tj ET`
      );
      y -= 8;
      cmds.push("0.12 0.23 0.54 RG 1.2 w");
      cmds.push(`${margemX} ${y.toFixed(2)} m ${(larguraPt - margemX).toFixed(2)} ${y.toFixed(2)} l S`);
      y -= 20;
    }

    // Corpo da página
    for (const l of linhasPag) {
      y -= l.espacoAntes + l.tamanhoPt;
      if (l.texto) {
        const [r, g, b] = l.corRgb;
        cmds.push(`${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg`);
        cmds.push(
          `BT /${l.fonte} ${l.tamanhoPt} Tf ${(margemX + l.recuoX).toFixed(2)} ${y.toFixed(
            2
          )} Td (${escaparStringLiteralPdf(l.texto)}) Tj ET`
        );
      }
      if (l.linhaHorizontalAbaixo) {
        const yLine = y - 4;
        cmds.push("0.80 0.84 0.88 RG 0.5 w");
        cmds.push(
          `${margemX} ${yLine.toFixed(2)} m ${(larguraPt - margemX).toFixed(2)} ${yLine.toFixed(
            2
          )} l S`
        );
      }
      y -= l.tamanhoPt * (fatorEspaco - 1) + l.espacoDepois;
    }

    // Rodapé Institucional
    if (cfg.mostrarRodape) {
      const yRodape = 38;
      cmds.push("0.80 0.84 0.88 RG 0.6 w");
      cmds.push(
        `${margemX} ${(yRodape + 11).toFixed(2)} m ${(larguraPt - margemX).toFixed(2)} ${(
          yRodape + 11
        ).toFixed(2)} l S`
      );
      cmds.push("0.39 0.45 0.55 rg");
      cmds.push(
        `BT /F1 8 Tf ${margemX} ${yRodape} Td (${escaparStringLiteralPdf(
          cfg.rodapeTexto.slice(0, 95)
        )}) Tj ET`
      );
      if (cfg.mostrarNumeracaoPagina) {
        const txtPag = `Pagina ${idxPag + 1} de ${paginas.length}`;
        cmds.push(
          `BT /F2 8 Tf ${(larguraPt - margemX - 65).toFixed(2)} ${yRodape} Td (${escaparStringLiteralPdf(
            txtPag
          )}) Tj ET`
        );
      }
    }

    return cmds.join("\n");
  });

  // Montagem da estrutura de objetos PDF 1.4
  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Font F1 (Times-Roman), Obj 4: Font F2 (Times-Bold), Obj 5: Font F3 (Times-Italic)
  const objetosPdf: string[] = [];
  objetosPdf[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objetosPdf[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>";
  objetosPdf[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>";
  objetosPdf[5] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>";

  const kidsRefs: string[] = [];
  let proximoIdObj = 6;

  for (const stream of streamsPaginas) {
    const idPag = proximoIdObj++;
    const idConteudo = proximoIdObj++;
    kidsRefs.push(`${idPag} 0 R`);

    objetosPdf[idPag] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larguraPt.toFixed(2)} ${alturaPt.toFixed(
        2
      )}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${idConteudo} 0 R >>`;
    objetosPdf[idConteudo] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }

  objetosPdf[2] = `<< /Type /Pages /Kids [${kidsRefs.join(" ")}] /Count ${paginas.length} >>`;

  // Serialização com tabela xref exata
  let pdfStr = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 1; i < objetosPdf.length; i++) {
    offsets[i] = pdfStr.length;
    pdfStr += `${i} 0 obj\n${objetosPdf[i]}\nendobj\n`;
  }

  const startXref = pdfStr.length;
  pdfStr += `xref\n0 ${objetosPdf.length}\n`;
  pdfStr += "0000000000 65535 f \n";
  for (let i = 1; i < objetosPdf.length; i++) {
    pdfStr += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdfStr += `trailer\n<< /Size ${objetosPdf.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  // Converte string Latin1 para Uint8Array preservando os bytes 0x00-0xFF
  const bytes = new Uint8Array(pdfStr.length);
  for (let i = 0; i < pdfStr.length; i++) {
    bytes[i] = pdfStr.charCodeAt(i) & 0xff;
  }

  return new File([bytes], nomeFinal, { type: "application/pdf" });
}

// ============================================================================
// GERADORES DE .DOCX, .ODT, .HTML, .XLSX, .CSV, .TXT E .MD
// ============================================================================

export function gerarArquivoDocxParaCaptura(
  nomeBase: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);
  const nomeFinal = `${nomeLimpo}.docx`;
  const conteudoHtmlWord = construirDocumentoWordHtml(nomeLimpo, corpoHtml, cfg);
  const blob = new Blob(["\ufeff", conteudoHtmlWord], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return new File([blob], nomeFinal, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function gerarArquivoXlsxParaCaptura(
  nomeBase: string,
  nomeAba: string,
  colunas: string[],
  linhas: string[][]
): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);
  const nomeFinal = `${nomeLimpo}.xlsx`;

  const aoa: string[][] = [colunas, ...linhas];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = colunas.map((c) => ({ wch: Math.max(16, c.length + 6) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (nomeAba || "Dados_FCJA").slice(0, 31));

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return new File([blob], nomeFinal, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Extrai todas as tabelas (ou linhas estruturadas do documento) do HTML do editor
 * para matrizes [colunas, ...linhas], permitindo salvar qualquer documento do editor
 * como Planilha Excel (.xlsx) ou Dados Abertos (.csv).
 */
export function extrairMatrizTabularDoHtml(
  titulo: string,
  corpoHtml: string
): { colunas: string[]; linhas: string[][] } {
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${corpoHtml}</div>`, "text/html");
    const tabela = doc.querySelector("table");

    if (tabela) {
      const trs = Array.from(tabela.querySelectorAll("tr"));
      if (trs.length > 0) {
        const primeira = Array.from(trs[0]!.querySelectorAll("th, td")).map((c) =>
          (c.textContent || "").replace(/\s+/g, " ").trim()
        );
        const restantes = trs.slice(1).map((tr) =>
          Array.from(tr.querySelectorAll("th, td")).map((c) =>
            (c.textContent || "").replace(/\s+/g, " ").trim()
          )
        );
        return {
          colunas: primeira.length > 0 ? primeira : ["Coluna 1"],
          linhas: restantes,
        };
      }
    }

    // Caso o documento não possua <table>, estrutura os parágrafos e seções em formato tabular
    const blocos = Array.from(doc.querySelectorAll("h1, h2, h3, p, li, blockquote"))
      .map((el) => ({
        tipo: el.tagName.toUpperCase(),
        texto: (el.textContent || "").replace(/\s+/g, " ").trim(),
      }))
      .filter((b) => b.texto.length > 0);

    if (blocos.length > 0) {
      return {
        colunas: ["Ordem", "Elemento Estrutural", "Conteúdo / Descrição no Documento"],
        linhas: blocos.map((b, idx) => [String(idx + 1), b.tipo, b.texto]),
      };
    }
  }

  return {
    colunas: ["Documento", "Conteúdo"],
    linhas: [[titulo, corpoHtml.replace(/<[^>]+>/g, " ").trim()]],
  };
}

export function gerarArquivoCsvDoHtml(nomeBase: string, corpoHtml: string): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);
  const { colunas, linhas } = extrairMatrizTabularDoHtml(nomeLimpo, corpoHtml);
  const todas = [colunas, ...linhas];

  const escaparCsv = (val: string) => {
    const limpo = (val || "").replace(/"/g, '""');
    return `"${limpo}"`;
  };

  const conteudoCsv = todas.map((row) => row.map(escaparCsv).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff", conteudoCsv], {
    type: "text/csv;charset=utf-8",
  });
  return new File([blob], `${nomeLimpo}.csv`, { type: "text/csv;charset=utf-8" });
}

export function gerarArquivoTextoPuroDoHtml(
  nomeBase: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);
  const linhas = extrairLinhasEstruturadasDoHtml(corpoHtml, cfg.orientacao);
  const partes: string[] = [];

  if (cfg.mostrarCabecalho) {
    partes.push(cfg.cabecalhoInstituicao.toUpperCase());
    partes.push(cfg.cabecalhoSubtitulo);
    partes.push("=".repeat(72));
    partes.push("");
  }

  for (const l of linhas) {
    if (l.linhaHorizontalAbaixo && !l.texto) {
      partes.push("-".repeat(72));
    } else {
      partes.push(l.texto);
    }
  }

  if (cfg.mostrarRodape) {
    partes.push("");
    partes.push("-".repeat(72));
    partes.push(cfg.rodapeTexto);
  }

  const blob = new Blob(["\ufeff", partes.join("\r\n")], {
    type: "text/plain;charset=utf-8",
  });
  return new File([blob], `${nomeLimpo}.txt`, { type: "text/plain;charset=utf-8" });
}

export function gerarArquivoMarkdownDoHtml(
  nomeBase: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);
  const linhas: string[] = [];

  if (cfg.mostrarCabecalho) {
    linhas.push(`> **${cfg.cabecalhoInstituicao}**  `);
    linhas.push(`> *${cfg.cabecalhoSubtitulo}*`);
    linhas.push("");
    linhas.push("---");
    linhas.push("");
  }

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${corpoHtml}</div>`, "text/html");
    const raiz = doc.body.firstElementChild || doc.body;

    Array.from(raiz.children).forEach((el) => {
      const tag = el.tagName.toUpperCase();
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (tag === "H1") linhas.push(`# ${txt}\n`);
      else if (tag === "H2") linhas.push(`## ${txt}\n`);
      else if (tag === "H3") linhas.push(`### ${txt}\n`);
      else if (tag === "HR") linhas.push(`---\n`);
      else if (tag === "BLOCKQUOTE") linhas.push(`> ${txt}\n`);
      else if (tag === "UL") {
        Array.from(el.querySelectorAll("li")).forEach((li) => {
          linhas.push(`- ${(li.textContent || "").trim()}`);
        });
        linhas.push("");
      } else if (tag === "OL") {
        Array.from(el.querySelectorAll("li")).forEach((li, i) => {
          linhas.push(`${i + 1}. ${(li.textContent || "").trim()}`);
        });
        linhas.push("");
      } else if (tag === "TABLE") {
        const trs = Array.from(el.querySelectorAll("tr"));
        trs.forEach((tr, rIdx) => {
          const cols = Array.from(tr.querySelectorAll("th, td")).map((c) =>
            (c.textContent || "").replace(/\s+/g, " ").trim()
          );
          linhas.push(`| ${cols.join(" | ")} |`);
          if (rIdx === 0) {
            linhas.push(`| ${cols.map(() => "---").join(" | ")} |`);
          }
        });
        linhas.push("");
      } else if (txt) {
        linhas.push(`${txt}\n`);
      }
    });
  }

  if (cfg.mostrarRodape) {
    linhas.push("---");
    linhas.push(`*${cfg.rodapeTexto}*`);
  }

  const blob = new Blob(["\ufeff", linhas.join("\n")], {
    type: "text/markdown;charset=utf-8",
  });
  return new File([blob], `${nomeLimpo}.md`, { type: "text/markdown;charset=utf-8" });
}

/**
 * Ponto único de geração de arquivo (File) em qualquer um dos 8 formatos suportados
 * (.pdf, .docx, .xlsx, .csv, .odt, .html, .txt, .md) — SRP.
 */
export function gerarArquivoPorFormatoEditor(
  formato: FormatoExportacaoEditor,
  nomeBase: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): File {
  const nomeLimpo = limparExtensoesNome(nomeBase);

  switch (formato) {
    case "pdf":
      return gerarArquivoPdfParaCaptura(nomeLimpo, corpoHtml, cfg);
    case "docx":
      return gerarArquivoDocxParaCaptura(nomeLimpo, corpoHtml, cfg);
    case "xlsx": {
      const { colunas, linhas } = extrairMatrizTabularDoHtml(nomeLimpo, corpoHtml);
      return gerarArquivoXlsxParaCaptura(nomeLimpo, "Documento_FCJA", colunas, linhas);
    }
    case "csv":
      return gerarArquivoCsvDoHtml(nomeLimpo, corpoHtml);
    case "odt": {
      const htmlOdt = construirDocumentoWordHtml(nomeLimpo, corpoHtml, cfg);
      return new File(["\ufeff", htmlOdt], `${nomeLimpo}.odt`, {
        type: "application/vnd.oasis.opendocument.text",
      });
    }
    case "html": {
      const htmlDoc = construirDocumentoWordHtml(nomeLimpo, corpoHtml, cfg);
      return new File(["\ufeff", htmlDoc], `${nomeLimpo}.html`, {
        type: "text/html;charset=utf-8",
      });
    }
    case "txt":
      return gerarArquivoTextoPuroDoHtml(nomeLimpo, corpoHtml, cfg);
    case "md":
      return gerarArquivoMarkdownDoHtml(nomeLimpo, corpoHtml, cfg);
    default:
      return gerarArquivoDocxParaCaptura(nomeLimpo, corpoHtml, cfg);
  }
}

/**
 * Abre janela de impressão paginada A4 (com opção nativa de "Salvar como PDF").
 */
export function imprimirOuSalvarPdfEditor(
  titulo: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): void {
  const htmlCompleto = construirDocumentoWordHtml(titulo, corpoHtml, cfg);
  const win = window.open("", "_blank", "width=960,height=800");
  if (!win) return;
  win.document.open();
  win.document.write(htmlCompleto);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}
