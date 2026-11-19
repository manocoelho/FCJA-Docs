import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Archive,
  Building2,
  CalendarClock,
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Hash,
  Layers,
  Lock,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterChips, type Chip } from "@/components/ged/FilterChips";
import { DocumentTable } from "@/components/ged/DocumentTable";
import { FiltroPastas } from "@/components/ged/FiltroPastas";
import {
  NUCLEOS,
  ANOS,
  SIGLA_POR_NUCLEO,
  STATUS_DOCUMENTO_OPCOES,
  NIVEIS_ACESSO_OPCOES,
  CLASSES_FIM_PADRAO,
  type Doc,
} from "@/components/ged/data";
import { TIPOLOGIAS_MEIO } from "@/components/ged/codigos";
import { SeletorHierarquico } from "@/components/ged/SeletorHierarquico";
import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth } from "@/lib/auth";
import { formatarTamanho } from "@/lib/formatters";
import {
  buscarClassesPcd,
  buscarDossies,
  type ClassePcdItem,
  type DossieItem,
} from "@/lib/pcd-dossie-api";
import type { DadosEdicaoDoc } from "@/hooks/useAcervoSigad";

const EXT_POR_SUFIXO: Record<string, "pdf" | "xlsx" | "docx" | "tiff"> = {
  pdf: "pdf",
  xlsx: "xlsx",
  xls: "xlsx",
  csv: "xlsx",
  docx: "docx",
  doc: "docx",
  tiff: "tiff",
  tif: "tiff",
};

const TAMANHO_MAX = 25 * 1024 * 1024;
const ANO_MIN = 2022;
const ANO_MAX = 2027;

type Filtros = {
  tipos: string[];
  anoDe: number;
  anoAte: number;
  nucleo: string;
  prefixoPasta: string;
};
const INICIAL: Filtros = {
  tipos: [],
  anoDe: ANO_MIN,
  anoAte: ANO_MAX,
  nucleo: "Todos",
  prefixoPasta: "",
};

type Pendente = {
  id: string;
  file: File;
  sel: boolean;
  data: string;
  tipoAtividade: string;
  codigo: string;
  descricao: string;
  descricaoContextual: string;
  tipo: string;
  nucleo: string;
  sigla: string;
  autor: string;
  statusDocumento: string;
  nivelAcesso: string;
  hipoteseLegal: string;
  dossieId: string | null;
  progresso: number;
  status: "aguardando" | "enviando" | "concluido";
  editado?: boolean;
  nomeCustomizado: string;
};

interface TelaUploadProps {
  acervo: Doc[];
  usuarioLogado?: string | null;
  usuarioPapel?: string | null;
  onDocsUploaded: (novosDocs: Doc[]) => void;
  onView: (doc: Doc) => void;
  onDownload: (doc: Doc) => void;
  onDelete: (doc: Doc, motivoEliminacao?: string, justificativa?: string) => Promise<void> | void;
  onDeleteMany: (docs: Doc[], motivoEliminacao?: string, justificativa?: string) => Promise<void> | void;
  onEdit: (doc: Doc, dados: DadosEdicaoDoc) => void;
  onVerifyFixity?: ((doc: Doc) => Promise<unknown>) | undefined;
  onAbrirEditor?: (() => void) | undefined;
}

