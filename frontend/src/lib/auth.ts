/**
 * Utilitário isolado de Sessão JWT e Matriz de Permissões RBAC do SIGAD FCJA (SRP).
 */

export interface SessaoSigad {
  nome: string;
  papel: string;
  login?: string | undefined;
  token?: string | undefined;
}

const KEY_USER = "fcja_user";
const KEY_ROLE = "fcja_role";
const KEY_LOGIN = "fcja_login";
const KEY_TOKEN = "fcja_token";

export function salvarSessaoAuth(sessao: SessaoSigad): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_USER, sessao.nome);
  sessionStorage.setItem(KEY_ROLE, sessao.papel);
  if (sessao.login) sessionStorage.setItem(KEY_LOGIN, sessao.login);
  if (sessao.token) sessionStorage.setItem(KEY_TOKEN, sessao.token);
}

export function limparSessaoAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY_USER);
  sessionStorage.removeItem(KEY_ROLE);
  sessionStorage.removeItem(KEY_LOGIN);
  sessionStorage.removeItem(KEY_TOKEN);
}

export function obterTokenJwt(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY_TOKEN);
}

export function obterHeadersAuth(
  extras: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extras };
  const token = obterTokenJwt();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Permissão operacional sobre o acervo e unidades de arquivamento (dossiês):
 * Concedida a Auxiliar, Arquivista e Administrador.
 */
export function podeEliminarDocumentoOficial(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "auxiliar" || p === "arquivista" || p === "admin";
}

export function podeExecutarAcaoArquivistica(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "auxiliar" || p === "arquivista" || p === "admin";
}

/**
 * Permissão para acessar Tabelas de Classificação (PCD), Tabelas de Temporalidade (TTD),
 * Avaliação Temporal e criar/ativar/inativar classes:
 * Exclusiva de Arquivista e Administrador (bloqueada para Auxiliar e Pesquisador).
 */
export function podeGerenciarPcdTtd(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "arquivista" || p === "admin";
}

/**
 * Permissão para acessar a aba "Conector Archivematica":
 * Exclusiva de Arquivista e Administrador (bloqueada para Auxiliar e Pesquisador).
 */
export function podeAcessarConectorArchivematica(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "arquivista" || p === "admin";
}

/**
 * Permissão para acessar a aba "Auditoria & Fixidade":
 * Exclusiva de Arquivista e Administrador (bloqueada para Auxiliar e Pesquisador).
 */
export function podeAcessarAuditoriaFixidade(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "arquivista" || p === "admin";
}

export function podeGerenciarUsuarios(papel?: string | null): boolean {
  return (papel || "").toLowerCase().trim() === "admin";
}

/**
 * Regra RBAC de navegação por telas:
 * - Pesquisador: acesso exclusivo a "dashboard" e "explorador".
 * - Auxiliar: acesso a "dashboard", "explorador", "upload" e "gestao" (somente Dossiês, sem PCD/TTD);
 *             sem acesso a "archivematica", "auditoria" e "permissoes".
 * - Arquivista: acesso a todas as telas arquivísticas, exceto "permissoes".
 * - Administrador: acesso irrestrito a todas as telas.
 */
export function podeAcessarAbaSigad(
  papel: string | null | undefined,
  aba: string
): boolean {
  if (aba === "dashboard" || aba === "explorador") {
    return true;
  }
  if (aba === "upload" || aba === "gestao") {
    return podeExecutarAcaoArquivistica(papel);
  }
  if (aba === "archivematica") {
    return podeAcessarConectorArchivematica(papel);
  }
  if (aba === "auditoria") {
    return podeAcessarAuditoriaFixidade(papel);
  }
  if (aba === "permissoes") {
    return podeGerenciarUsuarios(papel);
  }
  return false;
}

export function rotuloPapelSigad(papel?: string | null): string {
  switch ((papel || "").toLowerCase().trim()) {
    case "admin":
      return "Administrador Geral";
    case "arquivista":
      return "Arquivista SIGAD";
    case "auxiliar":
      return "Auxiliar de Arquivo";
    case "pesquisador":
    default:
      return "Pesquisador FCJA";
  }
}
