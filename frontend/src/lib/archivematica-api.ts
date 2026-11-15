import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";

export interface ConfigArchivematica {
  id: number;
  urlArchivematica: string;
  usuarioArchivematica: string;
  apiKeyConfigurada: boolean;
  apiKeyMascarada: string;
  urlStorageService: string;
  usuarioStorageService: string;
  apiKeyStorageServiceConfigurada: boolean;
  apiKeyStorageServiceMascarada: string;
  locationUuidTransfer: string;
  caminhoRelativoTransfer: string;
  diretorioCompartilhado: string;
  processingConfig: string;
  autoApprove: boolean;
  urlAtom: string;
  atualizadoPor: string;
  atualizadoEm: string;
}

export interface DiagnosticoArchivematica {
  conectadoApi: boolean;
  conectadoStorageService?: boolean;
  statusHttp: number;
  statusHttpStorageService?: number;
  diretorioAcessivel: boolean;
  modoRecomendado: string;
  latenciaMs: number;
  urlArchivematica: string;
  urlStorageService?: string;
  urlAtom: string;
  mensagem: string;
}

export interface LocalTransferSource {
  uuid: string;
  description: string;
  purpose: string;
  relativePath: string;
  enabled: boolean;
}

export interface RespostaDescobertaTransferSource {
  sucesso: boolean;
  statusHttp: number;
  endpointConsultado: string;
  locais: LocalTransferSource[];
  configAtualizada: ConfigArchivematica;
  mensagem: string;
}

export interface DocResumoSip {
  id: string;
  numeroProtocolo: string;
  nome: string;
  nomeObjeto?: string;
  codigoClassificacao: string;
  hashSha256: string;
  tamanho: number;
  dcType?: string;
  nivelAcesso?: string;
  fprPuid?: string;
  fprAcaoPreservacao?: string;
  fprFerramentaValidacao?: string;
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
  sipUuid?: string;
  aipUuid: string;
  rightsValidado?: boolean;
  statusTransfer?: string;
  statusIngest?: string;
  statusStorage?: string;
  microserviceAtual?: string;
  caminhoAipStorage?: string;
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

export interface InspecaoArquivosSip {
  codigoSip: string;
  titulo: string;
  arquivos: {
    metadataCsv: string;
    rightsCsv: string;
    premisXml: string;
    metsXml: string;
    termoSubmissao: string;
  };
}

export interface RegraFprItem {
  ext: string;
  categoria: string;
  descricaoFormato: string;
  puidPronom: string;
  acaoPreservacao: string;
  formatoPreservacao: string;
  acaoAcesso: string;
  formatoAcesso: string;
  ferramentaIdentificacao: string;
  ferramentaValidacao: string;
  aceitoFpr: boolean;
}

export async function buscarConfigArchivematica(): Promise<ConfigArchivematica> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/config`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao carregar configuração do conector Archivematica.");
  return res.json();
}

export async function atualizarConfigArchivematica(
  dados: Partial<ConfigArchivematica> & {
    apiKeyArchivematica?: string | undefined;
    apiKeyStorageService?: string | undefined;
  }
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

export async function descobrirTransferSourceStorageService(): Promise<RespostaDescobertaTransferSource> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/descobrir-transfer-source`, {
    method: "POST",
    headers: obterHeadersAuth(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Falha ao consultar Storage Service (purpose=TS).");
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

export async function buscarRegrasFprArchivematica(): Promise<{
  versaoArchivematica: string;
  servidorReferencia: string;
  totalFormatosPronom: number;
  regras: RegraFprItem[];
}> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/fpr`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao carregar tabela FPR do Archivematica.");
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

export async function inspecionarArquivosPacoteSip(sipId: number): Promise<InspecaoArquivosSip> {
  const res = await fetch(`${API_BASE_URL}/api/archivematica/sips/${sipId}/inspecionar`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Falha ao inspecionar metadados do pacote SIP.");
  }
  return res.json();
}

export function urlDownloadPacoteSip(sipId: number): string {
  return `${API_BASE_URL}/api/archivematica/sips/${sipId}/download`;
}
