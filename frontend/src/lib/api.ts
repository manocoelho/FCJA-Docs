/**
 * Utilitário central de comunicação com a API Backend (SRP).
 * Suporta:
 * 1. Proxy Reverso Nginx na porta 80/443 (mesma origem, sem sufixo de porta).
 * 2. Acesso direto em desenvolvimento/preview na rede local (ex: porta 8080/5173 -> backend 8000).
 * 3. Sobrescrita explícita via VITE_API_URL.
 */
export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const { hostname, port, protocol } = window.location;
    // Se acessado via Nginx na porta 80 ou 443 (porta omitida pelo navegador),
    // usa caminho relativo para passar pelo Proxy Reverso (/api e /arquivos).
    if (!port || port === "80" || port === "443") {
      return `${protocol}//${hostname}`;
    }
    return `${protocol}//${hostname}:8000`;
  }
  return "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Normaliza caminhos relativos ou URLs antigas gravadas com localhost/127.0.0.1
 * para apontarem sempre para o endereço/proxy atual do servidor.
 */
export const resolveUrl = (path: string): string => {
  if (!path) return "";

  const base = getApiBaseUrl();

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, base);
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
