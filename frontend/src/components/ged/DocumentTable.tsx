import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Download as DownloadIcon,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileType2,
  Fingerprint,
  Image as ImageIcon,
  Lock,
  Pencil,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { exportarCsv, exportarExcel, exportarPdf } from "./export";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANOS,
  NIVEIS_ACESSO_OPCOES,
  NUCLEOS,
  STATUS_DOCUMENTO_OPCOES,
  type Doc,
} from "./data";
import { TIPOLOGIAS_MEIO } from "@/components/ged/codigos";
import { ModalMetadadosEarq } from "@/components/ged/ModalMetadadosEarq";
import { ModalEliminacaoControlada } from "@/components/ged/ModalEliminacaoControlada";
import {
  formatarHashCurto,
  rotuloNivelAcesso,
  rotuloStatusDocumento,
} from "@/lib/formatters";
import type { DadosEdicaoDoc } from "@/hooks/useAcervoSigad";

type Coluna = "nome" | "categoria" | "ano" | "nucleo";

function TipoIcone({ ext }: { ext: Doc["ext"] }) {
  if (ext === "xlsx")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-chart-2/15 text-chart-2">
        <FileSpreadsheet className="h-4 w-4" />
      </span>
    );
  if (ext === "docx")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-chart-3/15 text-chart-3">
        <FileType2 className="h-4 w-4" />
      </span>
    );
  if (ext === "tiff")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-500/15 text-orange-500">
        <ImageIcon className="h-4 w-4" />
      </span>
    );
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      <FileText className="h-4 w-4" />
    </span>
  );
}

