import type { Doc } from "./data";
import {
  formatarHashCurto,
  formatarTamanho,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";

const COLUNAS = [
  "Protocolo SIGAD",
  "ID Interno",
  "Tipo de Atividade",
  "Código PCD",
  "Descrição do Código",
  "Dossiê / Unidade",
  "Nome do Arquivo",
  "Autor / Produtor",
  "Tipologia",
  "Status do Documento",
  "Nível de Acesso",
  "Ano",
  "Núcleo",
  "Sigla NOBRADE",
  "Hash SHA-256 (PREMIS)",
  "Data de Captura",
  "Hora de Captura",
] as const;

function linhas(docs: Doc[]) {
  return docs.map((d) => [
    d.numeroProtocolo || "-",
    d.id,
    d.tipoAtividade || "-",
    d.codigoClassificacao || "-",
    d.descricaoCodigo || "-",
    d.codigoDossie || "Avulso",
    d.nome,
    d.autor || "Fundação Casa de José Américo (FCJA)",
    d.categoria,
    d.statusDocumento || "ORIGINAL",
    d.nivelAcesso || "OSTENSIVO",
    String(d.ano),
    d.nucleo,
    d.sigla || "-",
    d.hashSha256 || "-",
    d.upload,
    d.hora || "",
  ]);
}

function baixar(conteudo: BlobPart, nome: string, mime: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escaparHtml(v: string) {
  return (v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tabelaHtml(docs: Doc[], titulo: string) {
  const dataGeracao = new Date().toLocaleString("pt-BR");
  const volumeTotal = docs.reduce((acc, d) => acc + (d.tamanho || 0), 0);
  const integros = docs.filter((d) => d.fixidadeVerificada !== false).length;
  const guardaPerm = docs.filter((d) => {
    const ehFim =
      d.tipoAtividade === "Atividade-Fim" ||
      (d.codigoClassificacao || "").startsWith("FIM.");
    return d.destinacaoPrevista === "GUARDA_PERMANENTE" || (!d.destinacaoPrevista && ehFim);
  }).length;

  const linhasRelatorio = docs
    .map((d, idx) => {
      return `<tr>
        <td style="text-align:center;font-weight:bold;color:#475569">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:bold;color:#1d4ed8;white-space:nowrap">${escaparHtml(
          d.numeroProtocolo || `ID-${d.id.slice(0, 6)}`
        )}</td>
        <td>
          <strong>${escaparHtml(d.nome)}</strong><br/>
          <span style="color:#64748b;font-size:9px">Autor: ${escaparHtml(
            d.autor || "Fundação Casa de José Américo (FCJA)"
          )}</span>
        </td>
        <td>
          <span style="font-family:monospace;font-weight:bold">${escaparHtml(
            d.codigoClassificacao || "000.00.00.000"
          )}</span><br/>
          <span style="color:#6d28d9;font-size:9px">${escaparHtml(
            d.codigoDossie ? `Dossiê: ${d.codigoDossie}` : "Documento Avulso"
          )}</span>
        </td>
        <td>
          ${escaparHtml(d.categoria)} (${d.ano})<br/>
          <span style="color:#64748b;font-size:9px">${escaparHtml(
            d.ext.toUpperCase()
          )} · ${d.tamanho ? formatarTamanho(d.tamanho) : "-"}</span>
        </td>
        <td>
          ${escaparHtml(d.nucleo)}<br/>
          <span style="font-family:monospace;color:#64748b;font-size:8.5px">${escaparHtml(
            d.sigla || "-"
          )}</span>
        </td>
        <td style="white-space:nowrap">
          <strong>${escaparHtml(d.faseArquivistica || "CORRENTE")}</strong> · ${escaparHtml(
            rotuloStatusDocumento(d.statusDocumento)
          )}<br/>
          <span style="color:#047857;font-size:9px">${escaparHtml(
            rotuloNivelAcesso(d.nivelAcesso)
          )}</span>
        </td>
        <td style="font-family:monospace;font-size:8.5px">
          ${escaparHtml(formatarHashCurto(d.hashSha256, 14))}<br/>
          <span style="color:#64748b;font-family:Arial,sans-serif">Capturado: ${escaparHtml(
            d.upload
          )}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escaparHtml(titulo)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 24px 28px;
      background: #ffffff;
    }
    .barra-acoes {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .barra-acoes .botoes { display: flex; gap: 10px; }
    .btn {
      border: 0;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primario { background: #2563eb; color: #ffffff; }
    .btn-primario:hover { background: #1d4ed8; }
    .btn-secundario { background: #334155; color: #f8fafc; }
    .btn-secundario:hover { background: #475569; }
    .cabecalho {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .instituicao {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #1d4ed8;
    }
    h1 { font-size: 18px; margin: 4px 0 4px; color: #0f172a; }
    .subtitulo { font-size: 11px; color: #475569; margin: 0; }
    .resumo-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .resumo-card {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .resumo-card span {
      display: block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .resumo-card strong {
      font-size: 14px;
      color: #0f172a;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
      line-height: 1.35;
    }
    th {
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.04em;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .rodape {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748b;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="barra-acoes no-print">
    <div>
      <strong style="font-size:13px">Visualização de Impressão / Exportação PDF — SIGAD FCJA</strong>
      <div style="font-size:11px;color:#cbd5e1">Selecione o destino "Salvar como PDF" na janela de impressão do navegador.</div>
    </div>
    <div class="botoes">
      <button class="btn btn-primario" onclick="window.print()">Salvar como PDF / Imprimir</button>
      <button class="btn btn-secundario" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="cabecalho">
    <div>
      <div class="instituicao">Fundação Casa de José Américo (FCJA) · SIGAD</div>
      <h1>${escaparHtml(titulo)}</h1>
      <p class="subtitulo">Inventário descritivo de documentos arquivísticos, classificação PCD/TTD, vínculo orgânico e fixidade SHA-256</p>
    </div>
    <div style="text-align:right;font-size:10px;color:#475569">
      <strong>Emitido em:</strong> ${escaparHtml(dataGeracao)}<br/>
      <strong>Total listado:</strong> ${docs.length} documento(s)
    </div>
  </div>

  <div class="resumo-grid">
    <div class="resumo-card">
      <span>Documentos no Escopo</span>
      <strong>${docs.length} item(ns)</strong>
    </div>
    <div class="resumo-card">
      <span>Volume Físico Total</span>
      <strong>${escaparHtml(formatarTamanho(volumeTotal))}</strong>
    </div>
    <div class="resumo-card">
      <span>Guarda Permanente (TTD)</span>
      <strong>${guardaPerm} doc(s)</strong>
    </div>
    <div class="resumo-card">
      <span>Fixidade SHA-256 Íntegra</span>
      <strong>${integros} de ${docs.length} validados</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28px;text-align:center">#</th>
        <th>Protocolo SIGAD</th>
        <th>Título / Produtor</th>
        <th>Classe PCD & Dossiê</th>
        <th>Espécie / Ano / Tam.</th>
        <th>Núcleo Produtor & Sigla</th>
        <th>Ciclo Vital & Acesso</th>
        <th>Fixidade SHA-256 & Data</th>
      </tr>
    </thead>
    <tbody>
      ${linhasRelatorio}
    </tbody>
  </table>

  <div class="rodape">
    <span>Sistema Informatizado de Gestão Arquivística de Documentos — Fundação Casa de José Américo (FCJA)</span>
    <span>Relatório Oficial de Inventário e Auditoria · ${escaparHtml(dataGeracao)}</span>
  </div>
</body>
</html>`;
}

export function imprimirHtmlComFallback(html: string): boolean {
  // Importante: não usar "noopener,noreferrer" aqui, pois isso força window.open a retornar null
  // nos navegadores modernos e impede a escrita do documento de impressão.
  const janela = window.open("", "_blank", "width=1180,height=820,scrollbars=yes,resizable=yes");

  if (janela && janela.document) {
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => {
      try {
        janela.focus();
        janela.print();
      } catch {
        // O usuário ainda pode clicar no botão "Salvar como PDF / Imprimir" na barra superior
      }
    }, 350);
    return true;
  }

  // Fallback automático via iframe oculto caso o navegador bloqueie pop-ups
  try {
    const iframeAntigo = document.getElementById("sigad-print-iframe");
    if (iframeAntigo) {
      iframeAntigo.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "sigad-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const docIframe = iframe.contentWindow?.document;
    if (!docIframe || !iframe.contentWindow) {
      return false;
    }

    docIframe.open();
    docIframe.write(html);
    docIframe.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 350);

    return true;
  } catch {
    return false;
  }
}

export function exportarCsv(docs: Doc[], nome = "documentos-sigad.csv") {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [COLUNAS.map(esc).join(";"), ...linhas(docs).map((l) => l.map(esc).join(";"))].join(
    "\r\n"
  );
  baixar("\uFEFF" + csv, nome, "text/csv;charset=utf-8");
}

export function exportarExcel(docs: Doc[], nome = "documentos-sigad.xls") {
  baixar(
    "\uFEFF" + tabelaHtml(docs, "Relatório de Documentos Arquivísticos (SIGAD FCJA)"),
    nome,
    "application/vnd.ms-excel;charset=utf-8"
  );
}

export function exportarPdf(
  docs: Doc[],
  titulo = "Relatório de Documentos Arquivísticos (SIGAD FCJA)"
): boolean {
  const html = tabelaHtml(docs, titulo);
  return imprimirHtmlComFallback(html);
}
