/**
 * Motor de Templates Arquivísticos, Geração de Documentos (.docx / .xlsx)
 * e Impressão A4 de Alta Fidelidade do Estúdio SIGAD Docs (SRP).
 */
import * as XLSX from "xlsx";

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

/**
 * Monta um documento HTML completo compatível com Microsoft Word (.docx / .doc)
 * contendo configurações de página (@page A4), cabeçalho, corpo estilizado,
 * tabelas, imagens base64 e rodapé institucional.
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
         ${cfg.mostrarNumeracaoPagina ? "<span> 1</span>" : ""}
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

/**
 * Gera um objeto File (.docx) pronto para download local ou envio ao endpoint
 * POST /api/upload do SIGAD (onde recebe protocolo NUP e hash SHA-256).
 */
export function gerarArquivoDocxParaCaptura(
  nomeBase: string,
  corpoHtml: string,
  cfg: ConfigPaginaEditor
): File {
  const nomeLimpo = nomeBase.trim().replace(/\.(docx|doc|pdf|xlsx)$/i, "") || "Documento_SIGAD";
  const nomeFinal = `${nomeLimpo}.docx`;
  const conteudoHtmlWord = construirDocumentoWordHtml(nomeLimpo, corpoHtml, cfg);
  const blob = new Blob(["\ufeff", conteudoHtmlWord], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return new File([blob], nomeFinal, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Gera um objeto File (.xlsx) real a partir de uma matriz de dados da planilha integrada
 * usando SheetJS (XLSX), pronto para download ou captura direta no SIGAD.
 */
export function gerarArquivoXlsxParaCaptura(
  nomeBase: string,
  nomeAba: string,
  colunas: string[],
  linhas: string[][]
): File {
  const nomeLimpo = nomeBase.trim().replace(/\.(xlsx|xls|csv|docx|pdf)$/i, "") || "Planilha_SIGAD";
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
