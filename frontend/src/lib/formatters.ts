/**
 * Utilitários puros de formatação visual e rótulos normativos e-ARQ Brasil v2 (SRP).
 */

export function formatarTamanho(bytes: number = 0): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const tamanhos = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${tamanhos[i]}`;
}

export function formatarHashCurto(hash?: string, tamanho: number = 12): string {
  if (!hash) return "Pendente";
  if (hash.length <= tamanho) return hash;
  return `${hash.slice(0, tamanho)}…${hash.slice(-4)}`;
}

export function rotuloStatusDocumento(status?: string): string {
  switch (status) {
    case "MINUTA":
      return "Minuta";
    case "COPIA":
      return "Cópia";
    case "ORIGINAL":
    default:
      return "Original";
  }
}

export function rotuloNivelAcesso(nivel?: string): string {
  switch (nivel) {
    case "RESTRITO_LGPD":
      return "Restrito (LGPD)";
    case "SIGILOSO_LAI":
      return "Sigiloso (LAI)";
    case "OSTENSIVO":
    default:
      return "Ostensivo";
  }
}

export function rotuloCategoriaEvento(categoria?: string): string {
  switch (categoria) {
    case "CICLO_VIDA":
      return "Ciclo de Vida (EarqEventoCv)";
    case "PRESERVACAO":
      return "Preservação / PREMIS (EarqEventoPreservacao)";
    case "PROCEDIMENTAL":
      return "Procedimental (EarqEventoProc)";
    case "CLASSE":
      return "Plano de Classificação (EarqEventoClasse)";
    default:
      return categoria || "Evento";
  }
}
