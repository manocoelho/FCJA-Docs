import { useState, useMemo, useEffect } from "react";
import {
  Archive,
  CheckCircle2,
  CloudCog,
  Download,
  ExternalLink,
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
    dossies,
    carregando,
    gerandoSip,
    testandoConexao,
    recarregarTudo,
    executarTesteConexao,
    salvarConfiguracao,
    gerarNovoPacoteSip,
    avancarOuSincronizarSip,
  } = useArchivematicaSigad(onAcervoAlterado);

  const temPermissaoArquivista = podeExecutarAcaoArquivistica(usuarioPapel ?? null);

  const [subAba, setSubAba] = useState<"construtor" | "pacotes" | "config">("construtor");

  // Estados do Construtor de Pacotes SIP
  const [tituloSip, setTituloSip] = useState("");
  const [dossieSelecionado, setDossieSelecionado] = useState<string>("NENHUM");
  const [filtroCandidatos, setFiltroCandidatos] = useState<
    "PERMANENTE_PENDENTE" | "TODOS_PENDENTES" | "TODOS"
  >("PERMANENTE_PENDENTE");
  const [buscaDoc, setBuscaDoc] = useState("");
  const [docsMarcados, setDocsMarcados] = useState<string[]>([]);

  // Estados da Configuração do Conector
  const [urlArchivematica, setUrlArchivematica] = useState("http://192.168.1.20:62080");
  const [usuarioArchivematica, setUsuarioArchivematica] = useState("fcja_sigad");
  const [apiKeyArchivematica, setApiKeyArchivematica] = useState("");
  const [locationUuidTransfer, setLocationUuidTransfer] = useState("");
  const [diretorioCompartilhado, setDiretorioCompartilhado] = useState(
    "/var/archivematica/sharedDirectory/watchedDirectories/activeTransfers/standardTransfer"
  );
  const [processingConfig, setProcessingConfig] = useState("automated");
  const [autoApprove, setAutoApprove] = useState(true);
  const [urlAtom, setUrlAtom] = useState("http://192.168.1.21:80");

  useEffect(() => {
    if (config) {
      setUrlArchivematica(config.urlArchivematica);
      setUsuarioArchivematica(config.usuarioArchivematica);
      setLocationUuidTransfer(config.locationUuidTransfer);
      setDiretorioCompartilhado(config.diretorioCompartilhado);
      setProcessingConfig(config.processingConfig);
      setAutoApprove(config.autoApprove);
      setUrlAtom(config.urlAtom);
    }
  }, [config]);

  const candidatosRecolhimento = useMemo(() => {
    return acervo.filter((d) => {
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
    }).filter((d) => {
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

  async function handleConstruirEnviarSip() {
    const dossieIdParam = dossieSelecionado !== "NENHUM" ? dossieSelecionado : undefined;
    const pacote = await gerarNovoPacoteSip({
      titulo:
        tituloSip.trim() ||
        `Recolhimento Permanente FCJA (${new Date().toLocaleDateString("pt-BR")})`,
      documentoIds: docsMarcados,
      dossieId: dossieIdParam,
    });
    if (pacote) {
      setTituloSip("");
      setDocsMarcados([]);
      setSubAba("pacotes");
    }
  }

  function renderBadgeStatusSip(status: string) {
    if (status === "ARMAZENADO_AIP") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" /> AIP Consolidado (RDC-Arq)
        </span>
      );
    }
    if (status === "EM_PROCESSAMENTO_AIP") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Microsserviços OAIS (Ingest)
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
        <PackageCheck className="h-3.5 w-3.5" /> BagIt SIP Pronto (.zip)
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
              <Archive className="h-3.5 w-3.5" /> ISO 14721 (OAIS) · BagIt RFC 8493 · Resolução CONARQ nº 51/2023
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Conector Automático SIGAD → Archivematica (RDC-Arq)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Geração automatizada de pacotes SIP com <code>metadata.csv</code> (Dublin Core +
            Metadados Arquivísticos), manifesto <code>METS</code> e eventos <code>PREMIS</code> para
            recolhimento direto ao Archivematica e difusão no AtoM sem retrabalho.
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
            diagnostico.conectadoApi || diagnostico.diretorioAcessivel
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
            Archivematica: {diagnostico.urlArchivematica} | AtoM: {diagnostico.urlAtom}
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
            Padrão BagIt RFC 8493 + metadata.csv
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
            Com cadeia de custódia PREMIS exportada
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
            Preservação permanente no Archivematica
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
          1. Construtor de Pacote SIP (OAIS / BagIt)
        </Button>
        <Button
          variant={subAba === "pacotes" ? "default" : "outline"}
          onClick={() => setSubAba("pacotes")}
          className="gap-2"
        >
          <HardDriveDownload className="h-4 w-4" />
          2. Fila de Transferências SIP → AIP ({pacotesSip.length})
        </Button>
        <Button
          variant={subAba === "config" ? "default" : "outline"}
          onClick={() => setSubAba("config")}
          className="gap-2"
        >
          <CloudCog className="h-4 w-4" />
          3. Configuração Archivematica & AtoM
        </Button>
      </div>

      {/* SUB-ABA 1: CONSTRUTOR DE PACOTES SIP */}
      {subAba === "construtor" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Seleção de Documentos ou Dossiê para Empacotamento SIP
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selecione um Dossiê orgânico inteiro ou marque documentos individuais de Guarda
                  Permanente para construir o pacote SIP.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {docsMarcados.length} documento(s) marcado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Título Descritivo do Pacote SIP (External-Description)</Label>
                <Input
                  value={tituloSip}
                  onChange={(e) => setTituloSip(e.target.value)}
                  placeholder="Ex: Recolhimento Manuscritos José Américo — Lote 01/2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                  Vincular Dossiê / Processo Inteiro (Opcional)
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
                <span>Destinação TTD / Status SIP</span>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y">
                {candidatosRecolhimento.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum documento encontrado para este filtro.
                  </div>
                ) : (
                  candidatosRecolhimento.map((doc) => {
                    const marcado = docsMarcados.includes(doc.id);
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
                              {doc.tipoAtividade || "Atividade-Meio"} ·{" "}
                              {doc.codigoClassificacao || "Sem classe"} · {doc.nucleo} · SHA-256:{" "}
                              <span className="font-mono">
                                {doc.hashSha256 ? `${doc.hashSha256.slice(0, 12)}...` : "calculado no SIP"}
                              </span>
                            </p>
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

          {/* Painel Lateral de Prévia da Estrutura BagIt / OAIS */}
          <div className="space-y-4 rounded-2xl border bg-slate-950 p-6 text-slate-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Archive className="h-4 w-4" /> Estrutura OAIS SIP Gerada Automaticamente
              </div>
              <h4 className="text-lg font-semibold text-white">
                Zero Retrabalho de Digitação (SIGAD → Archivematica → AtoM)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                O SIGAD converte os metadados capturados no protocolo em um pacote{" "}
                <strong className="text-white">BagIt (RFC 8493)</strong> padronizado que o
                Archivematica ingere sem intervenção manual:
              </p>

              <pre className="rounded-xl bg-slate-900/90 border border-white/10 p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`FCJA-SIP-2026-XXXX/
├── bagit.txt
├── bag-info.txt
├── manifest-sha256.txt
├── tagmanifest-sha256.txt
└── data/
    ├── objects/
    │   └── (${docsMarcados.length} componente(s) digital(is))
    └── metadata/
        ├── metadata.csv       (Dublin Core + SIGAD)
        ├── premis_events.json (Auditoria)
        └── mets_earq_manifest.xml`}
              </pre>

              <div className="space-y-2 rounded-xl bg-white/5 p-3.5 text-xs text-slate-300">
                <p className="font-semibold text-white">Metadados injetados no metadata.csv:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>
                    <code>dc.title</code>, <code>dc.creator</code>, <code>dc.date</code>,{" "}
                    <code>dc.format</code>, <code>dc.rights</code> (LAI/LGPD)
                  </li>
                  <li>
                    <code>earq.protocolo</code> (NUP), <code>earq.codigo_classificacao</code> (PCD)
                  </li>
                  <li>
                    <code>earq.dossie</code> (Relação Orgânica) & <code>earq.sha256</code> (PREMIS)
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
                  ? "Empacotando BagIt e Transmitindo..."
                  : `Construir SIP (${docsMarcados.length} doc.) e Enviar`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: FILA DE TRANSFERÊNCIAS SIP -> AIP */}
      {subAba === "pacotes" && (
        <div className="space-y-4">
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
            pacotesSip.map((sip) => (
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
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Modo: {sip.modoTransmissao}
                      </span>
                      {sip.codigoDossie && (
                        <span className="rounded bg-purple-50 px-2 py-0.5 font-mono text-xs font-semibold text-purple-700">
                          Dossiê: {sip.codigoDossie}
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
                    <a
                      href={urlDownloadPacoteSip(sip.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" />
                      Baixar BagIt (.zip)
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
                          Sincronizar Status Ingest
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => avancarOuSincronizarSip(sip.id, true)}
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Consolidar AIP (RDC-Arq)
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Metadados Técnicos do Pacote (Transfer UUID, AIP UUID, Manifesto SHA-256) */}
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4 border">
                  <div>
                    <span className="text-slate-500 block">Transfer UUID (Archivematica):</span>
                    <span className="font-mono font-semibold text-slate-800 break-all">
                      {sip.transferUuid || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">AIP UUID (Preservação Permanente):</span>
                    <span className="font-mono font-semibold text-emerald-700 break-all">
                      {sip.aipUuid || "Aguardando conclusão do Ingest"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hash SHA-256 do Pacote (.zip):</span>
                    <span className="font-mono font-semibold text-slate-800 break-all">
                      {sip.hashManifestoSha256
                        ? `${sip.hashManifestoSha256.slice(0, 24)}...`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Volume Empacotado:</span>
                    <span className="font-semibold text-slate-800">
                      {sip.quantidadeDocumentos} doc(s) · {formatarTamanho(sip.tamanhoTotalBytes)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
                  <strong>Status do Pipeline OAIS:</strong> {sip.mensagemStatus}
                </p>

                {/* Lista de Documentos Contidos no SIP */}
                {sip.documentos && sip.documentos.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Componentes Digitais Incluídos em <code>data/objects/</code> e{" "}
                      <code>data/metadata/metadata.csv</code>:
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
                          <span className="truncate max-w-[220px]">{d.nome}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-ABA 3: CONFIGURAÇÃO DO CONECTOR ARCHIVEMATICA & ATOM */}
      {subAba === "config" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Parâmetros do Conector REST API v2beta (Archivematica) & Difusão (AtoM)
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure o endereço do servidor Archivematica na rede interna da FCJA e o diretório
              compartilhado para ingestão automatizada de pacotes SIP.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>URL do Servidor Archivematica Dashboard (Rede Local FCJA)</Label>
              <Input
                value={urlArchivematica}
                onChange={(e) => setUrlArchivematica(e.target.value)}
                placeholder="http://192.168.1.20:62080"
                disabled={!temPermissaoArquivista}
              />
            </div>

            <div className="space-y-2">
              <Label>URL do Servidor AtoM (Difusão e Acesso Público)</Label>
              <div className="flex gap-2">
                <Input
                  value={urlAtom}
                  onChange={(e) => setUrlAtom(e.target.value)}
                  placeholder="http://192.168.1.21:80"
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

            <div className="space-y-2">
              <Label>Usuário da API do Archivematica</Label>
              <Input
                value={usuarioArchivematica}
                onChange={(e) => setUsuarioArchivematica(e.target.value)}
                placeholder="fcja_sigad"
                disabled={!temPermissaoArquivista}
              />
            </div>

            <div className="space-y-2">
              <Label>
                API Key do Archivematica{" "}
                {config?.apiKeyConfigurada && (
                  <span className="text-emerald-600 font-normal">
                    (Configurada: {config.apiKeyMascarada})
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={apiKeyArchivematica}
                onChange={(e) => setApiKeyArchivematica(e.target.value)}
                placeholder={
                  config?.apiKeyConfigurada
                    ? "Deixe em branco para manter a chave atual"
                    : "Cole a API Key gerada no Archivematica..."
                }
                disabled={!temPermissaoArquivista}
              />
            </div>

            <div className="space-y-2">
              <Label>Location UUID do Storage Service (Opcional para API v2beta)</Label>
              <Input
                value={locationUuidTransfer}
                onChange={(e) => setLocationUuidTransfer(e.target.value)}
                placeholder="Ex: 74a88c5e-45b9-4731-8c1e-..."
                disabled={!temPermissaoArquivista}
              />
            </div>

            <div className="space-y-2">
              <Label>Processing Configuration (Workflow do Archivematica)</Label>
              <Input
                value={processingConfig}
                onChange={(e) => setProcessingConfig(e.target.value)}
                placeholder="automated"
                disabled={!temPermissaoArquivista}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                Caminho do Diretório Compartilhado (Watched Directory / Standard Transfer no Linux)
              </Label>
              <Input
                value={diretorioCompartilhado}
                onChange={(e) => setDiretorioCompartilhado(e.target.value)}
                placeholder="/var/archivematica/sharedDirectory/watchedDirectories/activeTransfers/standardTransfer"
                disabled={!temPermissaoArquivista}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 pt-1">
              <Checkbox
                checked={autoApprove}
                onCheckedChange={(v) => setAutoApprove(v === true)}
                disabled={!temPermissaoArquivista}
              />
              <span className="text-sm text-slate-700">
                Aprovar transferência automaticamente (<code>auto_approve = true</code>) ao enviar
                pacote SIP para o Archivematica
              </span>
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
                    salvarConfiguracao({
                      urlArchivematica,
                      usuarioArchivematica,
                      apiKeyArchivematica: apiKeyArchivematica || undefined,
                      locationUuidTransfer,
                      diretorioCompartilhado,
                      processingConfig,
                      autoApprove,
                      urlAtom,
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
    </div>
  );
}
