import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";

export const MOTIVOS_ELIMINACAO_OPCOES = [
  {
    valor: "CUMPRIMENTO_PRAZO_TTD",
    rotulo: "Cumprimento de Prazo de Guarda na TTD (Destinação Final)",
  },
  {
    valor: "DUPLICIDADE_CAPTURA",
    rotulo: "Duplicidade Comprovada de Captura no Acervo",
  },
  {
    valor: "ERRO_MATERIAL_CAPTURA",
    rotulo: "Erro Material / Inconsistência Técnica na Captura",
  },
  {
    valor: "SUBSTITUICAO_FORMATO_PRESERVACAO",
    rotulo: "Substituição por Formato de Preservação (Migração)",
  },
  {
    valor: "DESCARTE_MINUTA_RASCUNHO",
    rotulo: "Descarte de Minuta / Rascunho de Trabalho",
  },
] as const;

export interface EventoArquivistico {
  id: string;
  categoriaEvento: "CICLO_VIDA" | "PRESERVACAO" | "PROCEDIMENTAL" | "CLASSE" | string;
  tipoEvento: string;
  documentoId: string;
  numeroProtocolo: string;
  usuarioResponsavel: string;
  papelUsuario: string;
  dataEvento: string;
  horaEvento: string;
  timestampIso: string;
  resultado: "SUCESSO" | "ALERTA" | "FALHA" | string;
  detalhes: string;
  hashEvidencia: string;
  ipOrigem: string;
}

export interface TermoEliminacaoItem {
  id: string;
  numeroTermo: string;
  documentoId: string;
  numeroProtocolo: string;
  nomeDocumento: string;
  categoria: string;
  codigoClassificacao: string;
  nucleo: string;
  anoDocumento: number;
  statusDocumentoOriginal: string;
  hashSha256Original: string;
  motivoEliminacao: string;
  descricaoMotivo: string;
  justificativa: string;
  autorizadoPor: string;
  papelAutorizador: string;
  dataEliminacao: string;
  horaEliminacao: string;
}

export interface ResumoAuditoriaEarq {
  totalEventos: number;
  eventosPorCategoria: {
    CICLO_VIDA: number;
    PRESERVACAO: number;
    PROCEDIMENTAL: number;
    CLASSE: number;
    [key: string]: number;
  };
  totalDocumentos: number;
  documentosComHash: number;
  documentosIntegros: number;
  documentosViolados: number;
  taxaIntegridadePercentual: number;
}

export interface ResultadoVerificacaoFixidade {
  sucesso: boolean;
  documentoId: string;
  numeroProtocolo: string;
  nome: string;
  integro: boolean;
  statusFixidade: string;
  hashRegistrado: string;
  hashCalculado: string;
  verificadoEm: string;
  mensagem: string;
}

export interface ResultadoVerificacaoLote {
  sucesso: boolean;
  totalVerificados: number;
  integros: number;
  violados: number;
  ausentes: number;
  verificadoEm: string;
  itens: Array<{
    documentoId: string;
    numeroProtocolo: string;
    nome: string;
    integro: boolean;
    statusFixidade: string;
    hashSha256: string;
    verificadoEm: string;
  }>;
}

export async function buscarEventosAuditoria(params?: {
  categoriaEvento?: string;
  documentoId?: string;
  busca?: string;
  limite?: number;
}): Promise<EventoArquivistico[]> {
  const search = new URLSearchParams();
  if (params?.categoriaEvento && params.categoriaEvento !== "TODOS") {
    search.set("categoria_evento", params.categoriaEvento);
  }
  if (params?.documentoId) {
    search.set("documento_id", params.documentoId);
  }
  if (params?.busca) {
    search.set("busca", params.busca);
  }
  if (params?.limite) {
    search.set("limite", String(params.limite));
  }

  const queryStr = search.toString();
  const url = `${API_BASE_URL}/api/auditoria/eventos${queryStr ? `?${queryStr}` : ""}`;
  const res = await fetch(url, { headers: obterHeadersAuth() });
  if (!res.ok) throw new Error("Falha ao carregar trilha de auditoria e-ARQ");
  return res.json();
}

