import { useMemo, useState } from "react";
import {
  Calculator,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FunctionSquare,
  Layers,
  MessageSquare,
  Search,
  Sparkles,
  Table as TableIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calcularEstatisticasCelulas,
  exportarAbaPlanilhaCsv,
  extrairReferenciasDeFormula,
  formatarNumeroPtBr,
  normalizarDadosPlanilha,
  type CelulaPlanilha,
  type DadosPlanilhaAvancada,
} from "@/lib/planilha-viewer";

interface VisualizadorPlanilhaAvancadoProps {
  dadosBrutos: DadosPlanilhaAvancada;
  nomeDocumento?: string | undefined;
  onBaixarOriginal?: (() => void) | undefined;
}

export function VisualizadorPlanilhaAvancado({
  dadosBrutos,
  nomeDocumento,
  onBaixarOriginal,
}: VisualizadorPlanilhaAvancadoProps) {
  const workbook = useMemo(
    () => normalizarDadosPlanilha(dadosBrutos, nomeDocumento || "Planilha.xlsx"),
    [dadosBrutos, nomeDocumento]
  );

  const [indiceAbaAtiva, setIndiceAbaAtiva] = useState<number>(0);
  const [coordSelecionada, setCoordSelecionada] = useState<string>("A1");
  const [colunaInteiraSelecionada, setColunaInteiraSelecionada] = useState<string | null>(
    null
  );
  const [linhaInteiraSelecionada, setLinhaInteiraSelecionada] = useState<number | null>(
    null
  );
  const [exibirFormulasNaGrade, setExibirFormulasNaGrade] = useState<boolean>(false);
  const [destacarCelulasFormula, setDestacarCelulasFormula] = useState<boolean>(true);
  const [painelFormulasAberto, setPainelFormulasAberto] = useState<boolean>(false);
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [filtrarLinhasComBusca, setFiltrarLinhasComBusca] = useState<boolean>(false);

  const abaAtiva =
    workbook.abas[indiceAbaAtiva] || workbook.abas[0] || null;

  // Mapa rápido de coordenada -> célula na aba ativa
  const mapaCelulasAba = useMemo(() => {
    const mapa = new Map<string, CelulaPlanilha>();
    if (!abaAtiva) return mapa;
    for (const row of abaAtiva.grade) {
      for (const cell of row) {
        mapa.set(cell.coord, cell);
      }
    }
    return mapa;
  }, [abaAtiva]);

  const celulaAtiva: CelulaPlanilha | null = useMemo(() => {
    if (!abaAtiva) return null;
    return (
      mapaCelulasAba.get(coordSelecionada) ||
      abaAtiva.grade[0]?.[0] ||
      null
    );
  }, [abaAtiva, mapaCelulasAba, coordSelecionada]);

  // Conjunto de coordenadas referenciadas pela fórmula da célula ativa (ex: C2:C5)
  const coordenadasReferenciadas = useMemo<Set<string>>(() => {
    if (!celulaAtiva || !celulaAtiva.formula) return new Set();
    return extrairReferenciasDeFormula(celulaAtiva.formula);
  }, [celulaAtiva]);

  // Contagem de ocorrências da busca por aba
  const ocorrenciasPorAba = useMemo<Record<number, number>>(() => {
    const q = termoBusca.trim().toLowerCase();
    if (!q) return {};
    const cont: Record<number, number> = {};
    workbook.abas.forEach((aba, idx) => {
      let n = 0;
      for (const row of aba.grade) {
        for (const cell of row) {
          if (
            cell.valor.toLowerCase().includes(q) ||
            cell.formula.toLowerCase().includes(q) ||
            cell.coord.toLowerCase() === q
          ) {
            n++;
          }
        }
      }
      cont[idx] = n;
    });
    return cont;
  }, [workbook.abas, termoBusca]);

  // Linhas visíveis na grade (permite filtrar apenas linhas que batem com a busca ou ver todas)
  const linhasGradeVisiveis = useMemo(() => {
    if (!abaAtiva) return [];
    const q = termoBusca.trim().toLowerCase();
    if (!q || !filtrarLinhasComBusca) return abaAtiva.grade;

    return abaAtiva.grade.filter((row, rIdx) => {
      if (rIdx === 0) return true; // Mantém a linha 1 (cabeçalho)
      return row.some(
        (c) =>
          c.valor.toLowerCase().includes(q) ||
          c.formula.toLowerCase().includes(q) ||
          c.coord.toLowerCase() === q
      );
    });
  }, [abaAtiva, termoBusca, filtrarLinhasComBusca]);

  // Células consideradas para a Barra de Status Estatística (Soma, Média, Contagem, Mín, Máx)
  const estatisticasSelecao = useMemo(() => {
    if (!abaAtiva) {
      return calcularEstatisticasCelulas([]);
    }

    if (colunaInteiraSelecionada) {
      const celulasCol = abaAtiva.grade
        .map((row) => row.find((c) => c.letraColuna === colunaInteiraSelecionada))
        .filter((c): c is CelulaPlanilha => Boolean(c));
      return calcularEstatisticasCelulas(celulasCol);
    }

    if (linhaInteiraSelecionada !== null) {
      const row = abaAtiva.grade.find(
        (r) => r[0]?.linha === linhaInteiraSelecionada
      );
      return calcularEstatisticasCelulas(row || []);
    }

    if (coordenadasReferenciadas.size > 0) {
      const celulasRef: CelulaPlanilha[] = [];
      coordenadasReferenciadas.forEach((coord) => {
        const c = mapaCelulasAba.get(coord);
        if (c) celulasRef.push(c);
      });
      if (celulasRef.length > 0) {
        return calcularEstatisticasCelulas(celulasRef);
      }
    }

    // Por padrão, calcula estatísticas da coluna da célula ativa (ou de toda a aba se vazia)
    if (celulaAtiva) {
      const celulasColAtiva = abaAtiva.grade
        .map((row) => row.find((c) => c.letraColuna === celulaAtiva.letraColuna))
        .filter((c): c is CelulaPlanilha => Boolean(c));
      return calcularEstatisticasCelulas(celulasColAtiva);
    }

    return calcularEstatisticasCelulas(abaAtiva.grade.flat());
  }, [
    abaAtiva,
    colunaInteiraSelecionada,
    linhaInteiraSelecionada,
    coordenadasReferenciadas,
    mapaCelulasAba,
    celulaAtiva,
  ]);

  function copiarTexto(valor: string, rotulo: string) {
    if (!valor) return;
    navigator.clipboard.writeText(valor);
    toast.success(`${rotulo} copiado para a área de transferência`);
  }

  function saltarParaCelula(indiceAba: number, coord: string) {
    setIndiceAbaAtiva(indiceAba);
    setCoordSelecionada(coord);
    setColunaInteiraSelecionada(null);
    setLinhaInteiraSelecionada(null);
  }

  if (!abaAtiva) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        Nenhuma aba ou tabela encontrada nesta planilha.
      </div>
    );
  }

  const qBusca = termoBusca.trim().toLowerCase();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100 text-xs select-none">
      {/* 1. BARRA DE COMANDO E METADADOS DA PASTA DE TRABALHO (WORKBOOK TOOLBAR) */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2">
        {/* Resumo de Abas e Funções */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            {workbook.totalAbas} Aba(s)
          </span>

          <button
            type="button"
            onClick={() => setPainelFormulasAberto((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
              painelFormulasAberto
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-purple-50 text-purple-800 ring-1 ring-purple-200 hover:bg-purple-100"
            }`}
            title="Abrir Catálogo Completo de Fórmulas e Funções da Planilha"
          >
            <FunctionSquare className="h-3.5 w-3.5" />
            {workbook.totalFormulasGlobal} Fórmula(s) / Função(ões)
          </button>

          {workbook.funcoesUtilizadas.length > 0 && (
            <div className="hidden items-center gap-1 lg:flex">
              <span className="text-[10px] font-semibold text-slate-400">
                Funções:
              </span>
              {workbook.funcoesUtilizadas.slice(0, 5).map((fn) => (
                <span
                  key={fn}
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700"
                >
                  {fn}
                </span>
              ))}
              {workbook.funcoesUtilizadas.length > 5 && (
                <span className="text-[10px] text-slate-500">
                  +{workbook.funcoesUtilizadas.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Busca, Alternância Valor/Fórmula e Exportação */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar valor, texto ou =fórmula..."
              className="h-7 pr-7 pl-8 text-xs"
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => setTermoBusca("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {termoBusca.trim() && (
            <button
              type="button"
              onClick={() => setFiltrarLinhasComBusca((v) => !v)}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                filtrarLinhasComBusca
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filtrarLinhasComBusca ? "Mostrando só linhas filtradas" : "Filtrar Linhas"}
            </button>
          )}

          {/* Alternar entre Valores Calculados e Fórmulas Brutas nas células */}
          <button
            type="button"
            onClick={() => setExibirFormulasNaGrade((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              exibirFormulasNaGrade
                ? "border-purple-400 bg-purple-600 text-white shadow-2xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Alternar entre exibir os valores calculados ou as expressões das fórmulas diretamente nas células (Ctrl + ~)"
          >
            <FunctionSquare className="h-3.5 w-3.5" />
            {exibirFormulasNaGrade ? "Exibindo: =Fórmulas" : "Exibir =Fórmulas"}
          </button>

          {/* Destacar visualmente células que possuem fórmulas */}
          <button
            type="button"
            onClick={() => setDestacarCelulasFormula((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
              destacarCelulasFormula
                ? "border-purple-200 bg-purple-50 text-purple-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
            title="Destacar na tabela todas as células calculadas por fórmulas"
          >
            <Sparkles className="h-3 w-3" />
            Destacar fx
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportarAbaPlanilhaCsv(abaAtiva, workbook.nomeArquivo);
              toast.success(`Aba "${abaAtiva.nome}" exportada em CSV!`);
            }}
            className="h-7 gap-1 bg-white px-2.5 text-[11px]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            CSV da Aba
          </Button>

          {onBaixarOriginal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBaixarOriginal}
              className="h-7 gap-1 bg-white px-2.5 text-[11px]"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              Original .XLSX
            </Button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE FÓRMULAS E INSPETOR DE CÉLULA ATIVA (EXCEL FORMULA BAR) */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-1.5">
        {/* Caixa de Coordenada (Name Box) */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-7 min-w-[64px] items-center justify-center rounded border border-slate-300 bg-white px-2 font-mono text-xs font-bold text-slate-900 shadow-2xs"
            title="Coordenada da célula selecionada"
          >
            {colunaInteiraSelecionada
              ? `Col ${colunaInteiraSelecionada}:${colunaInteiraSelecionada}`
              : linhaInteiraSelecionada !== null
                ? `Lin ${linhaInteiraSelecionada}:${linhaInteiraSelecionada}`
                : celulaAtiva?.coord || "A1"}
          </div>

          {celulaAtiva && (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                celulaAtiva.formula
                  ? "bg-purple-100 text-purple-800 ring-1 ring-purple-300"
                  : celulaAtiva.tipo === "numero"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              {celulaAtiva.formula
                ? "Fórmula"
                : celulaAtiva.tipo === "numero"
                  ? "Número"
                  : celulaAtiva.tipo === "data"
                    ? "Data"
                    : celulaAtiva.tipo === "vazio"
                      ? "Vazia"
                      : "Texto"}
            </span>
          )}
        </div>

        {/* Ícone fx */}
        <div className="flex h-7 items-center rounded border border-slate-300 bg-white px-2 font-serif text-sm font-bold italic text-purple-700 shadow-2xs">
          fx
        </div>

        {/* Campo da Expressão / Valor da Célula Ativa */}
        <div className="flex min-w-[240px] flex-1 items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3 py-1 shadow-2xs select-text">
          {celulaAtiva ? (
            celulaAtiva.formula ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-purple-700">
                  {celulaAtiva.formula}
                </span>
                {celulaAtiva.funcoes.map((fn) => (
                  <span
                    key={fn}
                    className="rounded bg-purple-50 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-purple-800 ring-1 ring-purple-200"
                  >
                    Função: {fn}
                  </span>
                ))}
                <span className="text-[11px] text-slate-400">➔</span>
                <span className="rounded bg-emerald-50 px-2 py-0.2 font-mono text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Valor Calculado: {celulaAtiva.valor || "0"}
                </span>
                {coordenadasReferenciadas.size > 0 && (
                  <span className="text-[10px] text-purple-600">
                    ({coordenadasReferenciadas.size} célula(s) referenciada(s) destacada(s))
                  </span>
                )}
              </div>
            ) : (
              <span className="truncate font-mono text-xs text-slate-800">
                {celulaAtiva.valor || (
                  <span className="italic text-slate-400">Célula vazia</span>
                )}
              </span>
            )
          ) : (
            <span className="italic text-slate-400">
              Clique em uma célula para inspecionar seu valor ou fórmula
            </span>
          )}

          {celulaAtiva && (celulaAtiva.formula || celulaAtiva.valor) && (
            <div className="flex shrink-0 items-center gap-1.5">
              {celulaAtiva.formula && (
                <button
                  type="button"
                  onClick={() => copiarTexto(celulaAtiva.formula, "Fórmula")}
                  className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 hover:bg-purple-100"
                >
                  <Copy className="h-2.5 w-2.5" /> Copiar Fórmula
                </button>
              )}
              {celulaAtiva.valor && (
                <button
                  type="button"
                  onClick={() => copiarTexto(celulaAtiva.valor, "Valor da célula")}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <Copy className="h-2.5 w-2.5" /> Copiar Valor
                </button>
              )}
            </div>
          )}
        </div>

        {/* Comentário de Célula se existir */}
        {celulaAtiva?.comentario && (
          <div className="flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
            <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
            <span>Nota: {celulaAtiva.comentario}</span>
          </div>
        )}
      </div>

      {/* 3. ÁREA CENTRAL: GRADE EXCEL (A,B,C x 1,2,3) + PAINEL LATERAL DE FÓRMULAS */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 3.1 GRADE DE CÉLULAS COM COORDENADAS */}
        <div className="flex-1 overflow-auto bg-white select-text">
          <table className="w-max min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs">
              <tr>
                {/* Canto Superior Esquerdo (Selecionar Tudo) */}
                <th
                  onClick={() => {
                    setColunaInteiraSelecionada(null);
                    setLinhaInteiraSelecionada(null);
                  }}
                  className="sticky left-0 z-30 w-11 cursor-pointer border-r border-b border-slate-300 bg-slate-200/90 px-2 py-1.5 text-center font-mono text-[10px] font-bold text-slate-500 hover:bg-slate-300"
                  title="Limpar seleção de linha/coluna"
                >
                  ◢
                </th>

                {/* Letras das Colunas (A, B, C, D...) */}
                {abaAtiva.letrasColunas.map((letra) => {
                  const colSelecionada = colunaInteiraSelecionada === letra;
                  const colDaCelulaAtiva = celulaAtiva?.letraColuna === letra;
                  return (
                    <th
                      key={letra}
                      onClick={() => {
                        setColunaInteiraSelecionada((atual) =>
                          atual === letra ? null : letra
                        );
                        setLinhaInteiraSelecionada(null);
                      }}
                      className={`min-w-[115px] cursor-pointer border-r border-b border-slate-300 px-3 py-1.5 text-center font-mono text-[11px] font-bold transition-colors select-none ${
                        colSelecionada
                          ? "bg-blue-600 text-white"
                          : colDaCelulaAtiva
                            ? "bg-blue-100 text-blue-900"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                      }`}
                      title={`Coluna ${letra} — Clique para calcular Soma/Média desta coluna`}
                    >
                      {letra}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {linhasGradeVisiveis.map((linhaCelulas) => {
                const numLinha = linhaCelulas[0]?.linha ?? 1;
                const linSelecionada = linhaInteiraSelecionada === numLinha;
                const linDaCelulaAtiva = celulaAtiva?.linha === numLinha;

                return (
                  <tr key={numLinha} className="group">
                    {/* Índice Numérico da Linha (1, 2, 3...) */}
                    <td
                      onClick={() => {
                        setLinhaInteiraSelecionada((atual) =>
                          atual === numLinha ? null : numLinha
                        );
                        setColunaInteiraSelecionada(null);
                      }}
                      className={`sticky left-0 z-10 w-11 cursor-pointer border-r border-b border-slate-300 px-2 py-1.5 text-center font-mono text-[11px] font-semibold transition-colors select-none ${
                        linSelecionada
                          ? "bg-blue-600 text-white"
                          : linDaCelulaAtiva
                            ? "bg-blue-100 font-bold text-blue-900"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title={`Linha ${numLinha} — Clique para selecionar toda a linha`}
                    >
                      {numLinha}
                    </td>

                    {/* Células da Linha */}
                    {linhaCelulas.map((cel) => {
                      if (cel.ocultaPorMesclagem) {
                        return null;
                      }

                      const ehAtiva = celulaAtiva?.coord === cel.coord;
                      const ehReferenciadaPorFormula = coordenadasReferenciadas.has(
                        cel.coord
                      );
                      const pertenceColunaouLinhaSel =
                        colunaInteiraSelecionada === cel.letraColuna ||
                        linhaInteiraSelecionada === cel.linha;
                      const possuiFormula = Boolean(cel.formula);
                      const bateBusca =
                        Boolean(qBusca) &&
                        (cel.valor.toLowerCase().includes(qBusca) ||
                          cel.formula.toLowerCase().includes(qBusca) ||
                          cel.coord.toLowerCase() === qBusca);

                      const textoMostrado =
                        exibirFormulasNaGrade && possuiFormula
                          ? cel.formula
                          : cel.valor;

                      return (
                        <td
                          key={cel.coord}
                          rowSpan={cel.rowSpan > 1 ? cel.rowSpan : undefined}
                          colSpan={cel.colSpan > 1 ? cel.colSpan : undefined}
                          onClick={() => {
                            setCoordSelecionada(cel.coord);
                            setColunaInteiraSelecionada(null);
                            setLinhaInteiraSelecionada(null);
                          }}
                          className={`relative max-w-[360px] cursor-cell border-r border-b border-slate-200 px-2.5 py-1.5 transition-colors ${
                            ehAtiva
                              ? "z-10 bg-blue-50/70 outline-2 -outline-offset-2 outline-blue-600"
                              : ehReferenciadaPorFormula
                                ? "bg-purple-100/60 outline-2 -outline-offset-2 outline-dashed outline-purple-600"
                                : bateBusca
                                  ? "bg-amber-100/80 font-semibold text-amber-950"
                                  : pertenceColunaouLinhaSel
                                    ? "bg-blue-50/40"
                                    : possuiFormula && destacarCelulasFormula
                                      ? "bg-purple-50/35 hover:bg-purple-50/70"
                                      : cel.linha === 1 && cel.negrito
                                        ? "bg-slate-50/90"
                                        : "hover:bg-slate-50/70"
                          } ${cel.negrito ? "font-bold text-slate-900" : "text-slate-700"} ${
                            cel.alinhamento === "right" && !exibirFormulasNaGrade
                              ? "text-right font-mono"
                              : cel.alinhamento === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                          title={
                            possuiFormula
                              ? `${cel.coord} · Fórmula: ${cel.formula} ➔ Resultado: ${cel.valor}`
                              : `${cel.coord}: ${cel.valor}`
                          }
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`truncate ${
                                exibirFormulasNaGrade && possuiFormula
                                  ? "font-mono font-bold text-purple-700"
                                  : ""
                              } ${
                                cel.alinhamento === "right" && !exibirFormulasNaGrade
                                  ? "ml-auto"
                                  : ""
                              }`}
                            >
                              {textoMostrado}
                            </span>

                            {/* Indicador visual de que a célula possui fórmula (fx) */}
                            {possuiFormula &&
                              destacarCelulasFormula &&
                              !exibirFormulasNaGrade && (
                                <span
                                  className="shrink-0 rounded bg-purple-100 px-1 py-0.2 font-serif text-[9px] font-bold italic text-purple-700"
                                  title={`Fórmula: ${cel.formula}`}
                                >
                                  fx
                                </span>
                              )}
                          </div>

                          {/* Triângulo superior direito indicando comentário/nota do Excel */}
                          {cel.comentario && (
                            <span
                              className="absolute top-0 right-0 h-0 w-0 border-t-[6px] border-l-[6px] border-t-amber-500 border-l-transparent"
                              title={`Nota: ${cel.comentario}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3.2 PAINEL LATERAL: CATÁLOGO DE FÓRMULAS & FUNÇÕES DA PLANILHA */}
        {painelFormulasAberto && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-slate-300 bg-slate-50 xl:w-96">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  Auditoria de Cálculos da Planilha
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  Catálogo de Fórmulas & Funções ({workbook.catalogoFormulas.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPainelFormulasAberto(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {workbook.catalogoFormulas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                  Esta planilha contém apenas valores estáticos (nenhuma fórmula{" "}
                  <code>=SUM</code>, <code>=IF</code>, etc. foi encontrada nas abas).
                </div>
              ) : (
                workbook.catalogoFormulas.map((item, idx) => {
                  const selecionada =
                    indiceAbaAtiva === item.indiceAba &&
                    coordSelecionada === item.coord;
                  return (
                    <div
                      key={`${item.aba}-${item.coord}-${idx}`}
                      onClick={() => saltarParaCelula(item.indiceAba, item.coord)}
                      className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                        selecionada
                          ? "border-purple-400 bg-purple-50/70 ring-1 ring-purple-300"
                          : "border-slate-200 bg-white hover:border-purple-300 hover:shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-800">
                          {item.aba} ! {item.coord}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-700">
                          = {item.valorCalculado || "0"}
                        </span>
                      </div>
                      <p className="mt-1.5 break-all font-mono text-xs font-bold text-slate-900 select-all">
                        {item.formula}
                      </p>
                      {item.funcoes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.funcoes.map((fn) => (
                            <span
                              key={fn}
                              className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600"
                            >
                              {fn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 4. RODAPÉ ESTILO EXCEL: BARRA DE ABAS (WORKSHEETS) + BARRA DE STATUS ESTATÍSTICA */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-300 bg-slate-200/80 px-2 py-1">
        {/* 4.1 ABAS DA PASTA DE TRABALHO (SHEET TABS) */}
        <div className="flex max-w-full items-center gap-1 overflow-x-auto py-0.5">
          {workbook.abas.map((aba, idx) => {
            const ativa = idx === indiceAbaAtiva;
            const matchesNaAba = ocorrenciasPorAba[idx] ?? 0;
            return (
              <button
                key={`${aba.nome}-${idx}`}
                type="button"
                onClick={() => {
                  setIndiceAbaAtiva(idx);
                  setCoordSelecionada("A1");
                  setColunaInteiraSelecionada(null);
                  setLinhaInteiraSelecionada(null);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-t-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                  ativa
                    ? "border-t-emerald-600 bg-white text-emerald-900 shadow-xs"
                    : "border-t-transparent bg-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <TableIcon
                  className={`h-3.5 w-3.5 ${
                    ativa ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                <span>{aba.nome}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-normal text-slate-500">
                  {aba.totalLinhas}×{aba.totalColunas}
                </span>
                {aba.totalFormulas > 0 && (
                  <span
                    className="rounded bg-purple-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-purple-800"
                    title={`${aba.totalFormulas} fórmula(s) nesta aba`}
                  >
                    fx:{aba.totalFormulas}
                  </span>
                )}
                {aba.estadoVisibilidade !== "visible" && (
                  <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
                    Oculta
                  </span>
                )}
                {matchesNaAba > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                    {matchesNaAba}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4.2 BARRA DE STATUS AUTOMÁTICA (SOMA, MÉDIA, CONTAGEM, MÍN, MÁX) */}
        <div className="flex flex-wrap items-center gap-3 px-2 py-0.5 text-[11px] text-slate-700">
          <span className="flex items-center gap-1 text-slate-500">
            <Calculator className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {colunaInteiraSelecionada
                ? `Coluna ${colunaInteiraSelecionada}:`
                : linhaInteiraSelecionada !== null
                  ? `Linha ${linhaInteiraSelecionada}:`
                  : coordenadasReferenciadas.size > 0
                    ? `Intervalo da Fórmula:`
                    : `Coluna ${celulaAtiva?.letraColuna || "A"}:`}
            </span>
          </span>

          <span>
            Contagem: <strong>{estatisticasSelecao.preenchidas}</strong>
          </span>

          {estatisticasSelecao.qtdNumeros > 0 && (
            <>
              <span className="rounded bg-white px-2 py-0.5 font-mono shadow-2xs">
                Σ Soma: <strong>{formatarNumeroPtBr(estatisticasSelecao.soma)}</strong>
              </span>
              <span className="rounded bg-white px-2 py-0.5 font-mono shadow-2xs">
                x̄ Média: <strong>{formatarNumeroPtBr(estatisticasSelecao.media)}</strong>
              </span>
              <span className="hidden sm:inline">
                Mín: <strong>{formatarNumeroPtBr(estatisticasSelecao.minimo)}</strong>
              </span>
              <span className="hidden sm:inline">
                Máx: <strong>{formatarNumeroPtBr(estatisticasSelecao.maximo)}</strong>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