export function DocumentTable({
  docs,
  usuarioPapel,
  onView,
  onDownload,
  onDelete,
  onDeleteMany,
  onRename,
  onEdit,
  onVerifyFixity,
}: {
  docs: Doc[];
  usuarioPapel?: string | null | undefined;
  onView?: ((doc: Doc) => void) | undefined;
  onDownload?: ((doc: Doc) => void) | undefined;
  onDelete?: ((doc: Doc, motivoEliminacao?: string, justificativa?: string) => Promise<void> | void) | undefined;
  onDeleteMany?: ((docs: Doc[], motivoEliminacao?: string, justificativa?: string) => Promise<void> | void) | undefined;
  onRename?: ((doc: Doc, nome: string) => void) | undefined;
  onEdit?: ((doc: Doc, dados: DadosEdicaoDoc) => void) | undefined;
  onVerifyFixity?: ((doc: Doc) => Promise<unknown>) | undefined;
}) {
  const [busca, setBusca] = useState("");
  const [coluna, setColuna] = useState<Coluna>("nome");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Alvos para Eliminação Controlada com Termo de Eliminação (e-ARQ Cap. 3.2)
  const [alvosEliminacao, setAlvosEliminacao] = useState<Doc[]>([]);

  // Estado da Ficha Arquivística e-ARQ v2 & PREMIS
  const [fichaDocId, setFichaDocId] = useState<string | null>(null);
  const docFicha = useMemo(
    () => (fichaDocId ? docs.find((d) => d.id === fichaDocId) || null : null),
    [docs, fichaDocId]
  );

  // Estados de edição de metadados
  const [editando, setEditando] = useState<Doc | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [novoNucleo, setNovoNucleo] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [novoStatusDoc, setNovoStatusDoc] = useState("ORIGINAL");
  const [novoNivelAcesso, setNovoNivelAcesso] = useState("OSTENSIVO");
  const [novaHipoteseLegal, setNovaHipoteseLegal] = useState("");

  const anosDisponiveis = useMemo(() => {
    const base = new Set<number>([...ANOS, ...docs.map((d) => d.ano), novoAno]);
    return [...base].sort((a, b) => a - b);
  }, [docs, novoAno]);

  function abrirEdicao(doc: Doc) {
    setEditando(doc);
    setNovoNome(doc.nome);
    setNovaCategoria(doc.categoria);
    setNovoAno(doc.ano);
    setNovoNucleo(doc.nucleo);
    setNovoAutor(doc.autor || "Fundação Casa de José Américo (FCJA)");
    setNovoStatusDoc(doc.statusDocumento || "ORIGINAL");
    setNovoNivelAcesso(doc.nivelAcesso || "OSTENSIVO");
    setNovaHipoteseLegal(doc.hipoteseLegal || "");
  }

  function salvarEdicao() {
    const nome = novoNome.trim();
    if (!editando) return;
    if (nome.length < 3) {
      toast.error("Nome inválido", { description: "Informe ao menos 3 caracteres." });
      return;
    }
    if (!novaCategoria || !novoNucleo) {
      toast.error("Dados incompletos", { description: "Informe tipologia e núcleo de pesquisa." });
      return;
    }
    if (onEdit) {
      onEdit(editando, {
        nome,
        categoria: novaCategoria,
        ano: novoAno,
        nucleo: novoNucleo,
        autor: novoAutor.trim() || "Fundação Casa de José Américo (FCJA)",
        statusDocumento: novoStatusDoc,
        nivelAcesso: novoNivelAcesso,
        hipoteseLegal: novaHipoteseLegal.trim(),
      });
    } else {
      onRename?.(editando, nome);
    }
    setEditando(null);
  }

  function ordenarPor(c: Coluna) {
    if (c === coluna) setOrdem((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setColuna(c);
      setOrdem("asc");
    }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = termo
      ? docs.filter((d) =>
          [
            d.id,
            d.numeroProtocolo || "",
            d.hashSha256 || "",
            d.autor || "",
            d.codigoClassificacao || "",
            d.descricaoCodigo || "",
            d.nome,
            d.categoria,
            d.nucleo,
            d.sigla || "",
            String(d.ano),
            d.upload,
          ]
            .join(" ")
            .toLowerCase()
            .includes(termo)
        )
      : docs;

    const fator = ordem === "asc" ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      if (coluna === "ano") return (a.ano - b.ano) * fator;
      return String(a[coluna]).localeCompare(String(b[coluna]), "pt-BR") * fator;
    });
  }, [docs, busca, coluna, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));

  useEffect(() => {
    setPagina(1);
  }, [busca, coluna, ordem, porPagina, docs]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const inicio = (pagina - 1) * porPagina;
  const visiveis = lista.slice(inicio, inicio + porPagina);

  const marcados = useMemo(
    () => lista.filter((d) => selecionados.includes(d.id)),
    [lista, selecionados]
  );
  const todosDaPagina = visiveis.length > 0 && visiveis.every((d) => selecionados.includes(d.id));

  function alternar(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function alternarPagina(valor: boolean) {
    const ids = visiveis.map((d) => d.id);
    setSelecionados((prev) =>
      valor ? Array.from(new Set([...prev, ...ids])) : prev.filter((x) => !ids.includes(x))
    );
  }

  function exportar(formato: "csv" | "xls" | "pdf", escopo: "filtrados" | "pagina" | "marcados") {
    const alvo = escopo === "pagina" ? visiveis : escopo === "marcados" ? marcados : lista;
    if (alvo.length === 0) {
      toast.error("Nada para exportar", { description: "Nenhum documento no escopo escolhido." });
      return;
    }
    const rotulo =
      escopo === "pagina" ? `pagina-${pagina}` : escopo === "marcados" ? "selecionados" : "filtrados";
    if (formato === "csv") exportarCsv(alvo, `documentos-${rotulo}.csv`);
    else if (formato === "xls") exportarExcel(alvo, `documentos-${rotulo}.xls`);
    else if (!exportarPdf(alvo, `Documentos (${rotulo})`)) {
      toast.error("Bloqueio de pop-up", { description: "Permita pop-ups para gerar o PDF." });
      return;
    }
    toast.success(`Exportação gerada (${alvo.length} documento(s))`, {
      description: `Formato ${formato.toUpperCase()} · escopo: ${rotulo}.`,
    });
  }

  async function processarEliminacaoControlada(motivo: string, justificativa: string) {
    if (alvosEliminacao.length === 0) return;
    if (alvosEliminacao.length === 1 && onDelete) {
      await onDelete(alvosEliminacao[0]!, motivo, justificativa);
    } else if (onDeleteMany) {
      await onDeleteMany(alvosEliminacao, motivo, justificativa);
    }
    const idsEliminados = new Set(alvosEliminacao.map((d) => d.id));
    setSelecionados((prev) => prev.filter((id) => !idsEliminados.has(id)));
    setAlvosEliminacao([]);
  }

  function Cabecalho({ c, label }: { c: Coluna; label: string }) {
    const Icone = coluna !== c ? ArrowUpDown : ordem === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => ordenarPor(c)}
        className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-foreground"
      >
        {label}
        <Icone className={`h-3.5 w-3.5 ${coluna === c ? "text-primary" : "opacity-50"}`} />
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">Resultados do Acervo SIGAD</h3>
          <p className="text-xs text-muted-foreground">
            {lista.length} documento(s) arquivístico(s) listado(s)
            {marcados.length > 0 ? ` · ${marcados.length} selecionado(s)` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {marcados.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setAlvosEliminacao(marcados)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar ({marcados.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Exportar Resultados</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportar("csv", "filtrados")}>
                <DownloadIcon className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("xls", "filtrados")}>
                <DownloadIcon className="mr-2 h-4 w-4" /> Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("pdf", "filtrados")}>
                <DownloadIcon className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar protocolo, SHA-256, código, nome..."
              aria-label="Busca global de documentos"
              className="pl-9"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={todosDaPagina}
                  onCheckedChange={(v) => alternarPagina(v === true)}
                  aria-label="Selecionar documentos desta página"
                />
              </TableHead>
              <TableHead className="w-14">Tipo</TableHead>
              <TableHead className="w-44">Protocolo SIGAD</TableHead>
              <TableHead>Código PCD</TableHead>
              <TableHead>
                <Cabecalho c="nome" label="Documento Arquivístico" />
              </TableHead>
              <TableHead>
                <Cabecalho c="categoria" label="Tipologia" />
              </TableHead>
              <TableHead>Status / Acesso</TableHead>
              <TableHead>Fixidade (PREMIS)</TableHead>
              <TableHead>
                <Cabecalho c="ano" label="Ano" />
              </TableHead>
              <TableHead>
                <Cabecalho c="nucleo" label="Núcleo" />
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum documento encontrado para os filtros ou busca informados.
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((doc) => {
                const integro = doc.fixidadeVerificada !== false;
                return (
                  <TableRow key={doc.id} className="transition-colors hover:bg-accent/50">
                    <TableCell>
                      <Checkbox
                        checked={selecionados.includes(doc.id)}
                        onCheckedChange={() => alternar(doc.id)}
                        aria-label={`Selecionar ${doc.nome}`}
                      />
                    </TableCell>
                    <TableCell>
                      <TipoIcone ext={doc.ext} />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setFichaDocId(doc.id)}
                        className="font-mono text-xs font-semibold text-blue-700 hover:underline text-left"
                        title="Clique para abrir a Ficha Arquivística & PREMIS"
                      >
                        {doc.numeroProtocolo || `ID-${doc.id.slice(0, 8)}`}
                      </button>
                      <span className="block text-[10px] text-muted-foreground">
                        {doc.upload} {doc.hora ? `· ${doc.hora}` : ""}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground font-mono text-xs"
                      title={doc.descricaoCodigo || doc.tipoAtividade}
                    >
                      {doc.codigoClassificacao || "-"}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <p className="truncate font-medium" title={doc.nome}>
                        {doc.nome}
                      </p>
                      {doc.autor && (
                        <p className="truncate text-[11px] text-muted-foreground" title={doc.autor}>
                          {doc.autor}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {doc.categoria}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {rotuloStatusDocumento(doc.statusDocumento)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            doc.nivelAcesso === "RESTRITO_LGPD" ||
                            doc.nivelAcesso === "SIGILOSO_LAI"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <Lock className="h-2.5 w-2.5" />
                          {rotuloNivelAcesso(doc.nivelAcesso)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setFichaDocId(doc.id)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                          integro
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-200"
                            : "bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200"
                        }`}
                        title={
                          doc.hashSha256
                            ? `SHA-256: ${doc.hashSha256} (Clique para inspecionar e verificar)`
                            : "Clique para inspecionar e calcular fixidade SHA-256"
                        }
                      >
                        {integro ? (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {doc.hashSha256 ? formatarHashCurto(doc.hashSha256, 8) : "Íntegro"}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.ano}</TableCell>
                    <TableCell className="max-w-[200px] text-muted-foreground">
                      <span className="line-clamp-2 text-xs leading-snug" title={doc.nucleo}>
                        {doc.nucleo}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ficha Arquivística & Fixidade PREMIS"
                          title="Ficha Arquivística & Fixidade SHA-256"
                          onClick={() => setFichaDocId(doc.id)}
                          className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Fingerprint className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar documento"
                          title="Editar metadados"
                          onClick={() => abrirEdicao(doc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Visualizar"
                          title="Visualizar documento"
                          onClick={() => onView?.(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Baixar"
                          title="Baixar arquivo"
                          onClick={() => onDownload?.(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar com Termo"
                          title="Emitir Termo de Eliminação"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setAlvosEliminacao([doc])}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3 text-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Itens por página</span>
          <select
            aria-label="Itens por página"
            value={porPagina}
            onChange={(e) => setPorPagina(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline">
            {lista.length === 0 ? 0 : inicio + 1}–{Math.min(inicio + porPagina, lista.length)} de{" "}
            {lista.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal Ficha Arquivística e-ARQ Brasil v2 & PREMIS */}
      <ModalMetadadosEarq
        doc={docFicha}
        onClose={() => setFichaDocId(null)}
        onVerificarFixidade={onVerifyFixity}
      />

      {/* Modal de Governança de Eliminação e Emissão de Termo (e-ARQ Cap. 3.2 & RBAC) */}
      <ModalEliminacaoControlada
        alvos={alvosEliminacao}
        aberto={alvosEliminacao.length > 0}
        usuarioPapel={usuarioPapel}
        onFechar={() => setAlvosEliminacao([])}
        onConfirmar={processarEliminacaoControlada}
      />

      {/* Modal de Edição de Metadados Descritivos e e-ARQ v2 */}
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Retificar Metadados do Documento</DialogTitle>
            <DialogDescription>
              Toda alteração de metadados gera automaticamente um evento procedimental (
              <code>EarqEventoProc</code>) na Trilha de Auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novo-nome">Nome do arquivo / Título</Label>
              <Input
                id="novo-nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarEdicao()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novo-autor">Autor / Produtor Arquivístico</Label>
              <Input
                id="novo-autor"
                value={novoAutor}
                onChange={(e) => setNovoAutor(e.target.value)}
                placeholder="Ex: Fundação Casa de José Américo (FCJA)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipologia Documental</Label>
                <Select value={novaCategoria} onValueChange={setNovaCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {TIPOLOGIAS_MEIO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano de Produção</Label>
                <Select value={String(novoAno)} onValueChange={(v) => setNovoAno(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status do Documento</Label>
                <Select value={novoStatusDoc} onValueChange={setNovoStatusDoc}>
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
              <div className="space-y-2">
                <Label>Nível de Acesso (LAI / LGPD)</Label>
                <Select value={novoNivelAcesso} onValueChange={setNovoNivelAcesso}>
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
            </div>

            {novoNivelAcesso !== "OSTENSIVO" && (
              <div className="space-y-2">
                <Label htmlFor="hipotese-legal">Fundamentação / Hipótese Legal (LGPD / LAI)</Label>
                <Input
                  id="hipotese-legal"
                  value={novaHipoteseLegal}
                  onChange={(e) => setNovaHipoteseLegal(e.target.value)}
                  placeholder="Ex: Art. 31 da Lei 12.527/2011 (Informação Pessoal)"
                />
              </div>
            )}

            <div className="space-y-2 grid min-w-0">
              <Label>Núcleo de pesquisa</Label>
              <Select value={novoNucleo} onValueChange={setNovoNucleo}>
                <SelectTrigger className="w-full max-w-full overflow-hidden [&>span]:truncate [&>span]:min-w-0 text-left">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,42rem)]">
                  {NUCLEOS.filter((n) => n !== "Todos").map((n) => (
                    <SelectItem key={n} value={n} className="whitespace-normal">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao}>Salvar e Auditar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