export async function buscarResumoAuditoria(): Promise<ResumoAuditoriaEarq> {
  const res = await fetch(`${API_BASE_URL}/api/auditoria/resumo`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao carregar resumo de auditoria e-ARQ");
  return res.json();
}

export async function buscarTermosEliminacao(
  limite: number = 100
): Promise<TermoEliminacaoItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/auditoria/termos-eliminacao?limite=${limite}`,
    { headers: obterHeadersAuth() }
  );
  if (!res.ok) throw new Error("Falha ao carregar Termos de Eliminação");
  return res.json();
}

export async function verificarFixidadeIndividual(
  docId: string,
  usuarioResponsavel: string = "sistema",
  papelUsuario: string = ""
): Promise<ResultadoVerificacaoFixidade> {
  const search = new URLSearchParams({
    usuario_responsavel: usuarioResponsavel,
    papel_usuario: papelUsuario,
  });
  const res = await fetch(
    `${API_BASE_URL}/api/documentos/${encodeURIComponent(docId)}/verificar-fixidade?${search.toString()}`,
    { method: "POST", headers: obterHeadersAuth() }
  );
  if (!res.ok) throw new Error("Não foi possível verificar a fixidade do documento");
  return res.json();
}

export async function verificarFixidadeEmLote(
  usuarioResponsavel: string = "sistema",
  papelUsuario: string = ""
): Promise<ResultadoVerificacaoLote> {
  const search = new URLSearchParams({
    usuario_responsavel: usuarioResponsavel,
    papel_usuario: papelUsuario,
  });
  const res = await fetch(
    `${API_BASE_URL}/api/documentos/verificar-fixidade-lote?${search.toString()}`,
    { method: "POST", headers: obterHeadersAuth() }
  );
  if (!res.ok) throw new Error("Falha ao executar auditoria de fixidade em lote");
  return res.json();
}

export async function alterarSigiloDocumento(
  docId: string,
  dados: {
    nivel_acesso: string;
    hipotese_legal: string;
    previsao_desclassificacao: string;
    justificativa: string;
  }
): Promise<{
  sucesso: boolean;
  documentoId: string;
  nivelAcessoAnterior: string;
  nivelAcesso: string;
  hipoteseLegal: string;
  previsaoDesclassificacao: string;
  eventoCicloVida: string;
  mensagem: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/documentos/${encodeURIComponent(docId)}/alterar-sigilo`,
    {
      method: "POST",
      headers: obterHeadersAuth({ "Content-Type": "application/json" }),
      body: JSON.stringify(dados),
    }
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Não foi possível alterar/desclassificar o grau de sigilo");
  }
  return payload;
}

export async function reclassificarDocumento(
  docId: string,
  dados: {
    codigo_classificacao: string;
    descricao_codigo: string;
    tipo_atividade: string;
    justificativa: string;
  }
): Promise<{
  sucesso: boolean;
  documentoId: string;
  codigoClassificacao: string;
  descricaoCodigo: string;
  tipoAtividade: string;
  prazoCorrenteAnos: number;
  prazoIntermediariaAnos: number;
  anoDestinacaoFinal: number;
  destinacaoPrevista: string;
  faseArquivistica: string;
  mensagem: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/documentos/${encodeURIComponent(docId)}/reclassificar`,
    {
      method: "POST",
      headers: obterHeadersAuth({ "Content-Type": "application/json" }),
      body: JSON.stringify(dados),
    }
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Não foi possível reclassificar o documento no PCD/TTD");
  }
  return payload;
}

export async function registrarAcessoDocumento(
  docId: string,
  tipoAcesso: "VISUALIZACAO" | "DOWNLOAD" | "INSPECAO_METADADOS" = "VISUALIZACAO"
): Promise<{
  sucesso: boolean;
  permitido: boolean;
  nivelAcesso: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/documentos/${encodeURIComponent(docId)}/registrar-acesso`,
    {
      method: "POST",
      headers: obterHeadersAuth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ tipo_acesso: tipoAcesso }),
    }
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      payload.detail || "Acesso negado pela política de segurança e sigilo (e-ARQ 7.3.5)."
    );
  }
  return payload;
}

export async function arquivarTrilhaComoDocumento(): Promise<{
  sucesso: boolean;
  documentoId: string;
  numeroProtocolo: string;
  nome: string;
  hashSha256: string;
  tamanhoBytes: number;
  totalEventosArquivados: number;
  url: string;
  mensagem: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/auditoria/arquivar-trilha`, {
    method: "POST",
    headers: obterHeadersAuth(),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      payload.detail || "Não foi possível arquivar a Trilha de Auditoria como documento."
    );
  }
  return payload;
}

export function exportarTrilhaAuditoriaArquivo(
  eventos: EventoArquivistico[],
  formato: "csv" | "json"
): void {
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  if (formato === "json") {
    const conteudo = JSON.stringify(
      {
        sistema: "SIGAD FCJA — Conformidade e-ARQ Brasil v2 (Requisito 7.4.7 / 7.4.12)",
        exportadoEm: new Date().toISOString(),
        totalEventos: eventos.length,
        eventos,
      },
      null,
      2
    );
    const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Trilha_Auditoria_SIGAD_FCJA_${carimbo}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const cabecalho = [
    "ID_Evento",
    "Data",
    "Hora",
    "Timestamp_ISO",
    "Categoria_eARQ",
    "Tipo_Evento",
    "Protocolo_SIGAD",
    "Documento_ID",
    "Agente_Responsavel",
    "Perfil_RBAC",
    "Resultado",
    "Hash_SHA256_Evidencia",
    "IP_Origem",
    "Detalhes",
  ];
  const escaparCsv = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const linhas = eventos.map((ev) =>
    [
      ev.id,
      ev.dataEvento,
      ev.horaEvento,
      ev.timestampIso,
      ev.categoriaEvento,
      ev.tipoEvento,
      ev.numeroProtocolo,
      ev.documentoId,
      ev.usuarioResponsavel,
      ev.papelUsuario,
      ev.resultado,
      ev.hashEvidencia,
      ev.ipOrigem,
      ev.detalhes,
    ]
      .map(escaparCsv)
      .join(";")
  );
  const csvFinal = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\r\n");
  const blob = new Blob([csvFinal], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Trilha_Auditoria_SIGAD_FCJA_${carimbo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
