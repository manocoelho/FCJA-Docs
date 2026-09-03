import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Download as DownloadIcon, FileDown } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ANOS, CATEGORIA_POR_TIPO, NUCLEOS, TIPOS, type Doc } from "./data";

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
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      <FileText className="h-4 w-4" />
    </span>
  );
}

export function DocumentTable({
  docs,
  onView,
  onDownload,
  onDelete,
  onDeleteMany,
  onRename,
  onEdit,
}: {
  docs: Doc[];
  onView?: (doc: Doc) => void;
  onDownload?: (doc: Doc) => void;
  onDelete?: (doc: Doc) => void;
  onDeleteMany?: (docs: Doc[]) => void;
  onRename?: (doc: Doc, nome: string) => void;
  onEdit?: (doc: Doc, dados: { nome: string; categoria: string; ano: number; nucleo: string }) => void;
}) {
  const [busca, setBusca] = useState("");
  const [coluna, setColuna] = useState<Coluna>("nome");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState(false);
  const [editando, setEditando] = useState<Doc | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [novoNucleo, setNovoNucleo] = useState("");

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
    if (onEdit) onEdit(editando, { nome, categoria: novaCategoria, ano: novoAno, nucleo: novoNucleo });
    else onRename?.(editando, nome);
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
          [d.nome, d.categoria, d.nucleo, String(d.ano), d.upload]
            .join(" ")
            .toLowerCase()
            .includes(termo),
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
    [lista, selecionados],
  );
  const todosDaPagina = visiveis.length > 0 && visiveis.every((d) => selecionados.includes(d.id));

  function alternar(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function alternarPagina(valor: boolean) {
    const ids = visiveis.map((d) => d.id);
    setSelecionados((prev) =>
      valor ? Array.from(new Set([...prev, ...ids])) : prev.filter((x) => !ids.includes(x)),
    );
  }

  function exportar(formato: "csv" | "xls" | "pdf", escopo: "filtrados" | "pagina" | "marcados") {
    const alvo =
      escopo === "pagina" ? visiveis : escopo === "marcados" ? marcados : lista;
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

  function confirmarRemocao() {
    onDeleteMany?.(marcados);
    setSelecionados([]);
    setConfirmar(false);
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
          <h3 className="truncate text-base font-semibold">Resultados da Busca</h3>
          <p className="text-xs text-muted-foreground">
            {lista.length} documento(s) listado(s)
            {marcados.length > 0 ? ` · ${marcados.length} selecionado(s)` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {marcados.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmar(true)}>
              <Trash2 className="h-4 w-4" />
              Remover ({marcados.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Todos os filtrados ({lista.length})</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => exportar("csv", "filtrados")}>
                <DownloadIcon className="h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("xls", "filtrados")}>
                <DownloadIcon className="h-4 w-4" /> Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("pdf", "filtrados")}>
                <DownloadIcon className="h-4 w-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Página atual ({visiveis.length})</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => exportar("csv", "pagina")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("xls", "pagina")}>
                Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("pdf", "pagina")}>PDF</DropdownMenuItem>
              {marcados.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Selecionados ({marcados.length})</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportar("csv", "marcados")}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportar("xls", "marcados")}>
                    Excel (.xls)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportar("pdf", "marcados")}>
                    PDF
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, tipologia, ano, núcleo..."
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
              <TableHead className="w-16">Tipo</TableHead>
              <TableHead>
                <Cabecalho c="nome" label="Nome do Arquivo" />
              </TableHead>
              <TableHead>
                <Cabecalho c="categoria" label="Tipologia" />
              </TableHead>
              <TableHead>
                <Cabecalho c="ano" label="Ano" />
              </TableHead>
              <TableHead>
                <Cabecalho c="nucleo" label="Núcleo" />
              </TableHead>
              <TableHead>Data de Upload</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum documento encontrado para os filtros ou busca informados.
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((doc) => (
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
                  <TableCell className="max-w-[280px] truncate font-medium">{doc.nome}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {doc.categoria}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{doc.ano}</TableCell>
                  <TableCell className="max-w-[240px] text-muted-foreground">
                    <span className="line-clamp-2 leading-snug" title={doc.nucleo}>
                      {doc.nucleo}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{doc.upload}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar documento"
                        onClick={() => abrirEdicao(doc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Visualizar"
                        onClick={() => onView?.(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Baixar"
                        onClick={() => onDownload?.(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete?.(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {marcados.length} documento(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove os documentos selecionados do acervo desta demonstração e não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            {marcados.slice(0, 20).map((d) => (
              <li key={d.id} className="truncate">
                {d.nome}
              </li>
            ))}
            {marcados.length > 20 && <li>e mais {marcados.length - 20} arquivo(s)…</li>}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRemocao}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar documento</DialogTitle>
            <DialogDescription>
              Altere nome, tipologia, ano e núcleo de pesquisa do documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novo-nome">Nome do arquivo</Label>
              <Input
                id="novo-nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarEdicao()}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipologia</Label>
                <Select value={novaCategoria} onValueChange={setNovaCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => {
                      const cat = CATEGORIA_POR_TIPO[t] ?? t;
                      return (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
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
            <div className="space-y-2">
              <Label>Núcleo de pesquisa</Label>
              <Select value={novoNucleo} onValueChange={setNovoNucleo}>
                <SelectTrigger className="w-full [&>span]:truncate">
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
            <Button onClick={salvarEdicao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}