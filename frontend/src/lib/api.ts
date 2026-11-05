/**
 * Utilitário central de comunicação com a API Backend (SRP).
 * Suporta:
 * 1. Proxy Reverso Nginx na porta 80/443 (ex: http://192.168.1.115) ou porta auxiliar 8085.
 * 2. Acesso direto em desenvolvimento/preview na rede local (ex: porta 8080/5173 -> backend 8000).
 * 3. Sobrescrita explícita via VITE_API_URL.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env["VITE_API_URL"];
  if (envUrl) {
    return String(envUrl).replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const { hostname, host, port, protocol } = window.location;
    // Se acessado via Nginx (porta 80, 443 ou auxiliar 8085), usa a própria origem do Nginx
    if (!port || port === "80" || port === "443" || port === "8085") {
      return `${protocol}//${host}`;
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
