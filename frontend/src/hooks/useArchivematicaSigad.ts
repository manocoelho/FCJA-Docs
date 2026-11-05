import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  buscarConfigArchivematica,
  atualizarConfigArchivematica,
  testarConexaoArchivematica,
  buscarPacotesSip,
  criarPacoteSip,
  sincronizarPacoteSip,
  type ConfigArchivematica,
  type DiagnosticoArchivematica,
  type PacoteSipItem,
  type ResumoPacotesSip,
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
  const [dossies, setDossies] = useState<DossieItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [gerandoSip, setGerandoSip] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);

  const recarregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const [cfg, respSips, listaDossies] = await Promise.all([
        buscarConfigArchivematica(),
        buscarPacotesSip(),
        buscarDossies().catch(() => []),
      ]);
      setConfig(cfg);
      setPacotesSip(respSips.pacotes);
      setResumoSip(respSips.resumo);
      setDossies(listaDossies);
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
      if (diag.conectadoApi || diag.diretorioAcessivel) {
        toast.success("Conexão com Archivematica validada!", {
          description: diag.mensagem,
        });
      } else {
        toast.info("Conector em Modo BagIt Local (RFC 8493)", {
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

  async function salvarConfiguracao(
    dados: Partial<ConfigArchivematica> & { apiKeyArchivematica?: string | undefined }
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
        description: `Manifesto SHA-256: ${resp.pacote.hashManifestoSha256.slice(0, 16)}...`,
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
    }
  }

  return {
    config,
    diagnostico,
    pacotesSip,
    resumoSip,
    dossies,
    carregando,
    gerandoSip,
    testandoConexao,
    recarregarTudo,
    executarTesteConexao,
    salvarConfiguracao,
    gerarNovoPacoteSip,
    avancarOuSincronizarSip,
  };
}
