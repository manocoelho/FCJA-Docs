import type { Doc } from "./data";

const COLUNAS = ["Nome do Arquivo", "Tipologia", "Ano", "Núcleo", "Data de Upload"] as const;

function linhas(docs: Doc[]) {
  return docs.map((d) => [d.nome, d.categoria, String(d.ano), d.nucleo, d.upload]);
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
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tabelaHtml(docs: Doc[], titulo: string) {
  const head = COLUNAS.map((c) => `<th>${c}</th>`).join("");
  const body = linhas(docs)
    .map((l) => `<tr>${l.map((c) => `<td>${escaparHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>${escaparHtml(titulo)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;padding:24px}
h1{font-size:18px;margin:0 0 4px}
p{font-size:12px;color:#6b7280;margin:0 0 16px}
table{border-collapse:collapse;width:100%;font-size:11px}
th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#eff6ff;color:#1e3a8a}
</style></head><body>
<h1>${escaparHtml(titulo)}</h1>
<p>Fundação Casa de José Américo · ${docs.length} documento(s) · gerado em ${new Date().toLocaleString("pt-BR")}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

export function exportarCsv(docs: Doc[], nome = "documentos.csv") {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [COLUNAS.map(esc).join(";"), ...linhas(docs).map((l) => l.map(esc).join(";"))].join(
    "\r\n",
  );
  baixar("\uFEFF" + csv, nome, "text/csv;charset=utf-8");
}

export function exportarExcel(docs: Doc[], nome = "documentos.xls") {
  baixar(
    "\uFEFF" + tabelaHtml(docs, "Documentos"),
    nome,
    "application/vnd.ms-excel;charset=utf-8",
  );
}

export function exportarPdf(docs: Doc[], titulo = "Documentos") {
  const janela = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!janela) return false;
  janela.document.write(tabelaHtml(docs, titulo));
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 400);
  return true;
}
