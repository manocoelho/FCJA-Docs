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

export function podeEliminarDocumentoOficial(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "arquivista" || p === "admin";
}

export function podeExecutarAcaoArquivistica(papel?: string | null): boolean {
  const p = (papel || "").toLowerCase().trim();
  return p === "arquivista" || p === "admin";
}

export function podeGerenciarUsuarios(papel?: string | null): boolean {
  return (papel || "").toLowerCase().trim() === "admin";
}

export function rotuloPapelSigad(papel?: string | null): string {
  switch ((papel || "").toLowerCase().trim()) {
    case "admin":
      return "Administrador Geral";
    case "arquivista":
      return "Arquivista SIGAD";
    case "pesquisador":
    default:
      return "Pesquisador FCJA";
  }
}
