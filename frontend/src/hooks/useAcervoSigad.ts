import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";
import { DOCUMENTOS, type Doc } from "@/components/ged/data";
import { verificarFixidadeIndividual } from "@/lib/sigad-api";

export interface SysStatus {
  total_bytes: number;
  usado_bytes: number;
  livre_bytes: number;
  acervo_bytes: number;
}

export interface DadosEdicaoDoc {
  nome: string;
  categoria: string;
  ano: number;
  nucleo: string;
  autor?: string | undefined;
  statusDocumento?: string | undefined;
  nivelAcesso?: string | undefined;
  hipoteseLegal?: string | undefined;
}

export function useAcervoSigad(usuarioLogado: string | null, usuarioPapel: string | null) {
  const [sysStatus, setSysStatus] = useState<SysStatus | null>(null);
  const [documentosApi, setDocumentosApi] = useState<Doc[]>(DOCUMENTOS);
  const [enviados, setEnviados] = useState<Doc[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [edicoes, setEdicoes] = useState<Record<string, Partial<Doc>>>({});

  const atualizarStatusHD = useCallback(() => {
    fetch(`${API_BASE_URL}/api/sistema/status`, { headers: obterHeadersAuth() })
      .then((res) => res.json())
      .then((data) => {
        if (data.sucesso) {
          setSysStatus(data);
        }
      })
      .catch((err) => console.error("Erro ao ler HD:", err));
  }, []);

  const recarregarDocumentos = useCallback(() => {
    fetch(`${API_BASE_URL}/api/documentos`, { headers: obterHeadersAuth() })
      .then((res) => {
        if (!res.ok) throw new Error("Falha na rede");
        return res.json();
      })
      .then((dados: Doc[]) => {
        setDocumentosApi(dados);
        setEnviados([]);
      })
      .catch((err) => {
        console.error("Erro na API:", err);
        toast.error("API Python desligada", {
          description: "Mostrando documentos de demonstração.",
        });
      });
  }, []);

  useEffect(() => {
    atualizarStatusHD();
    recarregarDocumentos();
  }, [atualizarStatusHD, recarregarDocumentos]);

  const acervo = useMemo(
    () =>
      [...enviados, ...documentosApi]
        .filter((d) => !removidos.includes(d.id))
        .map((d) => (edicoes[d.id] ? { ...d, ...edicoes[d.id]! } : d)),
    [enviados, removidos, edicoes, documentosApi]
  );

  const adicionarDocumentosCapturados = useCallback(
    (novos: Doc[]) => {
      setDocumentosApi((prev) => [...novos, ...prev]);
      atualizarStatusHD();
    },
    [atualizarStatusHD]
  );

  const removerDoc = useCallback(
    async (
      doc: Doc,
      motivoEliminacao: string = "CUMPRIMENTO_PRAZO_TTD",
      justificativa: string = "Eliminação autorizada via SIGAD."
    ) => {
      try {
        const params = new URLSearchParams({
          motivo_eliminacao: motivoEliminacao,
          justificativa,
          usuario_responsavel: usuarioLogado || "sistema",
          papel_usuario: usuarioPapel || "",
        });
        const res = await fetch(`${API_BASE_URL}/api/documentos/${doc.id}?${params.toString()}`, {
          method: "DELETE",
          headers: obterHeadersAuth(),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.detail || "Falha ao eliminar no backend");
        }

        setDocumentosApi((prev) => prev.filter((d) => d.id !== doc.id));
        setEnviados((prev) => prev.filter((d) => d.id !== doc.id));
        setRemovidos((prev) => [...prev, doc.id]);

        const numTermo = payload?.termo?.numeroTermo;
        toast.success(
          numTermo ? `Termo de Eliminação emitido: ${numTermo}` : "Documento eliminado",
          {
            description: `${doc.numeroProtocolo ? `[${doc.numeroProtocolo}] ` : ""}${doc.nome}`,
          }
        );
        atualizarStatusHD();
      } catch (erro: unknown) {
        console.error(erro);
        const msg = erro instanceof Error ? erro.message : "Não foi possível eliminar o documento.";
        toast.error("Eliminação não autorizada", { description: msg });
      }
    },
    [usuarioLogado, usuarioPapel, atualizarStatusHD]
  );

  const removerDocs = useCallback(
    async (
      lista: Doc[],
      motivoEliminacao: string = "CUMPRIMENTO_PRAZO_TTD",
      justificativa: string = "Eliminação em lote autorizada via SIGAD."
    ) => {
      if (lista.length === 0) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/documentos/eliminar-lote`, {
          method: "POST",
          headers: obterHeadersAuth({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            ids_documentos: lista.map((d) => d.id),
            motivo_eliminacao: motivoEliminacao,
            justificativa,
            usuario_responsavel: usuarioLogado || "sistema",
            papel_usuario: usuarioPapel || "",
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.detail || "Falha na eliminação em lote");
        }

        const ids = lista.map((d) => d.id);
        setDocumentosApi((prev) => prev.filter((d) => !ids.includes(d.id)));
        setEnviados((prev) => prev.filter((d) => !ids.includes(d.id)));
        setRemovidos((prev) => [...prev, ...ids]);

        const primeiroTermo = payload?.termos?.[0]?.numeroTermo;
        toast.success(`${lista.length} Termo(s) de Eliminação emitido(s)`, {
          description: primeiroTermo
            ? `Iniciado em ${primeiroTermo} · Registrado na Trilha de Auditoria.`
            : "Eliminação em lote registrada com sucesso.",
        });
        atualizarStatusHD();
      } catch (erro: unknown) {
        console.error(erro);
        const msg = erro instanceof Error ? erro.message : "Ocorreu um erro na comunicação.";
        toast.error("Eliminação em lote bloqueada", { description: msg });
      }
    },
    [usuarioLogado, usuarioPapel, atualizarStatusHD]
  );

  const editarDoc = useCallback(
    async (doc: Doc, dados: DadosEdicaoDoc) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/documentos/${doc.id}`, {
          method: "PUT",
          headers: obterHeadersAuth({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            nome: dados.nome,
            categoria: dados.categoria,
            ano: dados.ano,
            nucleo: dados.nucleo,
            autor: dados.autor,
            status_documento: dados.statusDocumento,
            nivel_acesso: dados.nivelAcesso,
            hipotese_legal: dados.hipoteseLegal,
            usuario_responsavel: usuarioLogado || "sistema",
            papel_usuario: usuarioPapel || "",
          }),
        });
        if (!res.ok) throw new Error("Falha ao atualizar no backend");

        const respostaApi = await res.json();
        setDocumentosApi((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  nome: dados.nome,
                  categoria: dados.categoria,
                  ano: dados.ano,
                  nucleo: dados.nucleo,
                  autor: dados.autor ?? d.autor,
                  statusDocumento: dados.statusDocumento ?? d.statusDocumento,
                  nivelAcesso: dados.nivelAcesso ?? d.nivelAcesso,
                  hipoteseLegal: dados.hipoteseLegal ?? d.hipoteseLegal,
                  url: respostaApi.url || d.url,
                }
              : d
          )
        );
        setEdicoes((prev) => ({
          ...prev,
          [doc.id]: {
            nome: dados.nome,
            categoria: dados.categoria,
            ano: dados.ano,
            nucleo: dados.nucleo,
            autor: dados.autor ?? doc.autor,
            statusDocumento: dados.statusDocumento ?? doc.statusDocumento,
            nivelAcesso: dados.nivelAcesso ?? doc.nivelAcesso,
            hipoteseLegal: dados.hipoteseLegal ?? doc.hipoteseLegal,
          },
        }));
        toast.success("Metadados atualizados e auditados", { description: dados.nome });
      } catch (erro) {
        console.error(erro);
        toast.error("Erro na atualização", { description: "Não foi possível editar o documento." });
      }
    },
    [usuarioLogado, usuarioPapel]
  );

  const auditarFixidadeDoc = useCallback(
    async (doc: Doc) => {
      try {
        const res = await verificarFixidadeIndividual(
          doc.id,
          usuarioLogado || "sistema",
          usuarioPapel || ""
        );
        setDocumentosApi((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  hashSha256: res.hashCalculado || res.hashRegistrado || d.hashSha256,
                  fixidadeVerificada: res.integro,
                  ultimaVerificacaoFixidade: res.verificadoEm,
                }
              : d
          )
        );
        if (res.integro) {
          toast.success("Fixidade SHA-256 íntegra (PREMIS)", {
            description: `${res.numeroProtocolo || doc.nome}: Hash verificado com sucesso.`,
          });
        } else {
          toast.error("Violação de Fixidade detectada!", {
            description: res.mensagem,
          });
        }
        return res;
      } catch (erro) {
        console.error(erro);
        toast.error("Não foi possível verificar a fixidade", {
          description: "Verifique se o documento está persistido no servidor.",
        });
        return null;
      }
    },
    [usuarioLogado, usuarioPapel]
  );

  return {
    acervo,
    sysStatus,
    atualizarStatusHD,
    recarregarDocumentos,
    adicionarDocumentosCapturados,
    removerDoc,
    removerDocs,
    editarDoc,
    auditarFixidadeDoc,
  };
}
