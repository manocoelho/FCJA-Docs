/**
 * Utilitário e Tipos de Domínio do Visualizador Avançado de Planilhas (SRP).
 * Responsável por normalização de dados multi-aba, análise de referências de fórmulas Excel
 * (ex: =SUM(C2:C5) -> ["C2","C3","C4","C5"]) e estatísticas de seleção.
 */

export interface CelulaPlanilha {
  coord: string;
  linha: number;
  coluna: number;
  letraColuna: string;
  valor: string;
  valorNumerico: number | null;
  formula: string;
  funcoes: string[];
  tipo: "formula" | "numero" | "texto" | "data" | "booleano" | "vazio" | "erro" | string;
  formatoNumero: string;
  negrito: boolean;
  alinhamento: "left" | "center" | "right" | string;
  corFundo?: string | undefined;
  corTexto?: string | undefined;
  comentario: string;
  rowSpan: number;
  colSpan: number;
  ocultaPorMesclagem: boolean;
}

export interface AbaPlanilha {
  nome: string;
  indice: number;
  estadoVisibilidade: string;
  corAba?: string | undefined;
  totalLinhas: number;
  totalColunas: number;
  totalCelulasPreenchidas: number;
  totalFormulas: number;
  totalMesclagens: number;
  letrasColunas: string[];
  grade: CelulaPlanilha[][];
}

export interface ItemCatalogoFormula {
  aba: string;
  indiceAba: number;
  coord: string;
  formula: string;
  funcoes: string[];
  valorCalculado: string;
}

export interface DadosPlanilhaAvancada {
  nomeArquivo?: string | undefined;
  totalAbas?: number | undefined;
  totalFormulasGlobal?: number | undefined;
  funcoesUtilizadas?: string[] | undefined;
  catalogoFormulas?: ItemCatalogoFormula[] | undefined;
  abas?: AbaPlanilha[] | undefined;
  // Campos legados para retrocompatibilidade
  colunas?: string[] | undefined;
  linhas?: Record<string, unknown>[] | undefined;
  erro?: string | undefined;
}

export function numeroParaLetraColuna(num: number): string {
  let n = num;
  let letra = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    letra = String.fromCharCode(65 + mod) + letra;
    n = Math.floor((n - mod) / 26);
  }
  return letra || "A";
}

export function letraColunaParaNumero(letra: string): number {
  let num = 0;
  const limpo = letra.toUpperCase().trim();
  for (let i = 0; i < limpo.length; i++) {
    num = num * 26 + (limpo.charCodeAt(i) - 64);
  }
  return num;
}

export interface PlanilhaNormalizada {
  nomeArquivo: string;
  totalAbas: number;
  totalFormulasGlobal: number;
  funcoesUtilizadas: string[];
  catalogoFormulas: ItemCatalogoFormula[];
  abas: AbaPlanilha[];
}

/**
 * Converte resposta legada { colunas, linhas } em estrutura multi-aba caso necessário.
 */
export function normalizarDadosPlanilha(
  raw: DadosPlanilhaAvancada,
  nomePadrao = "Planilha.xlsx"
): PlanilhaNormalizada {
  if (raw.abas && raw.abas.length > 0) {
    return {
      nomeArquivo: raw.nomeArquivo || nomePadrao,
      totalAbas: raw.totalAbas ?? raw.abas.length,
      totalFormulasGlobal: raw.totalFormulasGlobal ?? (raw.catalogoFormulas?.length || 0),
      funcoesUtilizadas: raw.funcoesUtilizadas || [],
      catalogoFormulas: raw.catalogoFormulas || [],
      abas: raw.abas,
    };
  }

  const colunas = raw.colunas || [];
  const linhas = raw.linhas || [];
  const letras = colunas.map((_, idx) => numeroParaLetraColuna(idx + 1));
  const grade: CelulaPlanilha[][] = [];

  if (colunas.length > 0) {
    grade.push(
      colunas.map((col, idx) => {
        const letra = numeroParaLetraColuna(idx + 1);
        return {
          coord: `${letra}1`,
          linha: 1,
          coluna: idx + 1,
          letraColuna: letra,
          valor: String(col),
          valorNumerico: null,
          formula: "",
          funcoes: [],
          tipo: "texto",
          formatoNumero: "General",
          negrito: true,
          alinhamento: "left",
          comentario: "",
          rowSpan: 1,
          colSpan: 1,
          ocultaPorMesclagem: false,
        };
      })
    );

    linhas.forEach((linhaObj, rIdx) => {
      const rNum = rIdx + 2;
      grade.push(
        colunas.map((col, cIdx) => {
          const letra = numeroParaLetraColuna(cIdx + 1);
          const bruto = linhaObj[col];
          const num =
            typeof bruto === "number" && !Number.isNaN(bruto) ? bruto : null;
          const texto = bruto === null || bruto === undefined ? "" : String(bruto);
          return {
            coord: `${letra}${rNum}`,
            linha: rNum,
            coluna: cIdx + 1,
            letraColuna: letra,
            valor: texto,
            valorNumerico: num,
            formula: "",
            funcoes: [],
            tipo: num !== null ? "numero" : texto ? "texto" : "vazio",
            formatoNumero: "General",
            negrito: false,
            alinhamento: num !== null ? "right" : "left",
            comentario: "",
            rowSpan: 1,
            colSpan: 1,
            ocultaPorMesclagem: false,
          };
        })
      );
    });
  }

  return {
    nomeArquivo: raw.nomeArquivo || nomePadrao,
    totalAbas: 1,
    totalFormulasGlobal: 0,
    funcoesUtilizadas: [],
    catalogoFormulas: [],
    abas: [
      {
        nome: "Planilha 1",
        indice: 0,
        estadoVisibilidade: "visible",
        totalLinhas: grade.length,
        totalColunas: colunas.length,
        totalCelulasPreenchidas: grade.length * colunas.length,
        totalFormulas: 0,
        totalMesclagens: 0,
        letrasColunas: letras,
        grade,
      },
    ],
  };
}

