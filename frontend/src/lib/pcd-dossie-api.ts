import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";

export interface ClassePcdItem {
  id: string;
  codigo: string;
  titulo: string;
  tipoAtividade: "Atividade-Fim" | "Atividade-Meio" | string;
  funcao: string;
  subfuncao: string;
  atividade: string;
  prazoCorrenteAnos: number;
  eventoCorrente: string;
  prazoIntermediariaAnos: number;
  eventoIntermediaria: string;
  destinacaoFinal: "GUARDA_PERMANENTE" | "ELIMINACAO" | string;
  observacoesTtd: string;
  ativa: boolean;
  criadoEm: string;
}

export interface DossieItem {
  id: string;
  codigoDossie: string;
  titulo: string;
  tipoUnidade: "DOSSIE" | "PROCESSO" | string;
  nucleo: string;
  siglaNucleo: string;
  codigoClassificacao: string;
  descricaoCodigo: string;
  destinacaoPrevista: "GUARDA_PERMANENTE" | "ELIMINACAO" | string;
  faseAtual: string;
  statusDossie: "ABERTO" | "ENCERRADO" | "RECOLHIDO_ARCHIVEMATICA" | string;
  volumeAtual: number;
  dataAbertura: string;
  dataEncerramento: string;
  responsavelAbertura: string;
  descricao: string;
  totalDocumentos: number;
  tamanhoTotalBytes: number;
  documentos: Array<{
    id: string;
    numeroProtocolo: string;
    nome: string;
    categoria: string;
    ano: number;
    hashSha256: string;
  }>;
}

export interface ItemAvaliacaoTemporal {
  id: string;
  numeroProtocolo: string;
  nome: string;
  nucleo: string;
  ano: number;
  codigoClassificacao: string;
  tipoAtividade: string;
  destinacaoPrevista: string;
  faseArquivistica: string;
  anoDestinacaoFinal: number;
  codigoDossie: string;
}

export interface AvaliacaoTemporalAcervo {
  totalAvaliados: number;
  porFase: {
    CORRENTE: number;
    INTERMEDIARIA: number;
    APTO_RECOLHIMENTO: number;
    APTO_ELIMINACAO: number;
    [key: string]: number;
  };
  porDestinacao: {
    GUARDA_PERMANENTE: number;
    ELIMINACAO: number;
    [key: string]: number;
  };
  relacaoGuardaPermanente: ItemAvaliacaoTemporal[];
  listagemGuardaTemporaria: ItemAvaliacaoTemporal[];
}

export async function buscarClassesPcd(
  tipoAtividade?: string,
  apenasAtivas: boolean = false
): Promise<ClassePcdItem[]> {
  const params = new URLSearchParams();
  if (tipoAtividade && tipoAtividade !== "TODAS") {
    params.set("tipo_atividade", tipoAtividade);
  }
  if (apenasAtivas) {
    params.set("apenas_ativas", "true");
  }
  const q = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/pcd/classes${q ? `?${q}` : ""}`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao buscar classes do PCD/TTD");
  return res.json();
}

export async function criarClassePcd(dados: {
  codigo: string;
  titulo: string;
  tipo_atividade: string;
  funcao: string;
  subfuncao?: string;
  atividade?: string;
  prazo_corrente_anos: number;
  prazo_intermediaria_anos: number;
  destinacao_final: string;
  observacoes_ttd?: string;
}): Promise<{ sucesso: boolean; classe: Partial<ClassePcdItem> }> {
  const res = await fetch(`${API_BASE_URL}/api/pcd/classes`, {
    method: "POST",
    headers: obterHeadersAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(dados),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Não foi possível cadastrar a classe no PCD/TTD");
  }
  return payload;
}

export async function alternarStatusClassePcd(
  classeId: string
): Promise<{ sucesso: boolean; classe: { id: string; codigo: string; ativa: boolean } }> {
  const res = await fetch(`${API_BASE_URL}/api/pcd/classes/${encodeURIComponent(classeId)}/status`, {
    method: "PUT",
    headers: obterHeadersAuth(),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Não foi possível alterar o status da classe");
  }
  return payload;
}

export async function buscarAvaliacaoTemporalAcervo(): Promise<AvaliacaoTemporalAcervo> {
  const res = await fetch(`${API_BASE_URL}/api/pcd/avaliacao-acervo`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao buscar avaliação temporal do acervo");
  return res.json();
}

export async function buscarDossies(): Promise<DossieItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/dossies`, {
    headers: obterHeadersAuth(),
  });
  if (!res.ok) throw new Error("Falha ao buscar Dossiês/Processos");
  return res.json();
}

export async function criarDossie(dados: {
  titulo: string;
  tipo_unidade: string;
  nucleo: string;
  sigla_nucleo: string;
  codigo_classificacao: string;
  descricao_codigo: string;
  destinacao_prevista: string;
  ano: number;
  descricao: string;
}): Promise<{ sucesso: boolean; dossie: Partial<DossieItem> }> {
  const res = await fetch(`${API_BASE_URL}/api/dossies`, {
    method: "POST",
    headers: obterHeadersAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(dados),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Não foi possível abrir o Dossiê/Processo");
  }
  return payload;
}

export async function alterarStatusDossie(
  dossieId: string,
  statusDossie: "ABERTO" | "ENCERRADO" | "RECOLHIDO_ARCHIVEMATICA"
): Promise<{ sucesso: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/dossies/${encodeURIComponent(dossieId)}/status`, {
    method: "PUT",
    headers: obterHeadersAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status_dossie: statusDossie }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Não foi possível alterar o status do dossiê");
  }
  return payload;
}

export async function juntarDocumentosAoDossie(
  dossieId: string,
  idsDocumentos: string[]
): Promise<{ sucesso: boolean; juntada: { codigoDossie: string; documentosJuntados: number } }> {
  const res = await fetch(`${API_BASE_URL}/api/dossies/${encodeURIComponent(dossieId)}/juntar`, {
    method: "POST",
    headers: obterHeadersAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ids_documentos: idsDocumentos }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || "Falha ao realizar a juntada de documentos ao dossiê");
  }
  return payload;
}
