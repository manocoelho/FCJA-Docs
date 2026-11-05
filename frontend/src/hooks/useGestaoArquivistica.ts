import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  alternarStatusClassePcd,
  alterarStatusDossie,
  buscarAvaliacaoTemporalAcervo,
  buscarClassesPcd,
  buscarDossies,
  criarClassePcd,
  criarDossie,
  juntarDocumentosAoDossie,
  type AvaliacaoTemporalAcervo,
  type ClassePcdItem,
  type DossieItem,
} from "@/lib/pcd-dossie-api";

export function useGestaoArquivistica(onDocumentosAlterados?: (() => void) | undefined) {
  const [classesPcd, setClassesPcd] = useState<ClassePcdItem[]>([]);
  const [dossies, setDossies] = useState<DossieItem[]>([]);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoTemporalAcervo | null>(null);
  const [filtroAtividadePcd, setFiltroAtividadePcd] = useState<string>("TODAS");
  const [carregando, setCarregando] = useState<boolean>(false);

  const recarregarGestao = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaClasses, listaDossies, dadosAvaliacao] = await Promise.all([
        buscarClassesPcd(filtroAtividadePcd),
        buscarDossies(),
        buscarAvaliacaoTemporalAcervo(),
      ]);
      setClassesPcd(listaClasses);
      setDossies(listaDossies);
      setAvaliacao(dadosAvaliacao);
    } catch (erro) {
      console.error("Erro ao carregar dados de gestão arquivística:", erro);
    } finally {
      setCarregando(false);
    }
  }, [filtroAtividadePcd]);

  useEffect(() => {
    recarregarGestao();
  }, [recarregarGestao]);

  const adicionarClassePcd = useCallback(
    async (dados: {
      codigo: string;
      titulo: string;
      tipo_atividade: string;
      funcao: string;
      prazo_corrente_anos: number;
      prazo_intermediaria_anos: number;
      destinacao_final: string;
      observacoes_ttd?: string;
    }) => {
      try {
        const res = await criarClassePcd(dados);
        toast.success(`Classe ${res.classe.codigo} incluída no PCD/TTD!`);
        await recarregarGestao();
        return true;
      } catch (erro: unknown) {
        const msg = erro instanceof Error ? erro.message : "Erro ao criar classe";
        toast.error("Falha ao cadastrar classe", { description: msg });
        return false;
      }
    },
    [recarregarGestao]
  );

  const alternarClasseAtiva = useCallback(
    async (classeId: string) => {
      try {
        const res = await alternarStatusClassePcd(classeId);
        toast.success(
          `Classe ${res.classe.codigo} marcada como ${res.classe.ativa ? "ATIVA" : "INATIVA"}`
        );
        await recarregarGestao();
      } catch (erro: unknown) {
        const msg = erro instanceof Error ? erro.message : "Permissão insuficiente";
        toast.error("Não foi possível alterar a classe", { description: msg });
      }
    },
    [recarregarGestao]
  );

  const abrirNovoDossie = useCallback(
    async (dados: {
      titulo: string;
      tipo_unidade: string;
      nucleo: string;
      sigla_nucleo: string;
      codigo_classificacao: string;
      descricao_codigo: string;
      destinacao_prevista: string;
      ano: number;
      descricao: string;
    }) => {
      try {
        const res = await criarDossie(dados);
        toast.success(`Unidade de Arquivamento aberta: ${res.dossie.codigoDossie}`, {
          description: res.dossie.titulo,
        });
        await recarregarGestao();
        return true;
      } catch (erro: unknown) {
        const msg = erro instanceof Error ? erro.message : "Erro ao abrir dossiê";
        toast.error("Falha ao abrir Dossiê/Processo", { description: msg });
        return false;
      }
    },
    [recarregarGestao]
  );

  const mudarStatusDossie = useCallback(
    async (dossieId: string, status: "ABERTO" | "ENCERRADO" | "RECOLHIDO_ARCHIVEMATICA") => {
      try {
        await alterarStatusDossie(dossieId, status);
        toast.success(`Status do dossiê alterado para ${status}`);
        await recarregarGestao();
      } catch (erro: unknown) {
        const msg = erro instanceof Error ? erro.message : "Erro ao alterar status";
        toast.error("Falha na alteração", { description: msg });
      }
    },
    [recarregarGestao]
  );

  const executarJuntadaDossie = useCallback(
    async (dossieId: string, idsDocumentos: string[]) => {
      try {
        const res = await juntarDocumentosAoDossie(dossieId, idsDocumentos);
        toast.success(
          `Juntada concluída no dossiê ${res.juntada.codigoDossie}`,
          {
            description: `${res.juntada.documentosJuntados} documento(s) vinculado(s) organicamente.`,
          }
        );
        await recarregarGestao();
        onDocumentosAlterados?.();
        return true;
      } catch (erro: unknown) {
        const msg = erro instanceof Error ? erro.message : "Erro na juntada";
        toast.error("Falha ao realizar juntada", { description: msg });
        return false;
      }
    },
    [recarregarGestao, onDocumentosAlterados]
  );

  return {
    classesPcd,
    dossies,
    avaliacao,
    filtroAtividadePcd,
    setFiltroAtividadePcd,
    carregando,
    recarregarGestao,
    adicionarClassePcd,
    alternarClasseAtiva,
    abrirNovoDossie,
    mudarStatusDossie,
    executarJuntadaDossie,
  };
}
