import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CloudUpload,
  Trash2,
  SlidersHorizontal,
  ShieldCheck,
  FolderKanban,
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
  tipo: string;
  nucleo: string;
  sigla: string;
  autor: string;
  statusDocumento: string;
  nivelAcesso: string;
  hipoteseLegal: string;
  dossieId: number | null;
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

  // Novos metadados de Captura Arquivística e-ARQ Brasil v2
  const [cadAutor, setCadAutor] = useState<string>(
    "Fundação Casa de José Américo (FCJA)"
  );
  const [cadStatusDoc, setCadStatusDoc] = useState<string>("ORIGINAL");
  const [cadNivelAcesso, setCadNivelAcesso] = useState<string>("OSTENSIVO");
  const [cadHipoteseLegal, setCadHipoteseLegal] = useState<string>("");
  const [cadDossieId, setCadDossieId] = useState<number | null>(null);

  // Fase 3: Classes de Atividade-Fim (PCD/TTD) e Dossiês Abertos
  const [classesFim, setClassesFim] = useState<
    ReadonlyArray<{
      codigo: string;
      titulo: string;
      destinacaoFinal: string;
      observacoesTtd?: string | undefined;
    }>
  >(CLASSES_FIM_PADRAO);
  const [dossiesAbertos, setDossiesAbertos] = useState<DossieItem[]>([]);

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

  function receberArquivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const novosErros: string[] = [];
    const aceitos: Pendente[] = [];

    for (const file of Array.from(lista)) {
      const sufixo = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!EXT_POR_SUFIXO[sufixo]) {
        novosErros.push(`${file.name}: formato não aceito (use PDF, DOCX, XLSX ou TIFF).`);
        continue;
      }
      if (file.size > TAMANHO_MAX) {
        novosErros.push(`${file.name}: ${formatarTamanho(file.size)} excede o limite.`);
        continue;
      }
      if (file.size === 0) {
        novosErros.push(`${file.name}: arquivo vazio.`);
        continue;
      }
      if (pendentes.some((p) => p.file.name === file.name && p.file.size === file.size)) {
        novosErros.push(`${file.name}: já na lista.`);
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
      toast.error(`${novosErros.length} arquivos recusados`, { description: novosErros[0] });
    if (aceitos.length > 0) {
      setPendentes((prev) => [...prev, ...aceitos]);
      toast.success(`${aceitos.length} arquivos prontos para captura SIGAD`, {
        description: "Configure os metadados e confirme a captura.",
      });
    }
  }

  function aplicarEmLote() {
    const alvos = pendentes.filter((p) => p.sel);
    if (alvos.length === 0) {
      toast.error("Marque ao menos um arquivo.");
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
              tipo: cadTipo,
              nucleo: cadNucleo,
              sigla: cadSigla,
              autor: cadAutor,
              statusDocumento: cadStatusDoc,
              nivelAcesso: cadNivelAcesso,
              hipoteseLegal: cadHipoteseLegal,
              dossieId: cadDossieId,
              sel: false,
              editado: true,
            }
          : p
      )
    );
    toast.success(`Metadados aplicados a ${alvos.length} arquivo(s)`);
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
      } catch (e) {
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
        return tipoOk && anoOk && nucleoOk && pastaOk;
      }),
    [filtrosUpload, acervo]
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

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Captura Arquivística & Fixidade SHA-256
          </span>
        </div>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">
          Central de Captura do SIGAD
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deposite documentos arquivísticos com geração automática de Número Único de Protocolo,
          cálculo de Fixidade SHA-256 (PREMIS) e registro em Trilha de Auditoria.
        </p>
      </header>

      <div className="space-y-6">
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
          className={`flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-12 text-center transition-all ${
            arrastando ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-white"
          }`}
        >
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
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-2">
            <CloudUpload className="h-8 w-8" />
          </span>
          <p className="text-lg font-medium text-foreground">
            Arraste e solte seus componentes digitais aqui
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Formatos aceitos: PDF/A, PDF, Word, Excel ou TIFF (até 25 MB)
          </p>
          <Button onClick={() => inputRef.current?.click()}>Selecionar arquivos no PC</Button>
        </div>

        {erros.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            {erros.map((e) => (
              <p key={e} className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> {e}
              </p>
            ))}
          </div>
        )}

        {pendentes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Checkbox
                    checked={pendentes.every((p) => p.sel)}
                    onCheckedChange={(v) =>
                      setPendentes((prev) => prev.map((p) => ({ ...p, sel: v === true })))
                    }
                    disabled={enviando}
                  />{" "}
                  Selecionar todos
                </label>
                <span className="text-sm text-muted-foreground">
                  {selecionados.length}/{pendentes.length} marcados
                </span>
              </div>
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-2">
                {pendentes.map((p) => (
                  <li
                    key={p.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      p.editado
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-muted/30 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={p.sel}
                        onCheckedChange={() =>
                          setPendentes((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, sel: !x.sel } : x))
                          )
                        }
                        disabled={enviando}
                      />
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
                        className="h-7 min-w-0 flex-1 border-transparent bg-transparent hover:border-input focus-visible:bg-background px-1.5 font-medium truncate"
                        title="Clique para editar o nome do documento"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatarTamanho(p.file.size)}
                      </span>
                      <button
                        onClick={() =>
                          setPendentes((prev) => prev.filter((x) => x.id !== p.id))
                        }
                        disabled={enviando}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 pl-7 text-xs text-muted-foreground">
                      {p.tipo} · {new Date(`${p.data}T12:00:00`).getFullYear()} · {p.nucleo} ·{" "}
                      <span className="font-medium text-slate-700">
                        [{p.statusDocumento}] [{p.nivelAcesso}]
                      </span>
                    </p>
                    {p.status !== "aguardando" && (
                      <div className="mt-3 flex items-center gap-3 pl-7">
                        <Progress value={p.progresso} className="h-2 flex-1" />
                        <span className="text-xs font-medium">
                          {p.status === "concluido" ? "Concluído" : `${p.progresso}%`}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Metadados de Captura em Lote
                </p>
                <p className="text-xs text-muted-foreground">
                  Estes metadados serão gravados no banco e reutilizados automaticamente na futura
                  exportação SIP para o Archivematica.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Data e Hora de Captura</Label>
                  <div className="flex h-9 w-fit items-center rounded-md border border-input bg-transparent px-3 py-1 shadow-sm gap-3">
                    <input
                      type="date"
                      value={cadData}
                      onChange={(e) => {
                        setCadData(e.target.value);
                        setPendentes((prev) =>
                          prev.map((p) => (p.sel ? { ...p, data: e.target.value } : p))
                        );
                      }}
                      className="bg-transparent border-0 outline-none text-base md:text-sm cursor-pointer"
                    />
                    <span className="text-base md:text-sm text-foreground select-none font-normal border-l border-input pl-3">
                      {new Date().toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 w-32">
                  <Label>Ano</Label>
                  <Select
                    value={String(new Date(`${cadData}T12:00:00`).getFullYear())}
                    onValueChange={(v) => {
                      const nova = `${v}${cadData.slice(4)}`;
                      setCadData(nova);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, data: nova } : p))
                      );
                    }}
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

                <div className="space-y-2 flex-1 min-w-[260px]">
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
                    <SelectTrigger className="[&>span]:truncate">
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

                <div className="space-y-2 w-72">
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
                    className="bg-transparent"
                  />
                  <datalist id="siglas-list">
                    {Object.values(SIGLA_POR_NUCLEO).map((sigla) => (
                      <option key={sigla} value={sigla} />
                    ))}
                  </datalist>
                </div>

                {/* Linha de Metadados Intelectuais e Sigilo */}
                <div className="space-y-2 flex-1 min-w-[240px]">
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
                  />
                </div>

                <div className="space-y-2 w-60">
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
                    <SelectTrigger>
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

                <div className="space-y-2 w-64">
                  <Label>Nível de Acesso (LAI / LGPD)</Label>
                  <Select
                    value={cadNivelAcesso}
                    onValueChange={(v) => {
                      setCadNivelAcesso(v);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, nivelAcesso: v } : p))
                      );
                    }}
                  >
                    <SelectTrigger>
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

                {cadNivelAcesso !== "OSTENSIVO" && (
                  <div className="space-y-2 flex-1 min-w-[260px]">
                    <Label>Hipótese Legal de Restrição (LGPD / LAI)</Label>
                    <Input
                      value={cadHipoteseLegal}
                      onChange={(e) => {
                        setCadHipoteseLegal(e.target.value);
                        setPendentes((prev) =>
                          prev.map((p) => (p.sel ? { ...p, hipoteseLegal: e.target.value } : p))
                        );
                      }}
                      placeholder="Ex: Art. 31 da Lei 12.527/2011 — Dados Pessoais"
                    />
                  </div>
                )}

                {/* Seletor de Dossiê / Processo (Unidade de Arquivamento — Fase 3) */}
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <Label className="flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                    Dossiê / Processo (Unidade de Arquivamento)
                  </Label>
                  <Select
                    value={cadDossieId !== null ? String(cadDossieId) : "AVULSO"}
                    onValueChange={(v) => {
                      const novoId = v === "AVULSO" ? null : Number(v);
                      setCadDossieId(novoId);
                      setPendentes((prev) =>
                        prev.map((p) => (p.sel ? { ...p, dossieId: novoId } : p))
                      );
                    }}
                  >
                    <SelectTrigger className="[&>span]:truncate">
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

                <div className="space-y-2 w-40">
                  <Label>Atividade</Label>
                  <Select
                    value={cadTipoAtividade}
                    onValueChange={(v) => {
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
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atividade-Meio">Atividade-Meio</SelectItem>
                      <SelectItem value="Atividade-Fim">Atividade-Fim (FCJA)</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <div className="space-y-2 w-full">
                      <Label className="text-xs text-muted-foreground">5. Tipologia</Label>
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
                  </SeletorHierarquico>
                ) : (
                  <div className="col-span-full w-full grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-purple-50/40 rounded-2xl border border-purple-200 mt-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-purple-800">
                        Classe de Atividade-Fim da FCJA (PCD / TTD)
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
                      <p className="text-[11px] text-purple-700 font-medium">
                        Regra TTD Atividade-Fim FCJA: <strong>Guarda Permanente Automática</strong>{" "}
                        (Recolhimento ao RDC-Arq / Archivematica).
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

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={aplicarEmLote}
                  disabled={enviando || selecionados.length === 0}
                >
                  Aplicar aos {selecionados.length} marcados
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPendentes([]);
                      setErros([]);
                    }}
                    disabled={enviando}
                  >
                    Limpar Fila
                  </Button>
                  <Button variant="brand" onClick={cadastrarPendentes} disabled={enviando}>
                    {enviando
                      ? "Calculando SHA-256 e Capturando…"
                      : `Capturar ${selecionados.length} no SIGAD`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Gerenciamento do Acervo SIGAD</h3>
            <p className="text-sm text-muted-foreground">
              Inspecione a Ficha do Documento, verifique a fixidade SHA-256 (PREMIS) ou exporte
              relatórios.
            </p>
          </div>
          <div className="flex gap-3">
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
