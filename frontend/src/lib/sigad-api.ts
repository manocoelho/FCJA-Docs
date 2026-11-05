import { API_BASE_URL } from "@/lib/api";

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
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao carregar trilha de auditoria e-ARQ");
  return res.json();
}

export async function buscarResumoAuditoria(): Promise<ResumoAuditoriaEarq> {
  const res = await fetch(`${API_BASE_URL}/api/auditoria/resumo`);
  if (!res.ok) throw new Error("Falha ao carregar resumo de auditoria e-ARQ");
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
    { method: "POST" }
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
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Falha ao executar auditoria de fixidade em lote");
  return res.json();
}
