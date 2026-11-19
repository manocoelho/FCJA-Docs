import { useState, useMemo, useEffect } from "react";
import {
  Archive,
  CheckCircle2,
  CloudCog,
  Compass,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode2,
  FolderKanban,
  HardDriveDownload,
  Layers,
  PackageCheck,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@/components/ged/data";
import { formatarTamanho } from "@/lib/formatters";
import { podeExecutarAcaoArquivistica } from "@/lib/auth";
import { urlDownloadPacoteSip } from "@/lib/archivematica-api";
import { useArchivematicaSigad } from "@/hooks/useArchivematicaSigad";
import {
  ModalConfirmacaoAcaoSigad,
  useConfirmacaoSigad,
} from "@/components/ged/ModalConfirmacaoAcaoSigad";

interface TelaArchivematicaSigadProps {
  acervo: Doc[];
  usuarioPapel?: string | null | undefined;
  onAcervoAlterado?: (() => void) | undefined;
}

export function TelaArchivematicaSigad({
  acervo,
  usuarioPapel,
  onAcervoAlterado,
}: TelaArchivematicaSigadProps) {
  const {
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
  } = useArchivematicaSigad(onAcervoAlterado);

  const temPermissaoArquivista = podeExecutarAcaoArquivistica(usuarioPapel ?? null);

  const [subAba, setSubAba] = useState<"construtor" | "pacotes" | "fpr" | "config">("construtor");
  const {
    confirmacaoAtiva,
    processandoConfirmacao,
    solicitarConfirmacao,
    fecharConfirmacao,
    executarConfirmacao,
  } = useConfirmacaoSigad();
  const [abaInspecaoArquivo, setAbaInspecaoArquivo] = useState<
    "metadataCsv" | "rightsCsv" | "premisXml" | "metsXml" | "termoSubmissao"
  >("metadataCsv");

  // Estados do Construtor de Pacotes SIP
  const [tituloSip, setTituloSip] = useState("");
  const [dossieSelecionado, setDossieSelecionado] = useState<string>("NENHUM");
  const [filtroCandidatos, setFiltroCandidatos] = useState<
    "PERMANENTE_PENDENTE" | "TODOS_PENDENTES" | "TODOS"
  >("PERMANENTE_PENDENTE");
  const [buscaDoc, setBuscaDoc] = useState("");
  const [docsMarcados, setDocsMarcados] = useState<string[]>([]);

  // Estados da Configuração do Conector Dual ({AM} porta 80 + {SS} porta 8000)
  const [urlArchivematica, setUrlArchivematica] = useState("http://192.168.1.132");
  const [usuarioArchivematica, setUsuarioArchivematica] = useState("fcja_sigad");
  const [apiKeyArchivematica, setApiKeyArchivematica] = useState("");

  const [urlStorageService, setUrlStorageService] = useState("http://192.168.1.132:8000");
  const [usuarioStorageService, setUsuarioStorageService] = useState("fcja_sigad");
  const [apiKeyStorageService, setApiKeyStorageService] = useState("");

  const [locationUuidTransfer, setLocationUuidTransfer] = useState("");
  const [caminhoRelativoTransfer, setCaminhoRelativoTransfer] = useState("/");
  const [diretorioCompartilhado, setDiretorioCompartilhado] = useState(
    "/var/archivematica/sharedDirectory/watchedDirectories/activeTransfers/standardTransfer"
  );
  const [processingConfig, setProcessingConfig] = useState("automated");
  const [autoApprove, setAutoApprove] = useState(true);
  const [urlAtom, setUrlAtom] = useState("http://192.168.1.110");

  useEffect(() => {
    if (config) {
      setUrlArchivematica(config.urlArchivematica);
      setUsuarioArchivematica(config.usuarioArchivematica);
      setUrlStorageService(config.urlStorageService || "http://192.168.1.132:8000");
      setUsuarioStorageService(config.usuarioStorageService || "fcja_sigad");
      setLocationUuidTransfer(config.locationUuidTransfer);
      setCaminhoRelativoTransfer(config.caminhoRelativoTransfer || "/");
      setDiretorioCompartilhado(config.diretorioCompartilhado);
      setProcessingConfig(config.processingConfig);
      setAutoApprove(config.autoApprove);
      setUrlAtom(config.urlAtom);
    }
  }, [config]);

  const mapaFprPorExt = useMemo(() => {
    const m = new Map<string, (typeof regrasFpr)[number]>();
    for (const r of regrasFpr) {
      m.set(r.ext.toLowerCase(), r);
    }
    return m;
  }, [regrasFpr]);

  const candidatosRecolhimento = useMemo(() => {
    return acervo
      .filter((d) => {
        if (dossieSelecionado !== "NENHUM") {
          return String(d.dossieId || "") === dossieSelecionado;
        }
        if (filtroCandidatos === "PERMANENTE_PENDENTE") {
          const ehPermanente =
            d.destinacaoPrevista === "GUARDA_PERMANENTE" || d.tipoAtividade === "Atividade-Fim";
          return ehPermanente && !d.pacoteSipId;
        }
        if (filtroCandidatos === "TODOS_PENDENTES") {
          return !d.pacoteSipId;
        }
        return true;
      })
      .filter((d) => {
        if (!buscaDoc.trim()) return true;
        const q = buscaDoc.toLowerCase();
        return (
          d.nome.toLowerCase().includes(q) ||
          (d.numeroProtocolo || "").toLowerCase().includes(q) ||
          (d.codigoClassificacao || "").toLowerCase().includes(q) ||
          (d.nucleo || "").toLowerCase().includes(q)
        );
      });
  }, [acervo, dossieSelecionado, filtroCandidatos, buscaDoc]);

  const totalCandidatosPermanentes = useMemo(
    () =>
      acervo.filter(
        (d) =>
          (d.destinacaoPrevista === "GUARDA_PERMANENTE" || d.tipoAtividade === "Atividade-Fim") &&
          !d.pacoteSipId
      ).length,
    [acervo]
  );

  function alternarDoc(id: string) {
    setDocsMarcados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selecionarTodosVisiveis() {
    const idsVisiveis = candidatosRecolhimento.map((d) => d.id);
    const todosMarcados =
      idsVisiveis.length > 0 && idsVisiveis.every((id) => docsMarcados.includes(id));
    if (todosMarcados) {
      setDocsMarcados((prev) => prev.filter((id) => !idsVisiveis.includes(id)));
    } else {
      setDocsMarcados((prev) => Array.from(new Set([...prev, ...idsVisiveis])));
    }
  }

  function handleConstruirEnviarSip() {
    const dossieIdParam = dossieSelecionado !== "NENHUM" ? dossieSelecionado : undefined;
    const tituloFinal =
      tituloSip.trim() ||
      `Recolhimento Permanente FCJA (${new Date().toLocaleDateString("pt-BR")})`;

    solicitarConfirmacao({
      titulo: "Você deseja prosseguir com a construção e envio do Pacote SIP ao Archivematica?",
      descricao:
        "O SIGAD irá empacotar os objetos digitais em estrutura Standard Transfer + BagIt (RFC 8493) com metadata.csv, rights.csv, premis.xml e manifesto METS, iniciando o recolhimento ao RDC-Arq.",
      categoriaNormativa: "Admissão OAIS (ISO 14721) · Recolhimento ao RDC-Arq",
      variante: "sucesso",
      rotuloConfirmar: "Sim, Gerar e Enviar Pacote SIP",
      detalhesAlvo: [
        `Título do Pacote SIP: ${tituloFinal}`,
        `Quantidade de objetos selecionados: ${docsMarcados.length} documento(s)`,
        `Destino: ${urlArchivematica}`,
      ],
      onConfirmar: async () => {
        const pacote = await gerarNovoPacoteSip({
          titulo: tituloFinal,
          documentoIds: docsMarcados,
          dossieId: dossieIdParam,
        });
        if (pacote) {
          setTituloSip("");
          setDocsMarcados([]);
          setSubAba("pacotes");
        }
      },
    });
  }

  function renderBadgeStatusSip(status: string) {
    if (status === "ARMAZENADO_AIP") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" /> AIP Consolidado (Storage Service)
        </span>
      );
    }
    if (status === "EM_PROCESSAMENTO_AIP") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Microsserviços OAIS (Transfer/Ingest)
        </span>
      );
    }
    if (status === "ENVIADO_ARCHIVEMATICA") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
          <Send className="h-3.5 w-3.5" /> Transferido ao Archivematica
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
        <PackageCheck className="h-3.5 w-3.5" /> Standard Transfer + BagIt Pronto (.zip)
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Archive className="h-3.5 w-3.5" /> Archivematica 1.18.0 · ISO 14721 (OAIS) · Resolução CONARQ nº 51/2023
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Conector Automático SIGAD → Archivematica & Storage Service
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Geração automatizada de pacotes <code>Standard Transfer</code> com{" "}
            <code>objects/</code>, <code>metadata/metadata.csv</code> (Dublin Core + qualificadores +
            campos FCJA), <code>metadata/rights.csv</code> (PREMIS Rights LAI),{" "}
            <code>metadata/premis.xml</code> (PREMIS v3) e validação FPR (1.639 formatos PRONOM).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={executarTesteConexao}
            disabled={testandoConexao}
            className="gap-2 bg-white"
          >
            <Server className="h-4 w-4 text-blue-600" />
            {testandoConexao ? "Diagnosticando..." : "Testar Conexão RDC-Arq"}
          </Button>
          <Button
            variant="outline"
            onClick={recarregarTudo}
            disabled={carregando}
            className="gap-2 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* Banner de Diagnóstico de Rede se executado */}
      {diagnostico && (
        <div
          className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
            diagnostico.conectadoApi || diagnostico.conectadoStorageService || diagnostico.diretorioAcessivel
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
              : "border-blue-200 bg-blue-50/70 text-blue-900"
          }`}
        >
          <div className="space-y-1">
            <p className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Modo de Operação Ativo: {diagnostico.modoRecomendado} ({diagnostico.latenciaMs} ms)
            </p>
            <p className="text-xs opacity-90">{diagnostico.mensagem}</p>
          </div>
          <div className="text-xs font-mono bg-white/80 px-3 py-1.5 rounded-lg border">
            AM: {diagnostico.urlArchivematica} | SS: {diagnostico.urlStorageService || "http://192.168.1.132:8000"} | AtoM: {diagnostico.urlAtom}
          </div>
        </div>
      )}

      {/* Cards de Indicadores OAIS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pacotes SIP Gerados
            </span>
            <PackageCheck className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{resumoSip.totalPacotesSip}</p>
          <p className="mt-1 text-xs text-slate-500">
            Standard Transfer + metadata.csv + rights.csv
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Docs Recolhidos (SIP)
            </span>
            <Layers className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {resumoSip.totalDocumentosRecolhidos}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Com premis.xml (PREMIS v3) + fixidade SHA-256
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pacotes AIP Homologados
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {resumoSip.totalAipsArmazenados}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Confirmados no Storage Service (:8000)
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aptos a Recolhimento
            </span>
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-700">{totalCandidatosPermanentes}</p>
          <p className="mt-1 text-xs text-slate-500">
            Guarda Permanente aguardando SIP
          </p>
        </div>
      </div>

      {/* Navegação de Sub-Abas */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          variant={subAba === "construtor" ? "default" : "outline"}
          onClick={() => setSubAba("construtor")}
          className="gap-2"
        >
          <FileCode2 className="h-4 w-4" />
          1. Construtor de Pacote SIP (Standard Transfer)
        </Button>
        <Button
          variant={subAba === "pacotes" ? "default" : "outline"}
          onClick={() => setSubAba("pacotes")}
          className="gap-2"
        >
          <HardDriveDownload className="h-4 w-4" />
          2. Fila de Transferências — 8 Etapas ({pacotesSip.length})
        </Button>
        <Button
          variant={subAba === "fpr" ? "default" : "outline"}
          onClick={() => setSubAba("fpr")}
          className="gap-2"
        >
          <FileCheck2 className="h-4 w-4" />
          3. Política de Formatos FPR (1.639 PRONOM)
        </Button>
        <Button
          variant={subAba === "config" ? "default" : "outline"}
          onClick={() => setSubAba("config")}
          className="gap-2"
        >
          <CloudCog className="h-4 w-4" />
          4. Configuração Archivematica (:80) & Storage Service (:8000)
        </Button>
      </div>

      {/* SUB-ABA 1: CONSTRUTOR DE PACOTES SIP */}
      {subAba === "construtor" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Seleção de Documentos ou Dossiê para Empacotamento SIP (Standard Transfer)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selecione um Dossiê orgânico inteiro ou marque documentos individuais de Guarda
                  Permanente. O SIGAD valida automaticamente o PUID PRONOM e gera{" "}
                  <code>metadata.csv</code>, <code>rights.csv</code> e <code>premis.xml</code>.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {docsMarcados.length} documento(s) marcado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Título Descritivo do Pacote SIP (dc.description / External-Description)</Label>
                <Input
                  value={tituloSip}
                  onChange={(e) => setTituloSip(e.target.value)}
                  placeholder="Ex: Recolhimento Manuscritos José Américo — Lote 01/2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                  Vincular Dossiê / Processo Inteiro (Accession Number)
                </Label>
                <Select
                  value={dossieSelecionado}
                  onValueChange={(val) => {
                    setDossieSelecionado(val);
                    if (val !== "NENHUM") {
                      const docsDoDossie = acervo
                        .filter((d) => String(d.dossieId || "") === val)
                        .map((d) => d.id);
                      setDocsMarcados(docsDoDossie);
                      const dObj = dossies.find((x) => String(x.id) === val);
                      if (dObj && !tituloSip) {
                        setTituloSip(`Recolhimento Dossiê ${dObj.codigoDossie} — ${dObj.titulo}`);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NENHUM">
                      Seleção Avulsa de Documentos (Sem filtro de Dossiê)
                    </SelectItem>
                    {dossies.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.codigoDossie} — {d.titulo} ({d.totalDocumentos} doc.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={filtroCandidatos === "PERMANENTE_PENDENTE" ? "default" : "outline"}
                  onClick={() => setFiltroCandidatos("PERMANENTE_PENDENTE")}
                >
                  Guarda Permanente Pendentes
                </Button>
                <Button
                  size="sm"
                  variant={filtroCandidatos === "TODOS_PENDENTES" ? "default" : "outline"}
                  onClick={() => setFiltroCandidatos("TODOS_PENDENTES")}
                >
                  Todos Pendentes de SIP
                </Button>
                <Button
                  size="sm"
                  variant={filtroCandidatos === "TODOS" ? "default" : "outline"}
                  onClick={() => setFiltroCandidatos("TODOS")}
                >
                  Todo o Acervo ({acervo.length})
                </Button>
              </div>

              <Input
                value={buscaDoc}
                onChange={(e) => setBuscaDoc(e.target.value)}
                placeholder="Buscar por protocolo, título ou classe..."
                className="w-full sm:w-64 h-8 text-xs"
              />
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b text-xs font-semibold text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={
                      candidatosRecolhimento.length > 0 &&
                      candidatosRecolhimento.every((d) => docsMarcados.includes(d.id))
                    }
                    onCheckedChange={selecionarTodosVisiveis}
                  />
                  Selecionar todos os {candidatosRecolhimento.length} listados
                </label>
                <span>FPR (PRONOM) / Destinação TTD</span>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y">
                {candidatosRecolhimento.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum documento encontrado para este filtro.
                  </div>
                ) : (
                  candidatosRecolhimento.map((doc) => {
                    const marcado = docsMarcados.includes(doc.id);
                    const extDoc = (doc.ext || "pdf").toLowerCase().replace(".", "");
                    const regraFpr = mapaFprPorExt.get(extDoc);
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                          marcado ? "bg-blue-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <Checkbox
                            checked={marcado}
                            onCheckedChange={() => alternarDoc(doc.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {doc.numeroProtocolo && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                                  {doc.numeroProtocolo}
                                </span>
                              )}
                              <span className="font-medium text-slate-900 truncate">
                                {doc.nome}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              Classe: {doc.codigoClassificacao || "000"} · {doc.nucleo} · Acesso:{" "}
                              <strong>{doc.nivelAcesso || "OSTENSIVO"}</strong>
                            </p>
                            {regraFpr && (
                              <p className="text-[11px] text-blue-700 font-medium mt-0.5 truncate">
                                PRONOM: <code className="font-mono">{regraFpr.puidPronom.split(",")[0]}</code> ·{" "}
                                Preservação: {regraFpr.formatoPreservacao} · Validador:{" "}
                                {regraFpr.ferramentaValidacao}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              doc.destinacaoPrevista === "GUARDA_PERMANENTE" ||
                              doc.tipoAtividade === "Atividade-Fim"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {doc.destinacaoPrevista === "GUARDA_PERMANENTE" ||
                            doc.tipoAtividade === "Atividade-Fim"
                              ? "Guarda Permanente"
                              : "Atividade-Meio"}
                          </span>
                          {doc.pacoteSipId && (
                            <span className="font-mono text-[10px] text-purple-700 font-semibold">
                              SIP: {doc.pacoteSipId}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Painel Lateral de Prévia da Estrutura Standard Transfer (Archivematica 1.18.0) */}
          <div className="space-y-4 rounded-2xl border bg-slate-950 p-6 text-slate-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Archive className="h-4 w-4" /> Estrutura Standard Transfer (192.168.1.132)
              </div>
              <h4 className="text-lg font-semibold text-white">
                Conformidade 100% com o Archivematica 1.18.0 da FCJA
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                O SIGAD gera automaticamente o pacote no formato{" "}
                <strong className="text-white">Standard Transfer</strong> exigido pela API{" "}
                <code>/api/v2beta/package</code> e valida os direitos via{" "}
                <code>/api/v2beta/validate/rights/</code>:
              </p>

              <pre className="rounded-xl bg-slate-900/90 border border-white/10 p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`FCJA-SIP-2026-XXXX/
├── objects/
│   └── (${docsMarcados.length} arquivo(s) binário(s) original(is))
└── metadata/
    ├── metadata.csv       (15 DC + dcterms + FCJA)
    ├── rights.csv         (18 col. PREMIS Rights / LAI)
    ├── premis.xml         (PREMIS v3 XML pré-depósito)
    ├── mets_earq_manifest.xml
    └── submissionDocumentation/
        └── termo_recolhimento_sigad_fcja.txt`}
              </pre>

              <div className="space-y-2 rounded-xl bg-white/5 p-3.5 text-xs text-slate-300">
                <p className="font-semibold text-white">Campos gerados automaticamente:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>
                    <strong>metadata.csv:</strong> <code>filename</code> (<code>objects/...</code>),{" "}
                    <code>dc.title</code>, <code>dc.creator</code>, <code>dc.date</code> (ISO 8601),{" "}
                    <code>dc.type</code> (DCMI), <code>dc.language</code> (<code>pt-BR</code>),{" "}
                    <code>dcterms.isPartOf</code>, <code>classificacao</code>,{" "}
                    <code>prazo_guarda</code>, <code>destinacao_prevista</code>
                  </li>
                  <li>
                    <strong>rights.csv:</strong> 18 colunas PREMIS Rights (<code>statute</code>,{" "}
                    <code>jurisdiction=br</code>, Lei nº 12.527/2011 LAI,{" "}
                    <code>grant_act=disseminate</code>)
                  </li>
                  <li>
                    <strong>premis.xml:</strong> fixidade SHA-256, PRONOM PUID e eventos ISO 8601
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              {!temPermissaoArquivista && (
                <p className="text-xs text-amber-300">
                  Apenas perfis <strong>Arquivista</strong> ou <strong>Administrador</strong> podem
                  gerar pacotes SIP oficiais.
                </p>
              )}
              <Button
                variant="brand"
                className="w-full gap-2"
                disabled={
                  !temPermissaoArquivista ||
                  gerandoSip ||
                  (docsMarcados.length === 0 && dossieSelecionado === "NENHUM")
                }
                onClick={handleConstruirEnviarSip}
              >
                <Send className="h-4 w-4" />
                {gerandoSip
                  ? "Construindo Standard Transfer e Validando Rights..."
                  : `Construir SIP (${docsMarcados.length} doc.) e Iniciar Transfer`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: FILA DE TRANSFERÊNCIAS SIP -> AIP (PIPELINE DE 8 ETAPAS) */}
      {subAba === "pacotes" && (
        <div className="space-y-4">
          {/* Modal / Painel de Inspeção dos Arquivos Gerados (metadata.csv, rights.csv, premis.xml) */}
          {inspecaoAtiva && (
            <div className="rounded-2xl border-2 border-blue-300 bg-slate-950 p-5 text-slate-100 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <span className="text-xs font-mono uppercase text-blue-400">
                    Inspeção Técnica de Metadados do Pacote Standard Transfer
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {inspecaoAtiva.codigoSip} — {inspecaoAtiva.titulo}
                  </h4>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fecharInspecaoSip}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 gap-1"
                >
                  <X className="h-4 w-4" /> Fechar Inspeção
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={abaInspecaoArquivo === "metadataCsv" ? "default" : "outline"}
                  onClick={() => setAbaInspecaoArquivo("metadataCsv")}
                  className="text-xs"
                >
                  metadata/metadata.csv (Dublin Core + FCJA)
                </Button>
                <Button
                  size="sm"
                  variant={abaInspecaoArquivo === "rightsCsv" ? "default" : "outline"}
                  onClick={() => setAbaInspecaoArquivo("rightsCsv")}
                  className="text-xs"
                >
                  metadata/rights.csv (18 Colunas PREMIS Rights)
                </Button>
                <Button
                  size="sm"
                  variant={abaInspecaoArquivo === "premisXml" ? "default" : "outline"}
                  onClick={() => setAbaInspecaoArquivo("premisXml")}
                  className="text-xs"
                >
                  metadata/premis.xml (PREMIS v3 XML)
                </Button>
                <Button
                  size="sm"
                  variant={abaInspecaoArquivo === "metsXml" ? "default" : "outline"}
                  onClick={() => setAbaInspecaoArquivo("metsXml")}
                  className="text-xs"
                >
                  metadata/mets_earq_manifest.xml
                </Button>
                <Button
                  size="sm"
                  variant={abaInspecaoArquivo === "termoSubmissao" ? "default" : "outline"}
                  onClick={() => setAbaInspecaoArquivo("termoSubmissao")}
                  className="text-xs"
                >
                  submissionDocumentation/termo.txt
                </Button>
              </div>

              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 border border-white/10 p-4 text-xs font-mono text-emerald-300 whitespace-pre">
                {inspecaoAtiva.arquivos[abaInspecaoArquivo] ||
                  "Arquivo não disponível neste pacote (gere um novo pacote SIP para incluir todos os artefatos da versão 1.18.0)."}
              </pre>
            </div>
          )}

          {pacotesSip.length === 0 ? (
            <div className="rounded-2xl border bg-white p-12 text-center space-y-3">
              <PackageCheck className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-800">
                Nenhum Pacote SIP gerado até o momento
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Utilize a aba &ldquo;Construtor de Pacote SIP&rdquo; para empacotar documentos de
                Guarda Permanente e iniciar a transferência para o Archivematica.
              </p>
            </div>
          ) : (
            pacotesSip.map((sip) => {
              const etapa5Concluida =
                sip.statusTransfer === "COMPLETE" ||
                sip.statusSip === "EM_PROCESSAMENTO_AIP" ||
                sip.statusSip === "ARMAZENADO_AIP";
              const etapa6Concluida =
                sip.statusIngest === "COMPLETE" || sip.statusSip === "ARMAZENADO_AIP";
              const etapa7Concluida =
                sip.statusStorage === "UPLOADED" || sip.statusSip === "ARMAZENADO_AIP";

              return (
                <div
                  key={sip.id}
                  className="rounded-2xl border bg-white p-6 shadow-sm space-y-4 transition-all hover:border-blue-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                          {sip.codigoSip}
                        </span>
                        {renderBadgeStatusSip(sip.statusSip)}
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          rights.csv: {sip.rightsValidado !== false ? "Validado (18 col.)" : "Pendente"}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Modo: {sip.modoTransmissao}
                        </span>
                        {sip.codigoDossie && (
                          <span className="rounded bg-purple-50 px-2 py-0.5 font-mono text-xs font-semibold text-purple-700">
                            Accession/Dossiê: {sip.codigoDossie}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900">{sip.titulo}</h4>
                      <p className="text-xs text-muted-foreground">
                        Núcleo: <strong>{sip.nucleo}</strong> · Criado em {sip.criadoEm} por{" "}
                        <strong>{sip.usuarioResponsavel}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirInspecaoSip(sip.id)}
                        className="gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-purple-600" />
                        Inspecionar CSV / XML
                      </Button>

                      <a
                        href={urlDownloadPacoteSip(sip.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-600" />
                        Baixar Pacote (.zip)
                      </a>

                      {temPermissaoArquivista && sip.statusSip !== "ARMAZENADO_AIP" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => avancarOuSincronizarSip(sip.id, false)}
                            className="gap-1.5 text-xs"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Consultar Etapas 5–7
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => avancarOuSincronizarSip(sip.id, true)}
                            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Homologar AIP (Etapa 8)
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rastreador Visual das 8 Etapas da Automação FCJA (Archivematica 1.18.0) */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 pt-1">
                    {[
                      { num: 1, nome: "Transfer Source", ok: true },
                      { num: 2, nome: "Pacote Standard", ok: true },
                      { num: 3, nome: "Validação Rights", ok: sip.rightsValidado !== false },
                      {
                        num: 4,
                        nome: "POST /v2beta/pkg",
                        ok: sip.statusSip !== "ERRO_TRANSMISSAO",
                      },
                      { num: 5, nome: "Status Transfer", ok: etapa5Concluida },
                      { num: 6, nome: "Status Ingest", ok: etapa6Concluida },
                      { num: 7, nome: "Storage Service", ok: etapa7Concluida },
                      { num: 8, nome: "Vínculo AIP SIGAD", ok: sip.statusSip === "ARMAZENADO_AIP" },
                    ].map((et) => (
                      <div
                        key={et.num}
                        className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                          et.ok
                            ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>Etapa {et.num}</span>
                          {et.ok && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                        </div>
                        <div className="truncate mt-0.5">{et.nome}</div>
                      </div>
                    ))}
                  </div>

                  {/* Metadados Técnicos do Pacote (Transfer UUID, SIP UUID, AIP UUID, Storage Service) */}
                  <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-5 border">
                    <div>
                      <span className="text-slate-500 block">Transfer UUID (Etapa 4/5):</span>
                      <span className="font-mono font-semibold text-slate-800 break-all">
                        {sip.transferUuid || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SIP UUID (Etapa 5/6 Ingest):</span>
                      <span className="font-mono font-semibold text-blue-700 break-all">
                        {sip.sipUuid || sip.aipUuid || "Aguardando Transfer COMPLETE"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">AIP UUID (Etapa 7/8 Storage):</span>
                      <span className="font-mono font-semibold text-emerald-700 break-all">
                        {sip.aipUuid || "Aguardando conclusão do Ingest"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Microsserviço / Storage Status:</span>
                      <span className="font-semibold text-slate-800">
                        {sip.microserviceAtual || sip.statusStorage || "Pronto"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Volume & Fixidade (.zip):</span>
                      <span className="font-semibold text-slate-800">
                        {sip.quantidadeDocumentos} doc(s) · {formatarTamanho(sip.tamanhoTotalBytes)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
                    <strong>Diagnóstico do Pipeline OAIS:</strong> {sip.mensagemStatus}
                    {sip.caminhoAipStorage && (
                      <span className="block font-mono text-[11px] text-emerald-800 mt-1">
                        Caminho AIP no Storage Service (:8000): {sip.caminhoAipStorage}
                      </span>
                    )}
                  </p>

                  {/* Lista de Documentos Contidos no SIP com PUID PRONOM */}
                  {sip.documentos && sip.documentos.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Objetos em <code>objects/</code>, <code>metadata/metadata.csv</code>,{" "}
                        <code>metadata/rights.csv</code> e <code>metadata/premis.xml</code>:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sip.documentos.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs text-slate-700"
                          >
                            <span className="font-mono font-bold text-blue-700">
                              {d.numeroProtocolo || d.id}
                            </span>
                            <span className="truncate max-w-[200px]">{d.nome}</span>
                            {d.fprPuid && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-600">
                                {d.fprPuid.split(",")[0]}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-ABA 3: POLÍTICA DE FORMATOS FPR (1.639 FORMATOS PRONOM — SERVIDOR 192.168.1.132) */}
      {subAba === "fpr" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Format Policy Registry (FPR) — Archivematica 1.18.0 (Servidor FCJA 192.168.1.132)
              </h3>
              <p className="text-xs text-muted-foreground">
                Regras oficiais de identificação PRONOM (Siegfried), validação estrutural (JHOVE /
                FFprobe) e normalização automática para Preservação (AIP) e Acesso (DIP/AtoM).
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              1.639 Versões de Formatos PRONOM Ativas
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2.5">Extensão</th>
                  <th className="px-3 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5">PUID PRONOM (Siegfried)</th>
                  <th className="px-3 py-2.5">Normalização de Preservação (AIP)</th>
                  <th className="px-3 py-2.5">Derivada de Acesso (DIP / AtoM)</th>
                  <th className="px-3 py-2.5">Ferramenta de Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {regrasFpr.map((r) => (
                  <tr key={r.ext} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono font-bold text-blue-700">.{r.ext}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{r.categoria}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{r.puidPronom}</td>
                    <td className="px-3 py-2.5 text-emerald-800 font-medium">
                      {r.acaoPreservacao}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{r.acaoAcesso}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">
                      {r.ferramentaValidacao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA 4: CONFIGURAÇÃO DUAL ARCHIVEMATICA (:80), STORAGE SERVICE (:8000) & ATOM */}
      {subAba === "config" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Credenciais Duplas: Archivematica Dashboard (:80) + Storage Service (:8000)
              </h3>
              <p className="text-xs text-muted-foreground">
                Conforme a especificação técnica da FCJA (<code>http://192.168.1.132</code>), a
                automação completa utiliza a API do Dashboard (Etapas 3 a 6) e a API do Storage
                Service na porta 8000 (Etapas 1, 7 e 8).
              </p>
            </div>
            {temPermissaoArquivista && (
              <Button
                variant="outline"
                onClick={executarDescobertaTransferSource}
                disabled={descobrindoTransferSource}
                className="gap-2 border-blue-200 bg-blue-50/60 text-blue-800 hover:bg-blue-100"
              >
                <Compass className={`h-4 w-4 ${descobrindoTransferSource ? "animate-spin" : ""}`} />
                {descobrindoTransferSource
                  ? "Consultando porta 8000..."
                  : "Descobrir Transfer Source (Etapa 1)"}
              </Button>
            )}
          </div>

          {/* Bloco 1: Servidor Archivematica Dashboard ({AM} porta 80) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
              1. Archivematica Dashboard (&#123;AM&#125; — Porta 80 — Etapas 3, 4, 5 e 6)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>URL do Archivematica Dashboard</Label>
                <Input
                  value={urlArchivematica}
                  onChange={(e) => setUrlArchivematica(e.target.value)}
                  placeholder="http://192.168.1.132"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Usuário da API do Dashboard</Label>
                <Input
                  value={usuarioArchivematica}
                  onChange={(e) => setUsuarioArchivematica(e.target.value)}
                  placeholder="fcja_sigad"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  API Key do Dashboard{" "}
                  {config?.apiKeyConfigurada && (
                    <span className="text-emerald-600 font-normal">
                      ({config.apiKeyMascarada})
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={apiKeyArchivematica}
                  onChange={(e) => setApiKeyArchivematica(e.target.value)}
                  placeholder={
                    config?.apiKeyConfigurada
                      ? "Em branco mantém a chave atual"
                      : "Admin -> Users -> API Key..."
                  }
                  disabled={!temPermissaoArquivista}
                />
              </div>
            </div>
          </div>

          {/* Bloco 2: Servidor Archivematica Storage Service ({SS} porta 8000) */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700">
              2. Archivematica Storage Service (&#123;SS&#125; — Porta 8000 — Etapas 1, 7 e 8)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>URL do Storage Service (:8000)</Label>
                <Input
                  value={urlStorageService}
                  onChange={(e) => setUrlStorageService(e.target.value)}
                  placeholder="http://192.168.1.132:8000"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Usuário do Storage Service</Label>
                <Input
                  value={usuarioStorageService}
                  onChange={(e) => setUsuarioStorageService(e.target.value)}
                  placeholder="fcja_sigad"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  API Key do Storage Service{" "}
                  {config?.apiKeyStorageServiceConfigurada && (
                    <span className="text-emerald-600 font-normal">
                      ({config.apiKeyStorageServiceMascarada})
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={apiKeyStorageService}
                  onChange={(e) => setApiKeyStorageService(e.target.value)}
                  placeholder={
                    config?.apiKeyStorageServiceConfigurada
                      ? "Em branco mantém a chave atual"
                      : "Porta 8000 -> Users -> API Key..."
                  }
                  disabled={!temPermissaoArquivista}
                />
              </div>
            </div>
          </div>

          {/* Bloco 3: Localização do Transfer Source e Parâmetros de Ingestão */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              3. Localização do Transfer Source (purpose=TS) & Difusão (AtoM)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Location UUID do Transfer Source (Etapa 1)</Label>
                <Input
                  value={locationUuidTransfer}
                  onChange={(e) => setLocationUuidTransfer(e.target.value)}
                  placeholder="Ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Caminho Relativo no Transfer Source (para Base64)</Label>
                <Input
                  value={caminhoRelativoTransfer}
                  onChange={(e) => setCaminhoRelativoTransfer(e.target.value)}
                  placeholder="/ ou /home/integracao"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Processing Configuration</Label>
                <Input
                  value={processingConfig}
                  onChange={(e) => setProcessingConfig(e.target.value)}
                  placeholder="automated"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>
                  Diretório Físico Compartilhado (Onde a pasta do pacote é copiada na Etapa 2)
                </Label>
                <Input
                  value={diretorioCompartilhado}
                  onChange={(e) => setDiretorioCompartilhado(e.target.value)}
                  placeholder="/var/archivematica/sharedDirectory/watchedDirectories/activeTransfers/standardTransfer"
                  disabled={!temPermissaoArquivista}
                />
              </div>

              <div className="space-y-1.5">
                <Label>URL do Servidor AtoM (Difusão Pública)</Label>
                <div className="flex gap-2">
                  <Input
                    value={urlAtom}
                    onChange={(e) => setUrlAtom(e.target.value)}
                    placeholder="http://192.168.1.110"
                    disabled={!temPermissaoArquivista}
                  />
                  {urlAtom && (
                    <a
                      href={urlAtom}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      title="Abrir AtoM"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="md:col-span-3 flex items-center gap-2 pt-1">
                <Checkbox
                  checked={autoApprove}
                  onCheckedChange={(v) => setAutoApprove(v === true)}
                  disabled={!temPermissaoArquivista}
                />
                <span className="text-sm text-slate-700">
                  Aprovar transferência automaticamente (<code>auto_approve = true</code>) ao
                  iniciar pacote <code>type = &quot;standard&quot;</code> no endpoint{" "}
                  <code>POST /api/v2beta/package</code>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Última atualização por <strong>{config?.atualizadoPor || "sistema"}</strong> em{" "}
              {config?.atualizadoEm || "—"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={executarTesteConexao} disabled={testandoConexao}>
                Testar Conexão Agora
              </Button>
              {temPermissaoArquivista && (
                <Button
                  variant="brand"
                  onClick={() =>
                    solicitarConfirmacao({
                      titulo:
                        "Você deseja salvar as alterações de configuração do Conector Archivematica?",
                      descricao:
                        "Os novos endereços, credenciais de API e diretórios de transferência serão aplicados ao conector OAIS do SIGAD.",
                      categoriaNormativa: "Configuração de Interoperabilidade RDC-Arq",
                      variante: "atencao",
                      rotuloConfirmar: "Sim, Salvar Configuração",
                      detalhesAlvo: [
                        `Dashboard Archivematica: ${urlArchivematica}`,
                        `Storage Service (:8000): ${urlStorageService}`,
                        `Portal AtoM (DIP): ${urlAtom}`,
                      ],
                      onConfirmar: () =>
                        salvarConfiguracao({
                          urlArchivematica,
                          usuarioArchivematica,
                          apiKeyArchivematica: apiKeyArchivematica || undefined,
                          urlStorageService,
                          usuarioStorageService,
                          apiKeyStorageService: apiKeyStorageService || undefined,
                          locationUuidTransfer,
                          caminhoRelativoTransfer,
                          diretorioCompartilhado,
                          processingConfig,
                          autoApprove,
                          urlAtom,
                        }),
                    })
                  }
                >
                  Salvar Configuração do Conector
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacaoAcaoSigad
        dados={confirmacaoAtiva}
        processando={gerandoSip || processandoConfirmacao}
        onFechar={fecharConfirmacao}
        onConfirmar={executarConfirmacao}
      />
    </div>
  );
}