export function TelaUpload({
  acervo,
  usuarioLogado,
  usuarioPapel,
  onDocsUploaded,
  onView,
  onDownload,
  onDelete,
  onDeleteMany,
  onEdit,
  onVerifyFixity,
  onAbrirEditor,
}: TelaUploadProps) {
  const [arrastando, setArrastando] = useState(false);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [cadData, setCadData] = useState(() => new Date().toISOString().slice(0, 10));
  const [cadNucleo, setCadNucleo] = useState<string>(NUCLEOS[1]!);
  const [cadTipoAtividade, setCadTipoAtividade] = useState<string>("Atividade-Meio");
  const [cadCodigo, setCadCodigo] = useState<string>("");
  const [cadDescricao, setCadDescricao] = useState<string>("");
  const [cadSigla, setCadSigla] = useState<string>(SIGLA_POR_NUCLEO[NUCLEOS[1]!] || "");
  const [cadTipo, setCadTipo] = useState<string>(TIPOLOGIAS_MEIO[0] || "");

  // Metadados Intelectuais, Diplomáticos, Contextuais e de Acesso
  const [cadDescricaoContextual, setCadDescricaoContextual] = useState<string>("");
  const [cadAutor, setCadAutor] = useState<string>(
    "Fundação Casa de José Américo (FCJA)"
  );
  const [cadStatusDoc, setCadStatusDoc] = useState<string>("ORIGINAL");
  const [cadNivelAcesso, setCadNivelAcesso] = useState<string>("OSTENSIVO");
  const [cadHipoteseLegal, setCadHipoteseLegal] = useState<string>("");
  const [cadDossieId, setCadDossieId] = useState<string | null>(null);

  // Classes de Atividade-Fim (PCD/TTD) e Dossiês Abertos
  const [classesFim, setClassesFim] = useState<
    ReadonlyArray<{
      codigo: string;
      titulo: string;
      destinacaoFinal: string;
      observacoesTtd?: string | undefined;
    }>
  >(CLASSES_FIM_PADRAO);
  const [dossiesAbertos, setDossiesAbertos] = useState<DossieItem[]>([]);

  // Busca rápida para a tabela de Gerenciamento do Acervo
  const [buscaAcervo, setBuscaAcervo] = useState("");

  useEffect(() => {
    buscarClassesPcd("Atividade-Fim")
      .then((lista: ClassePcdItem[]) => {
        if (lista && lista.length > 0) {
          setClassesFim(
            lista.map((c) => ({
              codigo: c.codigo,
              titulo: c.titulo,
              destinacaoFinal: c.destinacaoFinal,
              observacoesTtd: c.observacoesTtd,
            }))
          );
        }
      })
      .catch(() => {
        // Mantém CLASSES_FIM_PADRAO em caso de falha
      });

    buscarDossies()
      .then((lista: DossieItem[]) => {
        setDossiesAbertos(lista.filter((d) => d.statusDossie === "ABERTO"));
      })
      .catch(() => {
        setDossiesAbertos([]);
      });
  }, []);

  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [filtrosUpload, setFiltrosUpload] = useState<Filtros>(INICIAL);
  const [modalFiltrosUpload, setModalFiltrosUpload] = useState(false);

  const selecionados = pendentes.filter((p) => p.sel);
  const tamanhoTotalFila = useMemo(
    () => pendentes.reduce((acc, item) => acc + item.file.size, 0),
    [pendentes]
  );

  const anoCapturaSelecionado = useMemo(
    () => new Date(`${cadData}T12:00:00`).getFullYear(),
    [cadData]
  );

  const sufixoProtocoloPreview = useMemo(() => {
    const partes = (cadSigla || "FCJA").split("_").filter(Boolean);
    return partes[partes.length - 1] || "FCJA";
  }, [cadSigla]);

  function alterarTipoAtividade(v: string) {
    setCadTipoAtividade(v);
    if (v === "Atividade-Fim" && classesFim.length > 0) {
      const primeira = classesFim[0]!;
      setCadCodigo(primeira.codigo);
      setCadDescricao(primeira.titulo);
      setPendentes((prev) =>
        prev.map((p) =>
          p.sel
            ? {
                ...p,
                tipoAtividade: v,
                codigo: primeira.codigo,
                descricao: primeira.titulo,
              }
            : p
        )
      );
    } else {
      setCadCodigo("");
      setCadDescricao("");
      setPendentes((prev) =>
        prev.map((p) =>
          p.sel ? { ...p, tipoAtividade: v, codigo: "", descricao: "" } : p
        )
      );
    }
  }

  function receberArquivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const novosErros: string[] = [];
    const aceitos: Pendente[] = [];

    for (const file of Array.from(lista)) {
      const sufixo = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!EXT_POR_SUFIXO[sufixo]) {
        novosErros.push(`${file.name}: formato não aceito (use PDF, DOCX, XLSX, CSV ou TIFF).`);
        continue;
      }
      if (file.size > TAMANHO_MAX) {
        novosErros.push(`${file.name}: ${formatarTamanho(file.size)} excede o limite de 25 MB.`);
        continue;
      }
      if (file.size === 0) {
        novosErros.push(`${file.name}: arquivo vazio.`);
        continue;
      }
      if (pendentes.some((p) => p.file.name === file.name && p.file.size === file.size)) {
        novosErros.push(`${file.name}: já está na fila de captura.`);
        continue;
      }

      aceitos.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        nomeCustomizado: file.name,
        sel: true,
        data: cadData,
        tipoAtividade: cadTipoAtividade,
        codigo: cadCodigo,
        descricao: cadDescricao,
        descricaoContextual: cadDescricaoContextual,
        tipo: cadTipo,
        nucleo: cadNucleo,
        sigla: cadSigla,
        autor: cadAutor,
        statusDocumento: cadStatusDoc,
        nivelAcesso: cadNivelAcesso,
        hipoteseLegal: cadHipoteseLegal,
        dossieId: cadDossieId,
        progresso: 0,
        status: "aguardando",
      });
    }

    setErros(novosErros);
    if (novosErros.length > 0)
      toast.error(`${novosErros.length} arquivo(s) recusado(s)`, { description: novosErros[0] });
    if (aceitos.length > 0) {
      setPendentes((prev) => [...prev, ...aceitos]);
      toast.success(`${aceitos.length} arquivo(s) adicionado(s) à fila de captura`, {
        description: "Revise os metadados abaixo e clique em Capturar no SIGAD.",
      });
    }
  }

  function aplicarEmLote() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
      toast.error("Marque ao menos um arquivo na fila.");
      return;
    }
    setPendentes((prev) =>
      prev.map((p) =>
        p.sel
          ? {
              ...p,
              data: cadData,
              tipoAtividade: cadTipoAtividade,
              codigo: cadCodigo,
              descricao: cadDescricao,
              descricaoContextual: cadDescricaoContextual,
              tipo: cadTipo,
              nucleo: cadNucleo,
              sigla: cadSigla,
              autor: cadAutor,
              statusDocumento: cadStatusDoc,
              nivelAcesso: cadNivelAcesso,
              hipoteseLegal: cadHipoteseLegal,
              dossieId: cadDossieId,
              editado: true,
            }
          : p
      )
    );
    toast.success(`Metadados sincronizados em ${alvos.length} arquivo(s) marcado(s)!`);
  }

  async function cadastrarPendentes() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
      toast.error("Marque ao menos um arquivo para capturar.");
      return;
    }

    setEnviando(true);
    const novos: Doc[] = [];

    for (const p of alvos) {
      setPendentes((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: "enviando", progresso: 50 } : x))
      );

      const ano = new Date(`${p.data}T12:00:00`).getFullYear();
      const sufixo = p.file.name.split(".").pop()?.toLowerCase() ?? "";
      const ext = EXT_POR_SUFIXO[sufixo] ?? "pdf";
      const categoria = p.tipo || "Relatório";

      const formData = new FormData();
      formData.append("file", p.file);
      formData.append("nome", p.nomeCustomizado);
      formData.append("ext", ext);
      formData.append("tipo_atividade", p.tipoAtividade);
      formData.append("codigo_classificacao", p.codigo);
      formData.append("descricao_codigo", p.descricao);
      formData.append("descricao", p.descricaoContextual || "");
      formData.append("categoria", categoria);
      formData.append("ano", String(ano));
      formData.append("nucleo", p.nucleo);
      formData.append("sigla", p.sigla);
      formData.append("autor", p.autor || "Fundação Casa de José Américo (FCJA)");
      formData.append("status_documento", p.statusDocumento || "ORIGINAL");
      formData.append("nivel_acesso", p.nivelAcesso || "OSTENSIVO");
      formData.append("hipotese_legal", p.hipoteseLegal || "");
      if (p.dossieId !== null && p.dossieId !== undefined) {
        formData.append("dossie_id", String(p.dossieId));
      }
      formData.append("usuario_responsavel", usuarioLogado || "sistema");
      formData.append("papel_usuario", usuarioPapel || "");

      try {
        const res = await fetch(`${API_BASE_URL}/api/upload`, {
          method: "POST",
          headers: obterHeadersAuth(),
          body: formData,
        });
        if (!res.ok) throw new Error("Erro na rede");
        const resp = await res.json();

        novos.push({
          id: resp.id,
          numeroProtocolo: resp.numeroProtocolo,
          tipoAtividade: p.tipoAtividade,
          codigoClassificacao: p.codigo,
          descricaoCodigo: p.descricao,
          descricao: resp.descricao ?? p.descricaoContextual,
          nome: p.nomeCustomizado,
          ext: ext as Doc["ext"],
          categoria,
          ano,
          nucleo: p.nucleo,
          sigla: p.sigla,
          upload: resp.upload,
          hora: resp.hora,
          url: resp.url,
          tamanho: resp.tamanho,
          hashSha256: resp.hashSha256,
          formatoMime: resp.formatoMime,
          genero: resp.genero,
          autor: resp.autor,
          statusDocumento: resp.statusDocumento,
          meio: resp.meio,
          faseArquivistica: resp.faseArquivistica,
          nivelAcesso: resp.nivelAcesso,
          hipoteseLegal: resp.hipoteseLegal,
          fixidadeVerificada: resp.fixidadeVerificada,
          ultimaVerificacaoFixidade: resp.ultimaVerificacaoFixidade,
          usuarioCaptura: usuarioLogado || "sistema",
          dossieId: resp.dossieId ?? null,
          codigoDossie: resp.codigoDossie || "",
          prazoCorrenteAnos: resp.prazoCorrenteAnos,
          prazoIntermediariaAnos: resp.prazoIntermediariaAnos,
          anoDestinacaoFinal: resp.anoDestinacaoFinal,
          destinacaoPrevista: resp.destinacaoPrevista,
        });
        setPendentes((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, status: "concluido", progresso: 100 } : x))
        );
      } catch {
        toast.error(`Falha ao enviar: ${p.file.name}`);
      }
    }

    onDocsUploaded(novos);

    const anos = novos.map((n) => n.ano);
    if (anos.length > 0) {
      setFiltrosUpload((f) => ({
        ...f,
        tipos: [],
        anoDe: Math.min(ANO_MIN, ...anos, f.anoDe),
        anoAte: Math.max(ANO_MAX, ...anos, f.anoAte),
        nucleo: "Todos",
      }));
    }

    const restantes = pendentes.filter((p) => !p.sel);
    setPendentes(restantes);
    setErros([]);
    setEnviando(false);

    if (novos.length > 0) {
      toast.success(`${novos.length} documento(s) capturado(s) no SIGAD!`, {
        description: `Protocolo e Fixidade SHA-256 gerados (${novos[0]?.numeroProtocolo || ""}).`,
      });
    }
  }

  const documentosUpload = useMemo(
    () =>
      acervo.filter((d) => {
        const tipoOk = filtrosUpload.tipos.length === 0 || filtrosUpload.tipos.includes(d.categoria);
        const anoOk = d.ano >= filtrosUpload.anoDe && d.ano <= filtrosUpload.anoAte;
        const nucleoOk = filtrosUpload.nucleo === "Todos" || d.nucleo === filtrosUpload.nucleo;
        const pastaOk =
          !filtrosUpload.prefixoPasta ||
          d.codigoClassificacao?.startsWith(filtrosUpload.prefixoPasta);

        if (!tipoOk || !anoOk || !nucleoOk || !pastaOk) return false;

        if (!buscaAcervo.trim()) return true;
        const q = buscaAcervo.toLowerCase();
        return (
          d.nome.toLowerCase().includes(q) ||
          (d.numeroProtocolo || "").toLowerCase().includes(q) ||
          (d.codigoClassificacao || "").toLowerCase().includes(q) ||
          (d.descricaoCodigo || "").toLowerCase().includes(q) ||
          (d.descricao || "").toLowerCase().includes(q) ||
          (d.nucleo || "").toLowerCase().includes(q) ||
          (d.autor || "").toLowerCase().includes(q) ||
          (d.hashSha256 || "").toLowerCase().includes(q)
        );
      }),
    [filtrosUpload, acervo, buscaAcervo]
  );

  const chipsUpload: Chip[] = [
    ...filtrosUpload.tipos.map((t) => ({
      id: `tipo-${t}`,
      label: `Tipo: ${t}`,
      onRemove: () =>
        setFiltrosUpload((f) => ({ ...f, tipos: f.tipos.filter((x) => x !== t) })),
    })),
    ...(filtrosUpload.anoDe !== ANO_MIN || filtrosUpload.anoAte !== ANO_MAX
      ? [
          {
            id: "periodo",
            label:
              filtrosUpload.anoDe === filtrosUpload.anoAte
                ? `Ano: ${filtrosUpload.anoDe}`
                : `Período: ${filtrosUpload.anoDe}–${filtrosUpload.anoAte}`,
            onRemove: () =>
              setFiltrosUpload((f) => ({ ...f, anoDe: ANO_MIN, anoAte: ANO_MAX })),
          },
        ]
      : []),
    ...(filtrosUpload.nucleo !== "Todos"
      ? [
          {
            id: "nucleo",
            label: `Núcleo: ${filtrosUpload.nucleo}`,
            onRemove: () => setFiltrosUpload((f) => ({ ...f, nucleo: "Todos" })),
          },
        ]
      : []),
    ...(filtrosUpload.prefixoPasta
      ? [
          {
            id: "pasta",
            label: `Pasta: ${filtrosUpload.prefixoPasta}`,
            onRemove: () => setFiltrosUpload((f) => ({ ...f, prefixoPasta: "" })),
          },
        ]
      : []),
  ];

  function renderBadgeFormatoArquivo(nomeArquivo: string) {
    const ext = nomeArquivo.split(".").pop()?.toLowerCase() || "pdf";
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-800">
          <FileSpreadsheet className="h-3 w-3" /> {ext}
        </span>
      );
    }
    if (ext === "docx" || ext === "doc") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-blue-800">
          <FileText className="h-3 w-3" /> {ext}
        </span>
      );
    }
    if (ext === "tif" || ext === "tiff") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-purple-800">
          <Archive className="h-3 w-3" /> {ext}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-red-800">
        <FileText className="h-3 w-3" /> {ext}
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Input oculto global de arquivos */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.tif,.tiff"
        onChange={(e) => {
          receberArquivos(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Cabeçalho Principal */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Captura Arquivística · Fixidade SHA-256 · Compatível com SIP Archivematica
            </span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            Estação de Captura & Indexação Arquivística
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Deposite documentos digitais com atribuição automática de Número Único de Protocolo
            (NUP), classificação no PCD/TTD, vínculo a Dossiês e geração de hash SHA-256 (PREMIS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAbrirEditor && (
            <Button
              variant="outline"
              onClick={onAbrirEditor}
              className="gap-2 border-blue-300 bg-blue-50/70 text-blue-800 hover:bg-blue-100"
            >
              <PencilLine className="h-4 w-4 text-blue-600" />
              Criar Documento no Editor
            </Button>
          )}
          <Button
            variant="brand"
            onClick={() => inputRef.current?.click()}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Selecionar Arquivos no PC
          </Button>
        </div>
      </header>

      {/* Strip de Indicadores Rápidos da Estação de Captura */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Fila de Captura Atual
            </span>
            <CloudUpload className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">
            {pendentes.length} <span className="text-sm font-normal text-slate-500">arq.</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {selecionados.length} marcado(s) · {formatarTamanho(tamanhoTotalFila)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Padrão de Protocolo NUP
            </span>
            <Hash className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-1.5 font-mono text-base font-bold text-purple-700 truncate">
            FCJA.{sufixoProtocoloPreview}.{anoCapturaSelecionado}.XXXX
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Sequencial único + Hash SHA-256
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Regime TTD Selecionado
            </span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-sm font-bold text-emerald-800 truncate">
            {cadTipoAtividade === "Atividade-Fim"
              ? "Guarda Permanente (RDC-Arq)"
              : "Tabela de Temporalidade (Meio)"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {cadCodigo
              ? `Classe ativa: ${cadCodigo}`
              : "Selecione a classe PCD abaixo"}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total no Acervo SIGAD
            </span>
            <Layers className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{acervo.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {dossiesAbertos.length} dossiê(s) aberto(s) para juntada
          </p>
        </div>
      </div>

      {/* Área de Depósito (Compacta quando já há arquivos na fila, Expandida quando vazia) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          receberArquivos(e.dataTransfer.files);
        }}
        className={`transition-all ${
          pendentes.length === 0
            ? `flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center ${
                arrastando
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-slate-300 bg-white hover:border-blue-400"
              }`
            : `flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed px-6 py-4 ${
                arrastando
                  ? "border-primary bg-primary/5"
                  : "border-blue-200 bg-blue-50/40"
              }`
        }`}
      >
        {pendentes.length === 0 ? (
          <>
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-600/10 text-blue-600 shadow-inner">
              <CloudUpload className="h-8 w-8" />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900">
                Arraste e solte os documentos digitais aqui para iniciar a captura
              </p>
              <p className="text-sm text-muted-foreground">
                Você pode depositar um único documento ou um lote inteiro de arquivos de uma só vez.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {[
                { ext: "PDF / PDF-A", desc: "Textos e Dossiês" },
                { ext: "XLSX / CSV", desc: "Planilhas Multi-Abas" },
                { ext: "DOCX / DOC", desc: "Documentos Word" },
                { ext: "TIFF / TIF", desc: "Matrizes de Imagem" },
              ].map((f) => (
                <span
                  key={f.ext}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  <strong className="text-blue-700">{f.ext}</strong> · {f.desc}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Até 25 MB por arquivo
              </span>
            </div>
            <Button
              size="lg"
              variant="brand"
              onClick={() => inputRef.current?.click()}
              className="mt-2 gap-2"
            >
              <CloudUpload className="h-4 w-4" />
              Escolher Arquivos no Computador
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                <CloudUpload className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Zona de Depósito Ativa — Arraste mais arquivos para adicionar ao lote
                </p>
                <p className="text-xs text-slate-600">
                  Formatos homologados pelo FPR (Archivematica): PDF, DOCX, XLSX, CSV e TIFF (máx. 25 MB).
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="gap-1.5 bg-white"
            >
              <Plus className="h-4 w-4 text-blue-600" />
              Adicionar Mais Arquivos
            </Button>
          </>
        )}
      </div>

      {/* Alertas de Erro de Validação de Arquivo */}
      {erros.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
          {erros.map((e) => (
            <p key={e} className="flex items-center gap-2 text-sm text-red-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" /> {e}
            </p>
          ))}
        </div>
      )}

      {/* ESTAÇÃO DE TRABALHO QUANDO HÁ ARQUIVOS NA FILA */}
      {pendentes.length > 0 && (
        <div className="space-y-6">
          {/* PASSO 1: FILA DE COMPONENTES DIGITAIS */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Fila de Componentes Digitais Prontos para Captura
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Você pode editar o título de cada documento diretamente na linha ou marcar os itens que receberão os metadados abaixo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 transition-colors">
                  <Checkbox
                    checked={pendentes.length > 0 && pendentes.every((p) => p.sel)}
                    onCheckedChange={(v) =>
                      setPendentes((prev) => prev.map((p) => ({ ...p, sel: v === true })))
                    }
                    disabled={enviando}
                  />
                  Selecionar todos ({selecionados.length}/{pendentes.length} marcados)
                </label>
              </div>
            </div>

            <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {pendentes.map((p) => {
                const anoItem = new Date(`${p.data}T12:00:00`).getFullYear();
                const dossieVinculado =
                  p.dossieId !== null
                    ? dossiesAbertos.find((d) => String(d.id) === String(p.dossieId))
                    : undefined;
                return (
                  <li
                    key={p.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      p.sel
                        ? "border-blue-300 bg-blue-50/40 shadow-xs"
                        : p.editado
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Checkbox
                        checked={p.sel}
                        onCheckedChange={() =>
                          setPendentes((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, sel: !x.sel } : x))
                          )
                        }
                        disabled={enviando}
                      />

                      {renderBadgeFormatoArquivo(p.file.name)}

                      <div className="relative flex-1 min-w-[220px] flex items-center">
                        <PencilLine className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          value={p.nomeCustomizado}
                          onChange={(e) =>
                            setPendentes((prev) =>
                              prev.map((x) =>
                                x.id === p.id ? { ...x, nomeCustomizado: e.target.value } : x
                              )
                            )
                          }
                          disabled={enviando}
                          className="h-8 pl-8 pr-2 bg-white/90 border-slate-200 hover:border-blue-300 focus-visible:bg-white font-medium text-sm"
                          title="Clique para editar o título/nome do documento"
                        />
                      </div>

                      <span className="rounded-md bg-white border px-2 py-1 font-mono text-xs font-medium text-slate-600 whitespace-nowrap">
                        {formatarTamanho(p.file.size)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setPendentes((prev) => prev.filter((x) => x.id !== p.id))
                        }
                        disabled={enviando}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remover arquivo da fila"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Resumo de Metadados Atribuídos ao Item */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7 text-[11px]">
                      <span
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          p.tipoAtividade === "Atividade-Fim"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-200/80 text-slate-700"
                        }`}
                      >
                        {p.tipoAtividade}
                      </span>

                      <span className="rounded-md bg-blue-100/80 px-2 py-0.5 font-mono font-semibold text-blue-800">
                        Classe: {p.codigo || "Não definida"}
                      </span>

                      <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                        Tipologia: <strong>{p.tipo}</strong>
                      </span>

                      <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                        Ano: <strong>{anoItem}</strong>
                      </span>

                      <span
                        className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700 truncate max-w-[260px]"
                        title={p.nucleo}
                      >
                        {p.nucleo}
                      </span>

                      <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                        {p.statusDocumento}
                      </span>

                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                          p.nivelAcesso === "OSTENSIVO"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.nivelAcesso}
                      </span>

                      {dossieVinculado && (
                        <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-700">
                          Dossiê: {dossieVinculado.codigoDossie}
                        </span>
                      )}
                    </div>

                    {/* Campo Individual de Descrição Contextual do Item na Fila */}
                    <div className="mt-2.5 pl-7">
                      <Input
                        value={p.descricaoContextual}
                        onChange={(e) =>
                          setPendentes((prev) =>
                            prev.map((x) =>
                              x.id === p.id
                                ? { ...x, descricaoContextual: e.target.value }
                                : x
                            )
                          )
                        }
                        disabled={enviando}
                        placeholder="Descrição / Contexto deste documento (ex: contexto da fotografia, pessoas, local, evento ou resumo para interpretação futura)..."
                        className="h-8 bg-white/90 border-slate-200 text-xs text-slate-700 hover:border-blue-300 focus-visible:bg-white"
                      />
                    </div>

                    {p.status !== "aguardando" && (
                      <div className="mt-3 flex items-center gap-3 pl-7">
                        <Progress value={p.progresso} className="h-2 flex-1" />
                        <span className="text-xs font-semibold text-blue-700">
                          {p.status === "concluido" ? "Capturado com sucesso!" : `${p.progresso}%`}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* PASSO 2 & 3: METADADOS DE CAPTURA EM LOTE E CLASSIFICAÇÃO PCD */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Metadados de Captura em Lote (Proveniência, Acesso e Classificação PCD)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Estes metadados são aplicados em tempo real aos{" "}
                    <strong>{selecionados.length} documento(s) marcado(s)</strong> e serão
                    exportados automaticamente em <code>metadata.csv</code> e{" "}
                    <code>rights.csv</code> para o Archivematica.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-800">
                Editando {selecionados.length} de {pendentes.length} arquivo(s)
              </span>
            </div>

            {/* SEÇÃO A: PROVENIÊNCIA, CRONOLOGIA E IDENTIFICAÇÃO NOBRADE */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                A. Cronologia de Captura & Proveniência Orgânica (NOBRADE)
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Data e Hora de Captura</Label>
                  <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-1 shadow-xs gap-2">
                    <input
                      type="date"
                      value={cadData}
                      onChange={(e) => {
                        setCadData(e.target.value);
                        setPendentes((prev) =>
                          prev.map((p) => (p.sel ? { ...p, data: e.target.value } : p))
                        );
                      }}
                      className="bg-transparent border-0 outline-none text-sm cursor-pointer w-full"
                    />
                    <span className="text-xs text-slate-500 select-none font-mono border-l border-input pl-2 shrink-0">
                      {new Date().toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Ano</Label>
                  <Select
                    value={String(anoCapturaSelecionado)}
                    onValueChange={(v) => {
                      const nova = `${v}${cadData.slice(4)}`;
                      setCadData(nova);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, data: nova } : p))
                      );
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANOS.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-4 min-w-0">
                  <Label>Núcleo Produtor</Label>
                  <Select
                    value={cadNucleo}
                    onValueChange={(v) => {
                      setCadNucleo(v);
                      const novaSigla = SIGLA_POR_NUCLEO[v] || "";
                      setCadSigla(novaSigla);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, nucleo: v, sigla: novaSigla } : p))
                      );
                    }}
                  >
                    <SelectTrigger className="bg-white [&>span]:truncate" title={cadNucleo}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 w-[min(44rem,95vw)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto p-2">
                      {NUCLEOS.filter((n) => n !== "Todos").map((n) => (
                        <SelectItem
                          key={n}
                          value={n}
                          className="items-start whitespace-normal py-2.5 px-3"
                        >
                          <span className="block leading-snug">{n}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label>Sigla NOBRADE</Label>
                  <Input
                    list="siglas-list"
                    value={cadSigla}
                    onChange={(e) => {
                      setCadSigla(e.target.value);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, sigla: e.target.value } : p))
                      );
                    }}
                    placeholder="Ex: BR_PB_FCJA..."
                    className="bg-white font-mono text-xs"
                  />
                  <datalist id="siglas-list">
                    {Object.values(SIGLA_POR_NUCLEO).map((sigla) => (
                      <option key={sigla} value={sigla} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* SEÇÃO B: CONTEXTO DIPLOMÁTICO, AUTORIA, ACESSO (LAI/LGPD) E DOSSIÊ */}
            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                B. Autoria, Status Diplomático, Direitos de Acesso (LAI/LGPD) & Juntada em Dossiê
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Autor / Entidade Produtora</Label>
                  <Input
                    value={cadAutor}
                    onChange={(e) => {
                      setCadAutor(e.target.value);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, autor: e.target.value } : p))
                      );
                    }}
                    placeholder="Fundação Casa de José Américo (FCJA)"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label>Status do Documento</Label>
                  <Select
                    value={cadStatusDoc}
                    onValueChange={(v) => {
                      setCadStatusDoc(v);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, statusDocumento: v } : p))
                      );
                    }}
                  >
                    <SelectTrigger className="bg-white [&>span]:truncate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_DOCUMENTO_OPCOES.map((op) => (
                        <SelectItem key={op.valor} value={op.valor}>
                          {op.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    Nível de Acesso (LAI / LGPD)
                  </Label>
                  <Select
                    value={cadNivelAcesso}
                    onValueChange={(v) => {
                      setCadNivelAcesso(v);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, nivelAcesso: v } : p))
                      );
                    }}
                  >
                    <SelectTrigger className="bg-white [&>span]:truncate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEIS_ACESSO_OPCOES.map((op) => (
                        <SelectItem key={op.valor} value={op.valor}>
                          {op.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-3 min-w-0">
                  <Label className="flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                    Dossiê / Processo (Unidade de Arquivamento)
                  </Label>
                  <Select
                    value={cadDossieId !== null ? String(cadDossieId) : "AVULSO"}
                    onValueChange={(v) => {
                      const novoId = v === "AVULSO" ? null : v;
                      setCadDossieId(novoId);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, dossieId: novoId } : p))
                      );
                    }}
                  >
                    <SelectTrigger className="bg-white [&>span]:truncate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 w-[min(36rem,95vw)]">
                      <SelectItem value="AVULSO">
                        Documento Avulso (Sem juntada imediata a Dossiê)
                      </SelectItem>
                      {dossiesAbertos.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.codigoDossie} — {d.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {cadNivelAcesso !== "OSTENSIVO" && (
                  <div className="space-y-1.5 md:col-span-12 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                    <Label className="text-amber-900 font-semibold">
                      Hipótese Legal de Restrição (Obrigatória para <code>rights.csv</code> no Archivematica — LAI / LGPD)
                    </Label>
                    <Input
                      value={cadHipoteseLegal}
                      onChange={(e) => {
                        setCadHipoteseLegal(e.target.value);
                        setPendentes((prev) =>
                          prev.map((p) => (p.sel ? { ...p, hipoteseLegal: e.target.value } : p))
                        );
                      }}
                      placeholder="Ex: Art. 31 da Lei Federal nº 12.527/2011 (LAI) — Informações Pessoais / LGPD"
                      className="bg-white border-amber-300"
                    />
                  </div>
                )}

                {/* Campo de Descrição Contextual / Âmbito e Conteúdo (Preservação OAIS / NOBRADE / Archivematica & AtoM) */}
                <div className="space-y-1.5 md:col-span-12">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="cad-descricao-contextual" className="font-semibold text-slate-800">
                      Descrição / Contexto do Documento (Âmbito e Conteúdo — Preservação Digital)
                    </Label>
                    <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">
                      Exportado como <code>dc.description</code> no Archivematica e AtoM
                    </span>
                  </div>
                  <Textarea
                    id="cad-descricao-contextual"
                    rows={3}
                    value={cadDescricaoContextual}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCadDescricaoContextual(val);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, descricaoContextual: val } : p))
                      );
                    }}
                    placeholder="Registre informações detalhadas sobre o documento (ex: contexto histórico de uma fotografia, pessoas identificadas, local, evento, assunto ou observações técnicas) para garantir que a informação possa ser compreendida e interpretada no futuro..."
                    className="bg-white resize-y text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO C: CLASSIFICAÇÃO ARQUIVÍSTICA (PCD) E TABELA DE TEMPORALIDADE (TTD) */}
            <div className="space-y-4 border-t pt-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    C. Classificação Arquivística (PCD) & Natureza da Atividade
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escolha a natureza da atividade (Meio ou Fim) e defina a classe documental e a tipologia.
                  </p>
                </div>

                {/* Seletor de Atividade (Botões rápidos + Select compatível) */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-xl border bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => alterarTipoAtividade("Atividade-Meio")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        cadTipoAtividade === "Atividade-Meio"
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Atividade-Meio (Administrativa)
                    </button>
                    <button
                      type="button"
                      onClick={() => alterarTipoAtividade("Atividade-Fim")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        cadTipoAtividade === "Atividade-Fim"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Atividade-Fim (Guarda Permanente FCJA)
                    </button>
                  </div>

                  <div className="w-44">
                    <Select value={cadTipoAtividade} onValueChange={alterarTipoAtividade}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Atividade-Meio">Atividade-Meio</SelectItem>
                        <SelectItem value="Atividade-Fim">Atividade-Fim (FCJA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {cadTipoAtividade === "Atividade-Meio" ? (
                <SeletorHierarquico
                  onSelecionar={(codigo, descricao) => {
                    setCadCodigo(codigo);
                    setCadDescricao(descricao);

                    let sugestao: string = cadTipo;
                    if (descricao) {
                      const descNormal = descricao
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                      const matches = TIPOLOGIAS_MEIO.filter((t) =>
                        descNormal.includes(
                          t
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                        )
                      );

                      const melhorMatch = matches.sort((a, b) => b.length - a.length)[0];
                      if (melhorMatch) {
                        sugestao = melhorMatch;
                        setCadTipo(melhorMatch);
                      }
                    }

                    setPendentes((prev) =>
                      prev.map((p) =>
                        p.sel ? { ...p, codigo, descricao, tipo: sugestao } : p
                      )
                    );
                  }}
                >
                  <div className="space-y-1.5 w-full">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        5
                      </span>
                      Tipologia / Espécie Documental
                    </Label>
                    <Select
                      value={cadTipo}
                      onValueChange={(v) => {
                        setCadTipo(v);
                        setPendentes((prev) =>
                          prev.map((p) => (p.sel ? { ...p, tipo: v } : p))
                        );
                      }}
                    >
                      <SelectTrigger className="[&>span]:truncate bg-white" title={cadTipo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 w-[min(30rem,95vw)] overflow-y-auto p-2">
                        {TIPOLOGIAS_MEIO.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            className="items-start whitespace-normal py-2 px-3 text-xs"
                          >
                            <span className="block leading-snug">{t}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </SeletorHierarquico>
              ) : (
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gradient-to-b from-purple-50/60 to-slate-50/60 rounded-2xl border border-purple-200 shadow-xs">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-purple-800">
                      Classe de Atividade-Fim da FCJA (PCD / TTD — Guarda Permanente)
                    </Label>
                    <Select
                      value={cadCodigo || classesFim[0]?.codigo || "FIM.100.01"}
                      onValueChange={(cod) => {
                        const cl = classesFim.find((c) => c.codigo === cod);
                        const desc = cl?.titulo || "";
                        setCadCodigo(cod);
                        setCadDescricao(desc);
                        setPendentes((prev) =>
                          prev.map((p) =>
                            p.sel ? { ...p, codigo: cod, descricao: desc } : p
                          )
                        );
                      }}
                    >
                      <SelectTrigger className="[&>span]:truncate bg-white">
                        <SelectValue placeholder="Selecione a classe finalística da FCJA..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 w-[min(42rem,95vw)] overflow-y-auto p-2">
                        {classesFim.map((c) => (
                          <SelectItem
                            key={c.codigo}
                            value={c.codigo}
                            className="items-start whitespace-normal py-2.5 px-3"
                          >
                            <span className="block font-mono text-xs font-bold text-purple-700">
                              {c.codigo} — {c.titulo}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              Destinação TTD: {c.destinacaoFinal} (
                              {c.observacoesTtd || "Guarda Permanente — RDC-Arq / Archivematica"})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-purple-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      Regra TTD Atividade-Fim FCJA: <strong>Guarda Permanente Automática</strong>{" "}
                      (Apto para recolhimento SIP ao Archivematica).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-purple-800">
                      Tipologia Finalística
                    </Label>
                    <Select
                      value={cadTipo}
                      onValueChange={(v) => {
                        setCadTipo(v);
                        setPendentes((prev) =>
                          prev.map((p) => (p.sel ? { ...p, tipo: v } : p))
                        );
                      }}
                    >
                      <SelectTrigger className="[&>span]:truncate bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 w-[min(30rem,95vw)] overflow-y-auto p-2">
                        {TIPOLOGIAS_MEIO.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            className="items-start whitespace-normal py-2.5 px-3"
                          >
                            <span className="block leading-snug">{t}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* BARRA DE AÇÃO FINAL DE CAPTURA */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={aplicarEmLote}
                  disabled={enviando || selecionados.length === 0}
                  className="bg-white gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Aplicar aos {selecionados.length} marcados
                </Button>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Sincroniza os campos acima com os arquivos marcados mantendo-os prontos para captura.
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPendentes([]);
                    setErros([]);
                  }}
                  disabled={enviando}
                  className="text-slate-600 hover:text-red-600"
                >
                  Limpar Fila
                </Button>
                <Button
                  size="lg"
                  variant="brand"
                  onClick={cadastrarPendentes}
                  disabled={enviando || selecionados.length === 0}
                  className="gap-2 shadow-sm"
                >
                  <CloudUpload className="h-4 w-4" />
                  {enviando
                    ? "Calculando SHA-256 e Capturando…"
                    : `Capturar ${selecionados.length} no SIGAD`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABELA DE GERENCIAMENTO DO ACERVO SIGAD */}
      <div className="pt-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Gerenciamento do Acervo Capturado ({documentosUpload.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Inspecione a Ficha Diplomática do Documento, verifique a fixidade SHA-256 (PREMIS) ou
              edite metadados arquivísticos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={buscaAcervo}
                onChange={(e) => setBuscaAcervo(e.target.value)}
                placeholder="Buscar por protocolo, título, classe..."
                className="h-9 bg-white pl-8 pr-7 text-xs"
              />
              {buscaAcervo && (
                <button
                  type="button"
                  onClick={() => setBuscaAcervo("")}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setModalFiltrosUpload(true)}
              className="gap-2 bg-white"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtrar Tabela
            </Button>
          </div>
        </div>

        <FilterChips chips={chipsUpload} onLimpar={() => setFiltrosUpload(INICIAL)} />

        <DocumentTable
          docs={documentosUpload}
          usuarioPapel={usuarioPapel}
          onView={onView}
          onDownload={onDownload}
          onDelete={onDelete}
          onDeleteMany={onDeleteMany}
          onEdit={onEdit}
          onVerifyFixity={onVerifyFixity}
        />
      </div>

      {/* Modal de Filtros Avançados da Tabela */}
      <Dialog open={modalFiltrosUpload} onOpenChange={setModalFiltrosUpload}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtros da Tabela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FiltroPastas
              onFiltroChange={(prefixo: string) =>
                setFiltrosUpload((f) => ({ ...f, prefixoPasta: prefixo }))
              }
            />

            <div className="space-y-2 grid min-w-0">
              <Label>Tipologias</Label>
              <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-slate-50/50 p-3 space-y-3">
                {TIPOLOGIAS_MEIO.map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-primary"
                  >
                    <Checkbox
                      checked={filtrosUpload.tipos.includes(t)}
                      onCheckedChange={(checked) => {
                        setFiltrosUpload((f) => ({
                          ...f,
                          tipos: checked
                            ? [...f.tipos, t]
                            : f.tipos.filter((x) => x !== t),
                        }));
                      }}
                    />
                    <span className="truncate">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 grid min-w-0">
              <Label>Núcleo de Pesquisa</Label>
              <Select
                value={filtrosUpload.nucleo}
                onValueChange={(v) => setFiltrosUpload((f) => ({ ...f, nucleo: v }))}
              >
                <SelectTrigger className="w-full max-w-full overflow-hidden [&>span]:truncate [&>span]:min-w-0 text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,30rem)]">
                  {NUCLEOS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano Inicial</Label>
                <Select
                  value={String(filtrosUpload.anoDe)}
                  onValueChange={(v) =>
                    setFiltrosUpload((f) => ({
                      ...f,
                      anoDe: Number(v),
                      anoAte: Math.max(Number(v), f.anoAte),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano Final</Label>
                <Select
                  value={String(filtrosUpload.anoAte)}
                  onValueChange={(v) =>
                    setFiltrosUpload((f) => ({
                      ...f,
                      anoAte: Number(v),
                      anoDe: Math.min(Number(v), f.anoDe),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={() => setModalFiltrosUpload(false)}>
            Aplicar e Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
