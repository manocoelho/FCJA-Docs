import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  arquivarTrilhaComoDocumento,
  buscarEventosAuditoria,
  buscarResumoAuditoria,
  buscarTermosEliminacao,
  exportarTrilhaAuditoriaArquivo,
  verificarFixidadeEmLote,
  type EventoArquivistico,
  type ResumoAuditoriaEarq,
  type TermoEliminacaoItem,
} from "@/lib/sigad-api";

export function useAuditoriaEarq(
  usuarioLogado: string | null,
  usuarioPapel: string | null,
  onFixidadeLoteConcluida?: (() => void) | undefined
) {
  const [eventos, setEventos] = useState<EventoArquivistico[]>([]);
  const [termosEliminacao, setTermosEliminacao] = useState<TermoEliminacaoItem[]>([]);
  const [resumo, setResumo] = useState<ResumoAuditoriaEarq | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODOS");
  const [buscaFiltro, setBuscaFiltro] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [verificandoLote, setVerificandoLote] = useState<boolean>(false);
  const [arquivandoTrilha, setArquivandoTrilha] = useState<boolean>(false);

  const carregarDadosAuditoria = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaEventos, dadosResumo, listaTermos] = await Promise.all([
        buscarEventosAuditoria({
          categoriaEvento: categoriaFiltro,
          busca: buscaFiltro,
          limite: 200,
        }),
        buscarResumoAuditoria(),
        buscarTermosEliminacao(100),
      ]);
      setEventos(listaEventos);
      setResumo(dadosResumo);
      setTermosEliminacao(listaTermos);
    } catch (erro) {
      console.error("Erro ao carregar auditoria e-ARQ:", erro);
    } finally {
      setCarregando(false);
    }
  }, [categoriaFiltro, buscaFiltro]);

  useEffect(() => {
    carregarDadosAuditoria();
  }, [carregarDadosAuditoria]);

  const executarAuditoriaFixidadeLote = useCallback(async () => {
    setVerificandoLote(true);
    try {
      const resultado = await verificarFixidadeEmLote(
        usuarioLogado || "sistema",
        usuarioPapel || ""
      );
      if (resultado.violados === 0 && resultado.ausentes === 0) {
        toast.success("Auditoria PREMIS concluída: 100% íntegro!", {
          description: `${resultado.integros} de ${resultado.totalVerificados} componente(s) digital(is) com SHA-256 validado.`,
        });
      } else {
        toast.warning("Auditoria PREMIS concluída com alertas", {
          description: `${resultado.integros} íntegro(s), ${resultado.violados} violado(s), ${resultado.ausentes} ausente(s).`,
        });
      }
      await carregarDadosAuditoria();
      onFixidadeLoteConcluida?.();
    } catch (erro) {
      console.error(erro);
      toast.error("Erro na auditoria de fixidade em lote");
    } finally {
      setVerificandoLote(false);
    }
  }, [usuarioLogado, usuarioPapel, carregarDadosAuditoria, onFixidadeLoteConcluida]);

  const executarArquivamentoTrilhaOficial = useCallback(async () => {
    setArquivandoTrilha(true);
    try {
      const res = await arquivarTrilhaComoDocumento();
      toast.success("Trilha de Auditoria arquivada como Documento Oficial (e-ARQ 7.4.15)!", {
        description: res.mensagem,
      });
      window.dispatchEvent(new CustomEvent("fcja-acervo-atualizado"));
      await carregarDadosAuditoria();
      onFixidadeLoteConcluida?.();
    } catch (erro: unknown) {
      const msg = erro instanceof Error ? erro.message : "Erro ao arquivar trilha de auditoria";
      toast.error("Falha ao arquivar trilha", { description: msg });
    } finally {
      setArquivandoTrilha(false);
    }
  }, [carregarDadosAuditoria, onFixidadeLoteConcluida]);

  const exportarTrilha = useCallback(
    (formato: "csv" | "json") => {
      exportarTrilhaAuditoriaArquivo(eventos, formato);
      toast.success(
        `Trilha de Auditoria exportada em ${formato.toUpperCase()} (${eventos.length} eventos)`
      );
    },
    [eventos]
  );

  return {
    eventos,
    termosEliminacao,
    resumo,
    categoriaFiltro,
    setCategoriaFiltro,
    buscaFiltro,
    setBuscaFiltro,
    carregando,
    verificandoLote,
    arquivandoTrilha,
    recarregarAuditoria: carregarDadosAuditoria,
    executarAuditoriaFixidadeLote,
    executarArquivamentoTrilhaOficial,
    exportarTrilha,
  };
}
