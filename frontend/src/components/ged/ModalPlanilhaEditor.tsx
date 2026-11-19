import { useState, useMemo } from "react";
import {
  Calculator,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModalPlanilhaEditorProps {
  aberto: boolean;
  onFechar: () => void;
  onInserirTabelaNoTexto: (htmlTabela: string) => void;
  onExportarXlsxLocal: (nomeAba: string, colunas: string[], linhas: string[][]) => void;
  onCapturarXlsxNoSigad: (nomeAba: string, colunas: string[], linhas: string[][]) => void;
}

const COLUNAS_INICIAIS = [
  "Código / Cota",
  "Descrição / Item Documental",
  "Ano",
  "Quantidade",
  "Valor / Estimativa",
];

const LINHAS_INICIAIS: string[][] = [
  ["FCJA-001", "Manuscritos e Correspondências de José Américo", "1930", "14", "1250.00"],
  ["FCJA-002", "Exemplares da Revista Era Nova (Modernismo PB)", "1925", "8", "890.50"],
  ["FCJA-003", "Partituras e Registros Sonoros Maestro José Siqueira", "1952", "22", "2100.00"],
];

export function ModalPlanilhaEditor({
  aberto,
  onFechar,
  onInserirTabelaNoTexto,
  onExportarXlsxLocal,
  onCapturarXlsxNoSigad,
}: ModalPlanilhaEditorProps) {
  const [nomeAba, setNomeAba] = useState("Inventario_Pesquisa");
  const [colunas, setColunas] = useState<string[]>(COLUNAS_INICIAIS);
  const [linhas, setLinhas] = useState<string[][]>(LINHAS_INICIAIS);
  const [incluirLinhaTotais, setIncluirLinhaTotais] = useState(true);

  function adicionarLinha() {
    setLinhas((prev) => [...prev, colunas.map(() => "")]);
  }

  function removerLinha(idx: number) {
    if (linhas.length <= 1) return;
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  }

  function adicionarColuna() {
    const novoNome = `Coluna ${colunas.length + 1}`;
    setColunas((prev) => [...prev, novoNome]);
    setLinhas((prev) => prev.map((l) => [...l, ""]));
  }

  function removerColuna(idx: number) {
    if (colunas.length <= 2) return;
    setColunas((prev) => prev.filter((_, i) => i !== idx));
    setLinhas((prev) => prev.map((l) => l.filter((_, i) => i !== idx)));
  }

  function atualizarCabecalho(idx: number, valor: string) {
    setColunas((prev) => prev.map((c, i) => (i === idx ? valor : c)));
  }

  function atualizarCelula(rowIdx: number, colIdx: number, valor: string) {
    setLinhas((prev) =>
      prev.map((linha, r) =>
        r === rowIdx ? linha.map((cel, c) => (c === colIdx ? valor : cel)) : linha
      )
    );
  }

  // Calcula automaticamente soma e média para colunas numéricas
  const totaisPorColuna = useMemo(() => {
    return colunas.map((_, colIdx) => {
      // Colunas de Ano não devem ser somadas financeiramente
      const nomeCol = (colunas[colIdx] || "").toLowerCase();
      if (nomeCol === "ano" || nomeCol === "data") {
        return { ehNumerica: false, soma: 0, media: 0, qtdNumeros: 0 };
      }
      let soma = 0;
      let qtdNumeros = 0;
      for (const l of linhas) {
        const raw = (l[colIdx] || "").trim().replace(",", ".");
        if (raw !== "" && !isNaN(Number(raw))) {
          soma += Number(raw);
          qtdNumeros += 1;
        }
      }
      return {
        ehNumerica: qtdNumeros > 0,
        soma,
        media: qtdNumeros > 0 ? soma / qtdNumeros : 0,
        qtdNumeros,
      };
    });
  }, [colunas, linhas]);

  function construirHtmlTabelaDaPlanilha(): string {
    const ths = colunas
      .map(
        (c) =>
          `<th style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #0f172a;">${
            c || "Coluna"
          }</th>`
      )
      .join("");

    const trs = linhas
      .map((l) => {
        const tds = colunas
          .map(
            (_, ci) =>
              `<td style="border: 1px solid #cbd5e1; padding: 7px 10px; color: #1e293b;">${
                l[ci] || ""
              }</td>`
          )
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");

    let tfoot = "";
    if (incluirLinhaTotais && totaisPorColuna.some((t) => t.ehNumerica)) {
      const tdsTotal = colunas
        .map((_, ci) => {
          if (ci === 0) {
            return `<td style="border: 1px solid #94a3b8; background-color: #f8fafc; padding: 7px 10px; font-weight: 700; color: #0f172a;">TOTAL / SOMA</td>`;
          }
          const info = totaisPorColuna[ci];
          if (info && info.ehNumerica) {
            const fmt = Number.isInteger(info.soma)
              ? String(info.soma)
              : info.soma.toFixed(2);
            return `<td style="border: 1px solid #94a3b8; background-color: #f8fafc; padding: 7px 10px; font-weight: 700; color: #1e3a8a;">${fmt}</td>`;
          }
          return `<td style="border: 1px solid #94a3b8; background-color: #f8fafc; padding: 7px 10px; color: #64748b;">—</td>`;
        })
        .join("");
      tfoot = `<tfoot><tr>${tdsTotal}</tr></tfoot>`;
    }

    return `
      <div style="margin: 16px 0;">
        <p style="font-size: 10pt; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Planilha / Quadro Tabular: ${nomeAba}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5pt;">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
          ${tfoot}
        </table>
      </div>
      <p><br/></p>
    `;
  }

  function obterLinhasComTotaisSeAtivo(): string[][] {
    if (!incluirLinhaTotais || !totaisPorColuna.some((t) => t.ehNumerica)) {
      return linhas;
    }
    const linhaTotal = colunas.map((_, ci) => {
      if (ci === 0) return "TOTAL";
      const info = totaisPorColuna[ci];
      if (info && info.ehNumerica) {
        return Number.isInteger(info.soma) ? String(info.soma) : info.soma.toFixed(2);
      }
      return "";
    });
    return [...linhas, linhaTotal];
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-5xl sm:max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Construtor de Planilhas & Quadros Calculados
            </span>
          </div>
          <DialogTitle className="mt-1">
            Editor de Planilha Integrada (Tabelas Calculadas & Exportação .XLSX)
          </DialogTitle>
          <DialogDescription>
            Monte uma planilha estruturada com cálculo automático de colunas numéricas. Você pode
            inseri-la dentro do documento de texto atual ou capturá-la diretamente como arquivo
            Excel (<code>.xlsx</code>) no SIGAD.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Barra de Controles da Planilha */}
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-slate-50 p-3.5">
            <div className="space-y-1 min-w-[220px]">
              <Label className="text-xs font-semibold">Título / Nome da Aba da Planilha</Label>
              <Input
                value={nomeAba}
                onChange={(e) => setNomeAba(e.target.value)}
                placeholder="Ex: Inventario_Fontes_1930"
                className="h-8 bg-white text-xs font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 bg-white border rounded-lg px-3 py-1.5">
                <Checkbox
                  checked={incluirLinhaTotais}
                  onCheckedChange={(v) => setIncluirLinhaTotais(v === true)}
                />
                <Calculator className="h-3.5 w-3.5 text-blue-600" />
                Calcular linha de SOMA / TOTAL automática
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarColuna}
                className="gap-1.5 bg-white text-xs"
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" />
                Adicionar Coluna
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarLinha}
                className="gap-1.5 bg-white text-xs"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                Adicionar Linha
              </Button>
            </div>
          </div>

          {/* Grade Editável da Planilha */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="w-10 px-2 py-2 text-center font-mono text-[10px] text-slate-500 border-r">
                    #
                  </th>
                  {colunas.map((col, colIdx) => (
                    <th key={colIdx} className="min-w-[150px] border-r border-slate-200 p-1.5">
                      <div className="flex items-center gap-1">
                        <Input
                          value={col}
                          onChange={(e) => atualizarCabecalho(colIdx, e.target.value)}
                          className="h-7 bg-white font-semibold text-xs text-slate-900 border-slate-300"
                        />
                        {colunas.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removerColuna(colIdx)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remover coluna"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-10 px-2 py-2 text-center text-[10px] text-slate-500">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {linhas.map((linha, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-blue-50/20">
                    <td className="px-2 py-1.5 text-center font-mono text-[11px] text-slate-400 bg-slate-50 border-r">
                      {rowIdx + 1}
                    </td>
                    {colunas.map((_, colIdx) => (
                      <td key={colIdx} className="border-r border-slate-100 p-1">
                        <Input
                          value={linha[colIdx] || ""}
                          onChange={(e) => atualizarCelula(rowIdx, colIdx, e.target.value)}
                          placeholder="..."
                          className="h-7 border-transparent bg-transparent hover:border-slate-200 focus-visible:bg-white focus-visible:border-blue-400 text-xs"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removerLinha(rowIdx)}
                        disabled={linhas.length <= 1}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        title="Remover linha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {incluirLinhaTotais && (
                <tfoot>
                  <tr className="bg-blue-50/60 border-t-2 border-blue-200 font-semibold">
                    <td className="px-2 py-2 text-center font-mono text-[10px] text-blue-700 border-r">
                      Σ
                    </td>
                    {colunas.map((_, colIdx) => {
                      if (colIdx === 0) {
                        return (
                          <td
                            key={colIdx}
                            className="px-3 py-2 text-xs font-bold text-slate-800 border-r"
                          >
                            TOTAL / SOMA AUTOMÁTICA
                          </td>
                        );
                      }
                      const info = totaisPorColuna[colIdx];
                      return (
                        <td
                          key={colIdx}
                          className="px-3 py-2 text-xs font-mono font-bold text-blue-800 border-r"
                        >
                          {info && info.ehNumerica ? (
                            <div>
                              <span>
                                Σ ={" "}
                                {Number.isInteger(info.soma)
                                  ? info.soma
                                  : info.soma.toFixed(2)}
                              </span>
                              <span className="block text-[10px] font-normal text-slate-500">
                                Média: {info.media.toFixed(2)} ({info.qtdNumeros} itens)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExportarXlsxLocal(nomeAba, colunas, obterLinhasComTotaisSeAtivo())}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Baixar Excel (.xlsx) no PC
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onCapturarXlsxNoSigad(nomeAba, colunas, obterLinhasComTotaisSeAtivo());
                onFechar();
              }}
              className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              Capturar Planilha Direto no SIGAD (.xlsx)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onFechar}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onInserirTabelaNoTexto(construirHtmlTabelaDaPlanilha());
                onFechar();
              }}
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs"
            >
              <Table2 className="h-3.5 w-3.5" />
              Inserir Planilha no Documento de Texto
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
