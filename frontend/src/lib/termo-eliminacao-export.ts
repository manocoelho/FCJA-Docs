import type { TermoEliminacaoItem } from "@/lib/sigad-api";
import { imprimirHtmlComFallback } from "@/components/ged/export";

function escaparHtml(v: string): string {
  return (v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Responsabilidade única: Gerar a visualização oficial de impressão (PDF/HTML)
 * de um Termo de Eliminação de Documentos conforme diretrizes do CONARQ.
 */
export function imprimirTermoEliminacao(termo: TermoEliminacaoItem): boolean {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escaparHtml(termo.numeroTermo)} — Termo de Eliminação de Documentos</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    body { font-family: "Times New Roman", Georgia, serif; color: #111827; padding: 32px 48px; line-height: 1.6; }
    .barra-acoes {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 24px;
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
    .btn-secundario { background: #334155; color: #f8fafc; }
    .cabecalho { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 28px; }
    .cabecalho h1 { font-size: 16px; text-transform: uppercase; margin: 0; letter-spacing: 0.05em; }
    .cabecalho h2 { font-size: 13px; font-weight: normal; color: #374151; margin: 4px 0 0; }
    .titulo-termo { text-align: center; font-size: 18px; font-weight: bold; margin: 24px 0; text-transform: uppercase; }
    .paragrafo { text-align: justify; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #9ca3af; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; width: 32%; font-weight: bold; color: #1f2937; }
    .assinatura { margin-top: 56px; text-align: center; font-size: 13px; }
    .linha-assinatura { width: 340px; border-top: 1px solid #111827; margin: 0 auto 6px; }
    .rodape { margin-top: 40px; font-family: monospace; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px dashed #d1d5db; padding-top: 12px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="barra-acoes no-print">
    <div>
      <strong style="font-size:13px">Termo Oficial de Eliminação — SIGAD FCJA</strong>
      <div style="font-size:11px;color:#cbd5e1">Selecione "Salvar como PDF" na janela de impressão.</div>
    </div>
    <div class="botoes">
      <button class="btn btn-primario" onclick="window.print()">Salvar como PDF / Imprimir</button>
      <button class="btn btn-secundario" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="cabecalho">
    <h1>Fundação Casa de José Américo (FCJA)</h1>
    <h2>Sistema Informatizado de Gestão Arquivística de Documentos — SIGAD</h2>
  </div>

  <div class="titulo-termo">
    Termo de Eliminação de Documento Nº ${escaparHtml(termo.numeroTermo)}
  </div>

  <p class="paragrafo">
    Aos <strong>${escaparHtml(termo.dataEliminacao)}</strong>, às <strong>${escaparHtml(termo.horaEliminacao)}</strong>,
    em conformidade com as diretrizes de avaliação, temporalidade e destinação do CONARQ, procedeu-se à eliminação controlada do documento arquivístico
    abaixo discriminado do repositório digital ativo da Fundação Casa de José Américo, mediante autorização
    do agente responsável <strong>${escaparHtml(termo.autorizadoPor)}</strong> (perfil RBAC: <em>${escaparHtml(termo.papelAutorizador)}</em>).
  </p>

  <table>
    <tbody>
      <tr><th>Número do Termo</th><td><strong>${escaparHtml(termo.numeroTermo)}</strong></td></tr>
      <tr><th>Protocolo SIGAD</th><td>${escaparHtml(termo.numeroProtocolo || termo.documentoId)}</td></tr>
      <tr><th>Título / Nome do Arquivo</th><td>${escaparHtml(termo.nomeDocumento)}</td></tr>
      <tr><th>Espécie / Tipologia</th><td>${escaparHtml(termo.categoria)} (Ano: ${termo.anoDocumento})</td></tr>
      <tr><th>Código de Classificação (PCD)</th><td>${escaparHtml(termo.codigoClassificacao || "Não classificado")}</td></tr>
      <tr><th>Núcleo Produtor</th><td>${escaparHtml(termo.nucleo)}</td></tr>
      <tr><th>Status Arquivístico Original</th><td>${escaparHtml(termo.statusDocumentoOriginal)}</td></tr>
      <tr><th>Fixidade Original (SHA-256)</th><td style="font-family:monospace;word-break:break-all">${escaparHtml(termo.hashSha256Original || "N/A")}</td></tr>
      <tr><th>Motivo Normativo</th><td>${escaparHtml(termo.descricaoMotivo)}</td></tr>
      <tr><th>Justificativa Técnica / Fundamentação</th><td>${escaparHtml(termo.justificativa)}</td></tr>
    </tbody>
  </table>

  <div class="assinatura">
    <div class="linha-assinatura"></div>
    <strong>${escaparHtml(termo.autorizadoPor)}</strong><br />
    <span>Perfil Arquivístico: ${escaparHtml(termo.papelAutorizador.toUpperCase())} — Fundação Casa de José Américo</span>
  </div>

  <div class="rodape">
    Registro Imutável SIGAD FCJA · ID do Termo: ${escaparHtml(termo.id)} · Emitido eletronicamente em ${escaparHtml(termo.dataEliminacao)} ${escaparHtml(termo.horaEliminacao)}
  </div>
</body>
</html>`;

  return imprimirHtmlComFallback(html);
}