/**
 * Extrai todas as coordenadas de células referenciadas por uma fórmula Excel
 * (ex: "=SUM(C2:C5)+E2" -> Set {"C2", "C3", "C4", "C5", "E2"})
 * para destacar visualmente na grade os operandos da fórmula selecionada.
 */
export function extrairReferenciasDeFormula(formula: string): Set<string> {
  const refs = new Set<string>();
  if (!formula || !formula.startsWith("=")) return refs;

  // 1. Intervalos (ex: B2:D10 ou $C$2:$C$6)
  const regexIntervalo = /\$?([A-Z]{1,2})\$?(\d{1,4})\s*:\s*\$?([A-Z]{1,2})\$?(\d{1,4})/gi;
  let match: RegExpExecArray | null;
  while ((match = regexIntervalo.exec(formula)) !== null) {
    const colIni = letraColunaParaNumero(match[1]!);
    const linIni = parseInt(match[2]!, 10);
    const colFim = letraColunaParaNumero(match[3]!);
    const linFim = parseInt(match[4]!, 10);

    const cMin = Math.min(colIni, colFim);
    const cMax = Math.max(colIni, colFim);
    const rMin = Math.min(linIni, linFim);
    const rMax = Math.max(linIni, linFim);

    if ((cMax - cMin + 1) * (rMax - rMin + 1) <= 200) {
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          refs.add(`${numeroParaLetraColuna(c)}${r}`);
        }
      }
    }
  }

  // 2. Células individuais (ex: C2, $D$4)
  const regexCelula = /\$?([A-Z]{1,2})\$?(\d{1,4})(?![A-Z0-9_(])/gi;
  while ((match = regexCelula.exec(formula)) !== null) {
    const col = match[1]!.toUpperCase();
    const lin = parseInt(match[2]!, 10);
    if (lin >= 1) {
      refs.add(`${col}${lin}`);
    }
  }

  return refs;
}

/**
 * Calcula estatísticas estilo Barra de Status do Excel (Contagem, Numéricos, Soma, Média, Mín, Máx).
 */
export function calcularEstatisticasCelulas(celulas: CelulaPlanilha[]) {
  let preenchidas = 0;
  let comFormula = 0;
  const numeros: number[] = [];

  for (const c of celulas) {
    if (c.valor !== "" || c.formula !== "") {
      preenchidas++;
    }
    if (c.formula) {
      comFormula++;
    }
    if (c.valorNumerico !== null && !Number.isNaN(c.valorNumerico)) {
      numeros.push(c.valorNumerico);
    }
  }

  if (numeros.length === 0) {
    return {
      preenchidas,
      comFormula,
      qtdNumeros: 0,
      soma: null as number | null,
      media: null as number | null,
      minimo: null as number | null,
      maximo: null as number | null,
    };
  }

  const soma = numeros.reduce((a, b) => a + b, 0);
  const media = soma / numeros.length;
  const minimo = Math.min(...numeros);
  const maximo = Math.max(...numeros);

  return {
    preenchidas,
    comFormula,
    qtdNumeros: numeros.length,
    soma,
    media,
    minimo,
    maximo,
  };
}

export function formatarNumeroPtBr(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function exportarAbaPlanilhaCsv(aba: AbaPlanilha, nomeArquivoBase: string) {
  const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const linhasCsv = aba.grade.map((row) =>
    row.map((c) => esc(c.valor || c.formula || "")).join(";")
  );
  const conteudo = "\uFEFF" + linhasCsv.join("\r\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const limpo = nomeArquivoBase.replace(/\.[^.]+$/, "");
  a.href = url;
  a.download = `${limpo}-${aba.nome.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
