import { useCallback, useEffect, useMemo, useState } from "react";
import type { Doc } from "@/components/ged/data";
import {
  buscarAvaliacaoTemporalAcervo,
  buscarClassesPcd,
  buscarDossies,
  type AvaliacaoTemporalAcervo,
  type ClassePcdItem,
  type DossieItem,
} from "@/lib/pcd-dossie-api";
import {
  buscarEventosAuditoria,
  buscarResumoAuditoria,
  buscarTermosEliminacao,
  type EventoArquivistico,
  type ResumoAuditoriaEarq,
  type TermoEliminacaoItem,
} from "@/lib/sigad-api";
import {
  buscarPacotesSip,
  type PacoteSipItem,
  type ResumoPacotesSip,
} from "@/lib/archivematica-api";

export type AbaSistemaSigad =
  | "dashboard"
  | "explorador"
  | "upload"
  | "gestao"
  | "archivematica"
  | "auditoria"
  | "permissoes";

export interface AlertaArquivistico {
  id: string;
  severidade: "critico" | "atencao" | "info" | "sucesso";
   normaReferencia: string;
  titulo: string;
  descricao: string;
  acaoRotulo: string;
  abaDestino: AbaSistemaSigad;
  quantidade?: number | undefined;
}

export function useDashboardSigad(acervo: Doc[], documentosFiltrados: Doc[]) {
  const [classesPcd, setClassesPcd] = useState<ClassePcdItem[]>([]);
  const [dossies, setDossies] = useState<DossieItem[]>([]);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoTemporalAcervo | null>(null);
  const [resumoAuditoria, setResumoAuditoria] = useState<ResumoAuditoriaEarq | null>(null);
  const [eventosRecentes, setEventosRecentes] = useState<EventoArquivistico[]>([]);
  const [termosEliminacao, setTermosEliminacao] = useState<TermoEliminacaoItem[]>([]);
  const [pacotesSip, setPacotesSip] = useState<PacoteSipItem[]>([]);
  const [resumoSip, setResumoSip] = useState<ResumoPacotesSip>({
    totalPacotesSip: 0,
    totalDocumentosRecolhidos: 0,
    totalAipsArmazenados: 0,
    pacotesEmProcessamento: 0,
  });
  const [carregandoTelemetria, setCarregandoTelemetria] = useState<boolean>(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("");

  const recarregarTelemetriaSigad = useCallback(async () => {
    setCarregandoTelemetria(true);
    try {
      const [
        resClasses,
        resDossies,
        resAvaliacao,
        resResumoAud,
        resEventos,
        resTermos,
        resSips,
      ] = await Promise.allSettled([
        buscarClassesPcd("TODAS"),
        buscarDossies(),
        buscarAvaliacaoTemporalAcervo(),
        buscarResumoAuditoria(),
        buscarEventosAuditoria({ limite: 10 }),
        buscarTermosEliminacao(20),
        buscarPacotesSip(),
      ]);

      if (resClasses.status === "fulfilled") setClassesPcd(resClasses.value);
      if (resDossies.status === "fulfilled") setDossies(resDossies.value);
      if (resAvaliacao.status === "fulfilled") setAvaliacao(resAvaliacao.value);
      if (resResumoAud.status === "fulfilled") setResumoAuditoria(resResumoAud.value);
      if (resEventos.status === "fulfilled") setEventosRecentes(resEventos.value);
      if (resTermos.status === "fulfilled") setTermosEliminacao(resTermos.value);
      if (resSips.status === "fulfilled") {
        setPacotesSip(resSips.value.pacotes);
        setResumoSip(resSips.value.resumo);
      }

      const agora = new Date();
      setUltimaAtualizacao(
        agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } finally {
      setCarregandoTelemetria(false);
    }
  }, []);

  useEffect(() => {
    recarregarTelemetriaSigad();
  }, [recarregarTelemetriaSigad, acervo.length]);

  const metricas = useMemo(() => {
    const totalAcervo = acervo.length;
    const totalFiltrado = documentosFiltrados.length;

    // 1. Natureza da Atividade (Fim vs Meio)
    let atividadeFim = 0;
    let atividadeMeio = 0;

    // 2. Status Diplomático / Traditório (Original, Minuta, Cópia)
    let originais = 0;
    let minutas = 0;
    let copias = 0;

    // 3. Nível de Acesso / Restrição (LAI & LGPD)
    let ostensivos = 0;
    let restritosLgpd = 0;
    let sigilososLai = 0;

    // 4. Ciclo Vital (3 Idades) & Destinação TTD
    let faseCorrente = 0;
    let faseIntermediaria = 0;
    let fasePermanente = 0;
    let destinacaoGuardaPermanente = 0;
    let destinacaoEliminacao = 0;

    // 5. Preservação Digital, Fixidade PREMIS & Organicidade
    let comHashSha256 = 0;
    let fixidadeVerificadaCount = 0;
    let fixidadeVioladaCount = 0;
    let vinculadosDossie = 0;
    let recolhidosSipDoc = 0;
    let candidatosSipPendentes = 0;
    let tamanhoCalculadoFiltrado = 0;

    // 6. Formatos Digitais
    const porFormato: Record<string, number> = {
      pdf: 0,
      tiff: 0,
      xlsx: 0,
      docx: 0,
    };

    for (const d of documentosFiltrados) {
      tamanhoCalculadoFiltrado += d.tamanho || 0;

      const ehFim =
        d.tipoAtividade === "Atividade-Fim" ||
        (d.codigoClassificacao || "").startsWith("FIM.");
      if (ehFim) atividadeFim++;
      else atividadeMeio++;

      if (d.statusDocumento === "MINUTA") minutas++;
      else if (d.statusDocumento === "COPIA") copias++;
      else originais++;

      if (d.nivelAcesso === "RESTRITO_LGPD") restritosLgpd++;
      else if (d.nivelAcesso === "SIGILOSO_LAI") sigilososLai++;
      else ostensivos++;

      if (d.faseArquivistica === "INTERMEDIARIA") faseIntermediaria++;
      else if (d.faseArquivistica === "PERMANENTE") fasePermanente++;
      else faseCorrente++;

      const guardaPerm =
        d.destinacaoPrevista === "GUARDA_PERMANENTE" ||
        (!d.destinacaoPrevista && ehFim);
      if (guardaPerm) destinacaoGuardaPermanente++;
      else destinacaoEliminacao++;

      if (d.hashSha256) comHashSha256++;
      if (d.fixidadeVerificada === false) fixidadeVioladaCount++;
      else if (d.fixidadeVerificada === true || d.hashSha256) fixidadeVerificadaCount++;

      if (d.dossieId || d.codigoDossie) vinculadosDossie++;
      if (d.pacoteSipId || d.aipUuidArchivematica) recolhidosSipDoc++;
      else if (guardaPerm && d.statusDocumento !== "MINUTA") {
        candidatosSipPendentes++;
      }

      const extKey = (d.ext || "pdf").toLowerCase();
      porFormato[extKey] = (porFormato[extKey] ?? 0) + 1;
    }

    const avulsosSemDossie = Math.max(0, totalFiltrado - vinculadosDossie);

    // Métricas de Unidades de Arquivamento (Dossiês/Processos)
    const dossiesAbertos = dossies.filter((ds) => ds.statusDossie === "ABERTO").length;
    const dossiesEncerrados = dossies.filter((ds) => ds.statusDossie === "ENCERRADO").length;
    const dossiesRecolhidos = dossies.filter(
      (ds) => ds.statusDossie === "RECOLHIDO_ARCHIVEMATICA"
    ).length;

    // Métricas do PCD/TTD
    const classesAtivas = classesPcd.filter((c) => c.ativa).length;
    const classesFim = classesPcd.filter((c) => c.tipoAtividade === "Atividade-Fim").length;
    const classesMeio = classesPcd.filter((c) => c.tipoAtividade === "Atividade-Meio").length;

    // Métricas da Avaliação Temporal (Backend TTD)
    const aptosRecolhimentoTtd =
      avaliacao?.porFase?.APTO_RECOLHIMENTO ?? fasePermanente;
    const aptosEliminacaoTtd = avaliacao?.porFase?.APTO_ELIMINACAO ?? 0;

    // Taxa de Integridade PREMIS
    const violadosReais =
      resumoAuditoria?.documentosViolados !== undefined
        ? Math.max(fixidadeVioladaCount, resumoAuditoria.documentosViolados)
        : fixidadeVioladaCount;
    const taxaIntegridade =
      resumoAuditoria?.taxaIntegridadePercentual !== undefined
        ? resumoAuditoria.taxaIntegridadePercentual
        : totalFiltrado > 0
          ? Math.round(((totalFiltrado - violadosReais) / totalFiltrado) * 100)
          : 100;

    const totalEventosAuditoria =
      resumoAuditoria?.totalEventos ?? eventosRecentes.length;

    const totalRecolhidosRdcArq = Math.max(
      recolhidosSipDoc,
      resumoSip.totalDocumentosRecolhidos
    );

    return {
      totalAcervo,
      totalFiltrado,
      tamanhoCalculadoFiltrado,
      atividadeFim,
      atividadeMeio,
      originais,
      minutas,
      copias,
      ostensivos,
      restritosLgpd,
      sigilososLai,
      totalRestritosOuSigilosos: restritosLgpd + sigilososLai,
      faseCorrente: avaliacao?.porFase?.CORRENTE ?? faseCorrente,
      faseIntermediaria: avaliacao?.porFase?.INTERMEDIARIA ?? faseIntermediaria,
      fasePermanente,
      aptosRecolhimentoTtd,
      aptosEliminacaoTtd,
      destinacaoGuardaPermanente,
      destinacaoEliminacao,
      comHashSha256: Math.max(comHashSha256, resumoAuditoria?.documentosComHash ?? 0),
      fixidadeVerificadaCount: Math.max(
        fixidadeVerificadaCount,
        resumoAuditoria?.documentosIntegros ?? 0
      ),
      violadosReais,
      taxaIntegridade,
      totalEventosAuditoria,
      eventosPorCategoria: resumoAuditoria?.eventosPorCategoria ?? {
        CICLO_VIDA: 0,
        PRESERVACAO: 0,
        PROCEDIMENTAL: 0,
        CLASSE: 0,
      },
      vinculadosDossie,
      avulsosSemDossie,
      totalDossies: dossies.length,
      dossiesAbertos,
      dossiesEncerrados,
      dossiesRecolhidos,
      totalClassesPcd: classesPcd.length,
      classesAtivas,
      classesFim,
      classesMeio,
      totalTermosEliminacao: termosEliminacao.length,
      totalPacotesSip: resumoSip.totalPacotesSip,
      totalAipsArmazenados: resumoSip.totalAipsArmazenados,
      pacotesEmProcessamento: resumoSip.pacotesEmProcessamento,
      totalRecolhidosRdcArq,
      candidatosSipPendentes,
      porFormato,
    };
  }, [
    acervo.length,
    documentosFiltrados,
    dossies,
    classesPcd,
    avaliacao,
    resumoAuditoria,
    eventosRecentes.length,
    termosEliminacao.length,
    resumoSip,
  ]);

  // Fila Inteligente de Alertas e Recomendações para o Arquivista (e-ARQ Brasil v2)
  const alertasArquivista = useMemo<AlertaArquivistico[]>(() => {
    const lista: AlertaArquivistico[] = [];

    if (metricas.violadosReais > 0) {
      lista.push({
        id: "fixidade-violada",
        severidade: "critico",
        normaReferencia: "e-ARQ Brasil v2 · Parte I, Seção 10.3 (PREMIS Fixity)",
        titulo: `${metricas.violadosReais} componente(s) digital(is) com divergência de Hash SHA-256`,
        descricao:
          "Foi detectada alteração de bitstream ou ausência física no repositório. Inspecione imediatamente a Trilha de Auditoria e valide a cópia de segurança.",
        acaoRotulo: "Inspecionar Fixidade",
        abaDestino: "auditoria",
        quantidade: metricas.violadosReais,
      });
    } else {
      lista.push({
        id: "fixidade-integra",
        severidade: "sucesso",
        normaReferencia: "PREMIS 3.0 & e-ARQ Brasil v2 (Autenticidade e Fixidade)",
        titulo: `Cadeia de Custódia Íntegra (${metricas.taxaIntegridade}% SHA-256 validado)`,
        descricao:
          "Todos os componentes digitais verificados mantêm autenticidade e integridade criptográfica inalterada desde a captura no SIGAD.",
        acaoRotulo: "Ver Trilha & PREMIS",
        abaDestino: "auditoria",
      });
    }

    if (metricas.candidatosSipPendentes > 0) {
      lista.push({
        id: "recolhimento-oais",
        severidade: "atencao",
        normaReferencia: "ISO 14721 (OAIS) · Resolução CONARQ nº 51/2023 (RDC-Arq)",
        titulo: `${metricas.candidatosSipPendentes} documento(s) de Guarda Permanente aguardando pacote SIP`,
        descricao:
          "Documentos de valor histórico/probatório (Atividade-Fim ou Guarda Permanente) prontos para empacotamento BagIt RFC 8493 e admissão no Archivematica.",
        acaoRotulo: "Empacotar SIP (RDC-Arq)",
        abaDestino: "archivematica",
        quantidade: metricas.candidatosSipPendentes,
      });
    }

    if (metricas.aptosEliminacaoTtd > 0 || metricas.aptosRecolhimentoTtd > 0) {
      lista.push({
        id: "temporalidade-ttd",
        severidade: "atencao",
        normaReferencia: "e-ARQ Brasil v2 · Seção 5 (Avaliação, Temporalidade e Destinação)",
        titulo: `${metricas.aptosRecolhimentoTtd} apto(s) a recolhimento e ${metricas.aptosEliminacaoTtd} apto(s) a eliminação`,
        descricao:
          "Existem documentos que cumpriram os prazos das fases corrente e intermediária na Tabela de Temporalidade (TTD) e requerem destinação pelo Arquivista.",
        acaoRotulo: "Avaliar Prazos na TTD",
        abaDestino: "gestao",
        quantidade: metricas.aptosRecolhimentoTtd + metricas.aptosEliminacaoTtd,
      });
    }

    if (metricas.avulsosSemDossie > 0) {
      lista.push({
        id: "organicidade-dossies",
        severidade: "info",
        normaReferencia: "e-ARQ Brasil v2 · Seção 3.2 (Unidades de Arquivamento / Juntada)",
        titulo: `${metricas.avulsosSemDossie} documento(s) avulso(s) sem juntada em Dossiê ou Processo`,
        descricao:
          "Para fortalecer o vínculo arquivístico orgânico dos Núcleos de Pesquisa, vincule os documentos correlatos a um Dossiê temático ou Processo.",
        acaoRotulo: "Gerenciar Dossiês",
        abaDestino: "gestao",
        quantidade: metricas.avulsosSemDossie,
      });
    }

    if (metricas.totalRestritosOuSigilosos > 0) {
      lista.push({
        id: "restricao-acesso",
        severidade: "info",
        normaReferencia: "Lei nº 12.527/2011 (LAI) & Lei nº 13.709/2018 (LGPD)",
        titulo: `${metricas.totalRestritosOuSigilosos} documento(s) com grau de sigilo ou restrição pessoal`,
        descricao: `${metricas.restritosLgpd} classificado(s) com dados pessoais (LGPD) e ${metricas.sigilososLai} com restrição legal (LAI) sob controle de acesso no SIGAD.`,
        acaoRotulo: "Revisar Metadados",
        abaDestino: "upload",
        quantidade: metricas.totalRestritosOuSigilosos,
      });
    }

    return lista;
  }, [metricas]);

  return {
    classesPcd,
    dossies,
    avaliacao,
    resumoAuditoria,
    eventosRecentes,
    termosEliminacao,
    pacotesSip,
    resumoSip,
    metricas,
    alertasArquivista,
    carregandoTelemetria,
    ultimaAtualizacao,
    recarregarTelemetriaSigad,
  };
}
