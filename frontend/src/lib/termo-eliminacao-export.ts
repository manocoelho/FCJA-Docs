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

export interface ItemListagemEliminacao {
  numeroProtocolo?: string | undefined;
  nome: string;
  codigoClassificacao?: string | undefined;
  categoria?: string | undefined;
  ano: number;
  nucleo: string;
  observacao?: string | undefined;
}

/**
 * Requisito Obrigatório e-ARQ Brasil v2 (3.3.9 [O]) e Resolução CONARQ nº 40/2014:
 * Gera a visualização oficial de impressão (PDF/HTML A4) da Listagem de Eliminação de Documentos
 * acompanhada da Minuta do Edital de Ciência de Eliminação de Documentos.
 */
export function imprimirListagemEEditalEliminacao(
  itens: ItemListagemEliminacao[],
  responsavel: string = "Comissão Permanente de Avaliação de Documentos (CPAD / FCJA)"
): boolean {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString("pt-BR");
  const anoAtual = agora.getFullYear();
  const numListagem = `001/${anoAtual}-CPAD/FCJA`;

  const anosValidos = itens.map((i) => i.ano).filter((a) => a && a > 1900);
  const anoMin = anosValidos.length > 0 ? Math.min(...anosValidos) : anoAtual;
  const anoMax = anosValidos.length > 0 ? Math.max(...anosValidos) : anoAtual;
  const datasLimite = anoMin === anoMax ? `${anoMin}` : `${anoMin} a ${anoMax}`;

  const linhasHtml = itens
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="font-family:monospace">${escaparHtml(item.codigoClassificacao || "002.03.01.004")}</td>
        <td style="font-family:monospace">${escaparHtml(item.numeroProtocolo || "—")}</td>
        <td><strong>${escaparHtml(item.nome)}</strong><br/><span style="font-size:10px;color:#4b5563">${escaparHtml(item.categoria || "Documento Digital")} · ${escaparHtml(item.nucleo)}</span></td>
        <td style="text-align:center">${item.ano}</td>
        <td style="text-align:center">1 item digital</td>
        <td>${escaparHtml(item.observacao || "Prazo de guarda cumprido na TTD")}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Listagem e Edital de Ciência de Eliminação de Documentos — CONARQ 3.3.9</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: "Times New Roman", Georgia, serif; color: #111827; padding: 28px 40px; line-height: 1.55; }
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
    .btn { border: 0; border-radius: 6px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-primario { background: #2563eb; color: #ffffff; }
    .btn-secundario { background: #334155; color: #f8fafc; }
    .cabecalho { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 22px; }
    .cabecalho h1 { font-size: 15px; text-transform: uppercase; margin: 0; letter-spacing: 0.04em; }
    .cabecalho h2 { font-size: 12px; font-weight: normal; color: #374151; margin: 4px 0 0; }
    .titulo-secao { text-align: center; font-size: 15px; font-weight: bold; margin: 18px 0 12px; text-transform: uppercase; background: #f3f4f6; padding: 8px; border: 1px solid #d1d5db; }
    .paragrafo { text-align: justify; font-size: 13px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-family: Arial, sans-serif; font-size: 11px; }
    th, td { border: 1px solid #9ca3af; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #e5e7eb; font-weight: bold; color: #1f2937; text-transform: uppercase; font-size: 10px; }
    .caixa-edital { border: 1.5px solid #1f2937; padding: 18px 22px; margin-top: 26px; background: #fafafa; page-break-inside: avoid; }
    .assinaturas { display: flex; justify-content: space-around; margin-top: 42px; text-align: center; font-size: 12px; gap: 20px; }
    .linha-ass { width: 220px; border-top: 1px solid #111827; margin: 0 auto 6px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="barra-acoes no-print">
    <div>
      <strong style="font-size:13px">Listagem de Eliminação & Edital de Ciência (CONARQ / e-ARQ Brasil v2 — Req. 3.3.9)</strong>
      <div style="font-size:11px;color:#cbd5e1">Resolução CONARQ nº 40/2014 · Imprima ou salve como PDF A4.</div>
    </div>
    <div class="botoes">
      <button class="btn btn-primario" onclick="window.print()">Salvar como PDF / Imprimir</button>
      <button class="btn btn-secundario" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="cabecalho">
    <h1>Governo do Estado da Paraíba · Fundação Casa de José Américo (FCJA)</h1>
    <h2>Comissão Permanente de Avaliação de Documentos (CPAD) — SIGAD FCJA</h2>
  </div>

  <div class="titulo-secao">
    1. Listagem de Eliminação de Documentos Nº ${escaparHtml(numListagem)}
  </div>

  <p class="paragrafo">
    Órgão Produtor: <strong>Fundação Casa de José Américo (FCJA)</strong> · Data de Emissão: <strong>${escaparHtml(dataHoje)}</strong> ·
    Total de Itens Documentais Relacionados: <strong>${itens.length} documento(s) digital(is)</strong> ·
    Datas-Limite: <strong>${escaparHtml(datasLimite)}</strong>.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:5%;text-align:center">Item</th>
        <th style="width:14%">Código PCD</th>
        <th style="width:17%">Protocolo SIGAD</th>
        <th style="width:32%">Série / Título & Proveniência</th>
        <th style="width:8%;text-align:center">Data-Limite</th>
        <th style="width:9%;text-align:center">Quant./Espécie</th>
        <th style="width:15%">Observações / Justificativa</th>
      </tr>
    </thead>
    <tbody>
      ${linhasHtml}
    </tbody>
  </table>

  <div class="caixa-edital">
    <div class="titulo-secao" style="margin-top:0">
      2. Minuta — Edital de Ciência de Eliminação de Documentos Nº ${escaparHtml(numListagem)}
    </div>
    <p class="paragrafo">
      O(A) Presidente da Comissão Permanente de Avaliação de Documentos (CPAD) da <strong>Fundação Casa de José Américo (FCJA)</strong>,
      designado(a) na forma regimental, faz saber a quem possa interessar que, a partir do <strong>30º (trigésimo) ao 45º (quadragésimo quinto) dia</strong>
      subsequente à data de publicação deste Edital no Diário Oficial, se não houver oposição formal, a FCJA eliminará os
      <strong>${itens.length} documento(s) digital(is)</strong> do período de <strong>${escaparHtml(datasLimite)}</strong> constantes na
      <strong>Listagem de Eliminação de Documentos Nº ${escaparHtml(numListagem)}</strong>, aprovada em conformidade com a Tabela de Temporalidade
      e Destinação de Documentos (TTD) e o Requisito 3.3.9 do e-ARQ Brasil v2 (CONARQ).
    </p>
    <p class="paragrafo">
      Os interessados, no prazo citado, poderão requerer às suas expensas a retirada ou cópia de documentos avulsos ou peças de dossiês,
      desde que comprovem legítimo interesse, mediante petição dirigida à CPAD da Fundação Casa de José Américo.
    </p>
    <p class="paragrafo" style="text-align:right;margin-bottom:0">
      João Pessoa — PB, ${escaparHtml(dataHoje)}.
    </p>

    <div class="assinaturas">
      <div>
        <div class="linha-ass"></div>
        <strong>${escaparHtml(responsavel)}</strong><br/>
        <span>Responsável Técnico / Arquivista SIGAD FCJA</span>
      </div>
      <div>
        <div class="linha-ass"></div>
        <strong>Presidência da FCJA / Autoridade Homologadora</strong><br/>
        <span>Fundação Casa de José Américo</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  return imprimirHtmlComFallback(html);
}
