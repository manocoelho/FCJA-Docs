import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  buscarEventosAuditoria,
  buscarResumoAuditoria,
  buscarTermosEliminacao,
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
    recarregarAuditoria: carregarDadosAuditoria,
    executarAuditoriaFixidadeLote,
  };
}
