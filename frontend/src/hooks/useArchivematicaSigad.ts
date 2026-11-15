import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  buscarConfigArchivematica,
  atualizarConfigArchivematica,
  descobrirTransferSourceStorageService,
  testarConexaoArchivematica,
  buscarRegrasFprArchivematica,
  buscarPacotesSip,
  criarPacoteSip,
  sincronizarPacoteSip,
  inspecionarArquivosPacoteSip,
  type ConfigArchivematica,
  type DiagnosticoArchivematica,
  type PacoteSipItem,
  type ResumoPacotesSip,
  type RegraFprItem,
  type InspecaoArquivosSip,
} from "@/lib/archivematica-api";
import { buscarDossies, type DossieItem } from "@/lib/pcd-dossie-api";

export function useArchivematicaSigad(onAcervoAlterado?: (() => void) | undefined) {
  const [config, setConfig] = useState<ConfigArchivematica | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoArchivematica | null>(null);
  const [pacotesSip, setPacotesSip] = useState<PacoteSipItem[]>([]);
  const [resumoSip, setResumoSip] = useState<ResumoPacotesSip>({
    totalPacotesSip: 0,
    totalDocumentosRecolhidos: 0,
    totalAipsArmazenados: 0,
    pacotesEmProcessamento: 0,
  });
  const [regrasFpr, setRegrasFpr] = useState<RegraFprItem[]>([]);
  const [dossies, setDossies] = useState<DossieItem[]>([]);
  const [inspecaoAtiva, setInspecaoAtiva] = useState<InspecaoArquivosSip | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [gerandoSip, setGerandoSip] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [descobrindoTransferSource, setDescobrindoTransferSource] = useState(false);

  const recarregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const [cfg, respSips, listaDossies, respFpr] = await Promise.all([
        buscarConfigArchivematica(),
        buscarPacotesSip(),
        buscarDossies().catch(() => []),
        buscarRegrasFprArchivematica().catch(() => ({ regras: [] })),
      ]);
      setConfig(cfg);
      setPacotesSip(respSips.pacotes);
      setResumoSip(respSips.resumo);
      setDossies(listaDossies);
      if (respFpr && Array.isArray(respFpr.regras)) {
        setRegrasFpr(respFpr.regras);
      }
    } catch {
      // Silencioso caso o backend ainda esteja iniciando
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarTudo();
  }, [recarregarTudo]);

  async function executarTesteConexao() {
    setTestandoConexao(true);
    try {
      const diag = await testarConexaoArchivematica();
      setDiagnostico(diag);
      if (diag.conectadoApi || diag.conectadoStorageService || diag.diretorioAcessivel) {
        toast.success("Conexão com Archivematica / Storage Service validada!", {
          description: diag.mensagem,
        });
      } else {
        toast.info("Conector em Modo Standard Transfer + BagIt Local", {
          description: diag.mensagem,
        });
      }
      return diag;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao diagnosticar conexão.";
      toast.error(msg);
      return null;
    } finally {
      setTestandoConexao(false);
    }
  }

  async function executarDescobertaTransferSource() {
    setDescobrindoTransferSource(true);
    try {
      const resp = await descobrirTransferSourceStorageService();
      if (resp.configAtualizada) {
        setConfig(resp.configAtualizada);
      }
      if (resp.sucesso && resp.locais.length > 0) {
        toast.success("Transfer Source descoberto automaticamente (Etapa 1)!", {
          description: resp.mensagem,
        });
      } else {
        toast.info("Consulta ao Storage Service (:8000)", {
          description: resp.mensagem,
        });
      }
      return resp;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar Storage Service.";
      toast.error(msg);
      return null;
    } finally {
      setDescobrindoTransferSource(false);
    }
  }

  async function salvarConfiguracao(
    dados: Partial<ConfigArchivematica> & {
      apiKeyArchivematica?: string | undefined;
      apiKeyStorageService?: string | undefined;
    }
  ) {
    try {
      const resp = await atualizarConfigArchivematica(dados);
      setConfig(resp.config);
      toast.success(resp.mensagem);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar configuração.";
      toast.error(msg);
      return false;
    }
  }

  async function gerarNovoPacoteSip(dados: {
    titulo: string;
    documentoIds: string[];
    dossieId?: string | undefined;
  }) {
    setGerandoSip(true);
    try {
      const resp = await criarPacoteSip(dados);
      toast.success(resp.mensagem, {
        description: `SHA-256: ${resp.pacote.hashManifestoSha256.slice(0, 16)}... | rights.csv (18 col.) + premis.xml`,
      });
      await recarregarTudo();
      if (onAcervoAlterado) onAcervoAlterado();
      return resp.pacote;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao construir pacote SIP.";
      toast.error(msg);
      return null;
    } finally {
      setGerandoSip(false);
    }
  }

  async function avancarOuSincronizarSip(sipId: number, confirmarAip = false) {
    try {
      const resp = await sincronizarPacoteSip(sipId, confirmarAip);
      toast.success(resp.mensagem, {
        description: resp.pacote.mensagemStatus,
      });
      await recarregarTudo();
      if (onAcervoAlterado) onAcervoAlterado();
      return resp.pacote;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao sincronizar pacote SIP.";
      toast.error(msg);
      return null;
    } finally {
      setCarregando(false);
    }
  }

  async function abrirInspecaoSip(sipId: number) {
    try {
      const dados = await inspecionarArquivosPacoteSip(sipId);
      setInspecaoAtiva(dados);
      return dados;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao ler metadados do pacote SIP.";
      toast.error(msg);
      return null;
    }
  }

  function fecharInspecaoSip() {
    setInspecaoAtiva(null);
  }

  return {
    config,
    diagnostico,
    pacotesSip,
    resumoSip,
    regrasFpr,
    dossies,
    inspecaoAtiva,
    carregando,
    gerandoSip,
    testandoConexao,
    descobrindoTransferSource,
    recarregarTudo,
    executarTesteConexao,
    executarDescobertaTransferSource,
    salvarConfiguracao,
    gerarNovoPacoteSip,
    avancarOuSincronizarSip,
    abrirInspecaoSip,
    fecharInspecaoSip,
  };
}
