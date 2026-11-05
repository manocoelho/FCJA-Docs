import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";

export interface ConfigArchivematica {
  id: number;
  urlArchivematica: string;
  usuarioArchivematica: string;
  apiKeyConfigurada: boolean;
  apiKeyMascarada: string;
  locationUuidTransfer: string;
  diretorioCompartilhado: string;
  processingConfig: string;
  autoApprove: boolean;
  urlAtom: string;
  atualizadoPor: string;
  atualizadoEm: string;
}

export interface DiagnosticoArchivematica {
  conectadoApi: boolean;
  statusHttp: number;
  diretorioAcessivel: boolean;
  modoRecomendado: string;
  latenciaMs: number;
  urlArchivematica: string;
  urlAtom: string;
  mensagem: string;
}

export interface DocResumoSip {
  id: string;
  numeroProtocolo: string;
  nome: string;
  codigoClassificacao: string;
  hashSha256: string;
  tamanho: number;
}

export interface PacoteSipItem {
  id: number;
  codigoSip: string;
  titulo: string;
  dossieId: string;
  codigoDossie: string;
  nucleo: string;
  statusSip:
    | "EMPACOTADO_LOCAL"
    | "ENVIADO_ARCHIVEMATICA"
    | "EM_PROCESSAMENTO_AIP"
    | "ARMAZENADO_AIP"
    | "ERRO_TRANSMISSAO"
    | string;
  transferUuid: string;
  aipUuid: string;
  quantidadeDocumentos: number;
  tamanhoTotalBytes: number;
  hashManifestoSha256: string;
  caminhoZip: string;
  documentos: DocResumoSip[];
  modoTransmissao: string;
  urlArchivematica: string;
  mensagemStatus: string;
  usuarioResponsavel: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ResumoPacotesSip {
  totalPacotesSip: number;
  totalDocumentosRecolhidos: number;
  totalAipsArmazenados: number;
  pacotesEmProcessamento: number;
}

export interface RespostaListagemSips {
  resumo: ResumoPacotesSip;
  pacotes: PacoteSipItem[];
}

export async function buscarConfigArchivematica(): Promise<ConfigArchivematica> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/config`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao carregar configuração do conector Archivematica.");
  return res.json();
}

export async function atualizarConfigArchivematica(
  dados: Partial<ConfigArchivematica> & { apiKeyArchivematica?: string | undefined }
): Promise<{ mensagem: string; config: ConfigArchivematica }> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...obterHeadersAuth(),
    },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Falha ao salvar configuração do conector Archivematica.");
  }
  return res.json();
}

export async function testarConexaoArchivematica(): Promise<DiagnosticoArchivematica> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/testar-conexao`, {
    method: "POST",
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao diagnosticar conexão com o Archivematica.");
  return res.json();
}

export async function buscarPacotesSip(): Promise<RespostaListagemSips> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/sips`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao listar pacotes SIP do SIGAD.");
  return res.json();
}

export async function criarPacoteSip(dados: {
  titulo: string;
  documentoIds: string[];
  dossieId?: string | undefined;
}): Promise<{ mensagem: string; pacote: PacoteSipItem }> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/sips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...obterHeadersAuth(),
    },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Falha ao construir e enviar pacote SIP.");
  }
  return res.json();
}

export async function sincronizarPacoteSip(
  sipId: number,
  confirmarAip = false
): Promise<{ mensagem: string; pacote: PacoteSipItem }> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/sips/${sipId}/sincronizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...obterHeadersAuth(),
    },
    body: JSON.stringify({ confirmarAip }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Falha ao sincronizar status do pacote SIP.");
  }
  return res.json();
}

export function urlDownloadPacoteSip(sipId: number): string {
  return `${API_BASE_URL}/api/archivematica/sips/${sipId}/download`;
}
