/**
 * Leitor Nativo Client-Side de Arquivos OOXML (.xlsx) no Navegador (SRP).
 * Descompacta o arquivo ZIP (.xlsx) via DecompressionStream("deflate-raw") e interpreta
 * xl/workbook.xml, xl/sharedStrings.xml, xl/styles.xml e xl/worksheets/sheet*.xml.
 * Garante que todas as abas, células mescladas, cores e fórmulas sejam exibidas mesmo se o
 * servidor backend Python ainda estiver rodando uma sessão anterior sem reload.
 */

import {
  type AbaPlanilha,
  type CelulaPlanilha,
  type DadosPlanilhaAvancada,
  type ItemCatalogoFormula,
  letraColunaParaNumero,
  numeroParaLetraColuna,
} from "./planilha-viewer";

const TRADUCAO_FUNCOES_EXCEL: Record<string, string> = {
  SUM: "SOMA",
  AVERAGE: "MÉDIA",
  IF: "SE",
  VLOOKUP: "PROCV",
  HLOOKUP: "PROCH",
  XLOOKUP: "PROCX",
  COUNT: "CONT.NÚM",
  COUNTA: "CONT.VALORES",
  COUNTIF: "CONT.SE",
  COUNTIFS: "CONT.SES",
  SUMIF: "SOMASE",
  SUMIFS: "SOMASES",
  AVERAGEIF: "MÉDIASE",
  MAX: "MÁXIMO",
  MIN: "MÍNIMO",
  ROUND: "ARRED",
  CONCATENATE: "CONCATENAR",
  INDEX: "ÍNDICE",
  MATCH: "CORRESP",
  IFERROR: "SEERRO",
  TODAY: "HOJE",
  NOW: "AGORA",
  SUBTOTAL: "SUBTOTAL",
};

const PALETA_TEMA_OFFICE: Record<number, [number, number, number]> = {
  0: [255, 255, 255],
  1: [0, 0, 0],
  2: [231, 230, 230],
  3: [68, 84, 106],
  4: [91, 155, 213],
  5: [112, 173, 71],
  6: [165, 165, 165],
  7: [255, 192, 0],
  8: [237, 125, 49],
  9: [68, 114, 196],
};

function aplicarTintRgb(rgb: [number, number, number], tint: number): string {
  let [r, g, b] = rgb;
  if (tint > 0) {
    r = Math.round(r + (255 - r) * tint);
    g = Math.round(g + (255 - g) * tint);
    b = Math.round(b + (255 - b) * tint);
  } else if (tint < 0) {
    const fator = 1 + tint;
    r = Math.round(r * fator);
    g = Math.round(g * fator);
    b = Math.round(b * fator);
  }
  const hex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0").toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function extrairCorElementoXml(el: Element | null): string {
  if (!el) return "";
  const rgbAttr = el.getAttribute("rgb");
  if (rgbAttr && /^[0-9A-Fa-f]{6,8}$/.test(rgbAttr)) {
    const hex6 = rgbAttr.slice(-6).toUpperCase();
    const alpha = rgbAttr.length === 8 ? rgbAttr.slice(0, 2).toUpperCase() : "FF";
    if (alpha === "00" || hex6 === "FFFFFF" || hex6 === "000000") return "";
    return `#${hex6}`;
  }
  const themeAttr = el.getAttribute("theme");
  if (themeAttr !== null) {
    const idx = parseInt(themeAttr, 10);
    const tint = parseFloat(el.getAttribute("tint") || "0") || 0;
    const base = PALETA_TEMA_OFFICE[idx];
    if (base) {
      const hexCor = aplicarTintRgb(base, tint);
      if (hexCor !== "#FFFFFF" && hexCor !== "#000000") return hexCor;
    }
  }
  return "";
}

function extrairFuncoesDaFormula(formula: string): string[] {
  if (!formula || !formula.startsWith("=")) return [];
  const regex = /([A-ZÀ-Ú0-9_.]+)\s*\(/gi;
  const resultado: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(formula.toUpperCase())) !== null) {
    const nome = m[1]!;
    const pt = TRADUCAO_FUNCOES_EXCEL[nome];
    const rotulo = pt && pt !== nome ? `${pt} (${nome})` : nome;
    if (!resultado.includes(rotulo)) resultado.push(rotulo);
  }
  return resultado;
}

async function descompactarZipNoNavegador(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const arquivos = new Map<string, string>();
  const decoder = new TextDecoder("utf-8");

  // Localiza End of Central Directory (EOCD: 0x06054b50)
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Arquivo ZIP (.xlsx) inválido: EOCD não encontrado.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  for (let idx = 0; idx < totalEntries; idx++) {
    if (cdOffset + 46 > bytes.length || view.getUint32(cdOffset, true) !== 0x02014b50) {
      break;
    }
    const compressionMethod = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const fileNameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + fileNameLen));
    cdOffset += 46 + fileNameLen + extraLen + commentLen;

    if (!fileName.endsWith(".xml") && !fileName.endsWith(".rels")) {
      continue;
    }

    if (localHeaderOffset + 30 > bytes.length || view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      continue;
    }
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      arquivos.set(fileName, decoder.decode(rawSlice));
    } else if (compressionMethod === 8 && typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(rawSlice);
      writer.close();
      const decompressedBuf = await new Response(ds.readable).arrayBuffer();
      arquivos.set(fileName, decoder.decode(decompressedBuf));
    }
  }

  return arquivos;
}

function dividirRefCelula(ref: string): { col: number; row: number } {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!m) return { col: 1, row: 1 };
  return {
    col: letraColunaParaNumero(m[1]!),
    row: parseInt(m[2]!, 10) || 1,
  };
}

export async function lerXlsxNoNavegadorPorUrl(
  urlArquivo: string,
  nomeArquivo: string
): Promise<DadosPlanilhaAvancada | null> {
  try {
    const resp = await fetch(urlArquivo);
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const mapaXml = await descompactarZipNoNavegador(buffer);
    const parser = new DOMParser();

    // 1. Shared Strings (xl/sharedStrings.xml)
    const sharedStrings: string[] = [];
    const ssXml = mapaXml.get("xl/sharedStrings.xml");
    if (ssXml) {
      const docSS = parser.parseFromString(ssXml, "application/xml");
      const siNodes = Array.from(docSS.getElementsByTagName("si"));
      for (const si of siNodes) {
        const tNodes = Array.from(si.getElementsByTagName("t"));
        sharedStrings.push(tNodes.map((t) => t.textContent || "").join(""));
      }
    }

    // 2. Estilos (xl/styles.xml): fontes (negrito/cor) e preenchimentos (corFundo)
    const fontsBold: boolean[] = [];
    const fontsColor: string[] = [];
    const fillsColor: string[] = [];
    const cellXfsStyle: Array<{ bold: boolean; corFundo: string; corTexto: string }> = [];

    const stylesXml = mapaXml.get("xl/styles.xml");
    if (stylesXml) {
      const docSt = parser.parseFromString(stylesXml, "application/xml");
      const fontsEl = docSt.getElementsByTagName("fonts")[0];
      if (fontsEl) {
        for (const f of Array.from(fontsEl.getElementsByTagName("font"))) {
          fontsBold.push(f.getElementsByTagName("b").length > 0);
          const colorEl = f.getElementsByTagName("color")[0] || null;
          fontsColor.push(extrairCorElementoXml(colorEl));
        }
      }
      const fillsEl = docSt.getElementsByTagName("fills")[0];
      if (fillsEl) {
        for (const fl of Array.from(fillsEl.getElementsByTagName("fill"))) {
          const pf = fl.getElementsByTagName("patternFill")[0];
          if (pf && pf.getAttribute("patternType") === "solid") {
            const fg = pf.getElementsByTagName("fgColor")[0] || null;
            fillsColor.push(extrairCorElementoXml(fg));
          } else {
            fillsColor.push("");
          }
        }
      }
      const cellXfsEl = docSt.getElementsByTagName("cellXfs")[0];
      if (cellXfsEl) {
        for (const xf of Array.from(cellXfsEl.getElementsByTagName("xf"))) {
          const fontId = parseInt(xf.getAttribute("fontId") || "0", 10);
          const fillId = parseInt(xf.getAttribute("fillId") || "0", 10);
          cellXfsStyle.push({
            bold: Boolean(fontsBold[fontId]),
            corFundo: fillsColor[fillId] || "",
            corTexto: fontsColor[fontId] || "",
          });
        }
      }
    }

    // 3. Relacionamentos do Workbook (xl/_rels/workbook.xml.rels)
    const relsMap = new Map<string, string>();
    const relsXml = mapaXml.get("xl/_rels/workbook.xml.rels");
    if (relsXml) {
      const docRels = parser.parseFromString(relsXml, "application/xml");
      for (const rel of Array.from(docRels.getElementsByTagName("Relationship"))) {
        const id = rel.getAttribute("Id") || "";
        let target = rel.getAttribute("Target") || "";
        target = target.replace(/^\/+/, "");
        if (!target.startsWith("xl/")) {
          target = `xl/${target}`;
        }
        if (id && target) relsMap.set(id, target);
      }
    }

    // 4. Abas no Workbook (xl/workbook.xml)
    const wbXml = mapaXml.get("xl/workbook.xml");
    if (!wbXml) return null;
    const docWb = parser.parseFromString(wbXml, "application/xml");
    const sheetNodes = Array.from(docWb.getElementsByTagName("sheet"));

    const abasProcessadas: AbaPlanilha[] = [];
    const catalogoFormulas: ItemCatalogoFormula[] = [];
    const funcoesUtilizadasSet: string[] = [];

    sheetNodes.forEach((sheetEl, idxAba) => {
      const nomeAba = sheetEl.getAttribute("name") || `Planilha ${idxAba + 1}`;
      const rId =
        sheetEl.getAttribute("r:id") ||
        sheetEl.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ||
        "";
      const caminhoSheet = relsMap.get(rId) || `xl/worksheets/sheet${idxAba + 1}.xml`;
      const sheetXml = mapaXml.get(caminhoSheet) || mapaXml.get(`xl/worksheets/sheet${idxAba + 1}.xml`);
      if (!sheetXml) return;

      const docSheet = parser.parseFromString(sheetXml, "application/xml");
      const tabColorEl = docSheet.getElementsByTagName("tabColor")[0] || null;
      let corAba = extrairCorElementoXml(tabColorEl);

      // Lê células esparsas
      let maxRowUtil = 1;
      let maxColUtil = 1;
      const celulasMap = new Map<
        string,
        {
          valor: string;
          valorNumerico: number | null;
          formula: string;
          funcoes: string[];
          tipo: string;
          negrito: boolean;
          corFundo: string;
          corTexto: string;
        }
      >();

      const rowElements = Array.from(docSheet.getElementsByTagName("row"));
      for (const rowEl of rowElements) {
        const rAttr = parseInt(rowEl.getAttribute("r") || "1", 10);
        if (rAttr > 2000) continue;
        const cElements = Array.from(rowEl.getElementsByTagName("c"));
        for (const cEl of cElements) {
          const ref = cEl.getAttribute("r") || `A${rAttr}`;
          const { col, row } = dividirRefCelula(ref);
          if (row > 2000 || col > 50) continue;

          const tipoAttr = cEl.getAttribute("t") || "";
          const styleIdx = parseInt(cEl.getAttribute("s") || "-1", 10);
          const estilo = styleIdx >= 0 ? cellXfsStyle[styleIdx] : undefined;

          const fEl = cEl.getElementsByTagName("f")[0];
          const vEl = cEl.getElementsByTagName("v")[0];
          const isEl = cEl.getElementsByTagName("is")[0];

          const formulaRaw = fEl && fEl.textContent ? fEl.textContent.trim() : "";
          const formulaStr = formulaRaw
            ? formulaRaw.startsWith("=")
              ? formulaRaw
              : `=${formulaRaw}`
            : "";
          const funcoesCelula = formulaStr ? extrairFuncoesDaFormula(formulaStr) : [];
          for (const fn of funcoesCelula) {
            if (!funcoesUtilizadasSet.includes(fn)) funcoesUtilizadasSet.push(fn);
          }

          let textoValor = "";
          let valorNum: number | null = null;

          if (tipoAttr === "s" && vEl?.textContent !== null && vEl?.textContent !== undefined) {
            const ssIdx = parseInt(vEl.textContent, 10);
            textoValor = sharedStrings[ssIdx] ?? "";
          } else if (tipoAttr === "inlineStr" && isEl) {
            textoValor = Array.from(isEl.getElementsByTagName("t"))
              .map((t) => t.textContent || "")
              .join("");
          } else if (tipoAttr === "b") {
            textoValor = vEl?.textContent === "1" ? "VERDADEIRO" : "FALSO";
          } else if (vEl?.textContent !== null && vEl?.textContent !== undefined) {
            const rawV = vEl.textContent.trim();
            if (tipoAttr === "str" || tipoAttr === "e") {
              textoValor = rawV;
            } else {
              const parsed = Number(rawV);
              if (!Number.isNaN(parsed) && rawV !== "") {
                valorNum = parsed;
                textoValor = Number.isInteger(parsed)
                  ? String(parsed)
                  : parsed.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
              } else {
                textoValor = rawV;
              }
            }
          }

          if (formulaStr && !textoValor) {
            textoValor = formulaStr;
          }

          const temConteudo = textoValor !== "" || formulaStr !== "";
          if (temConteudo) {
            if (row > maxRowUtil) maxRowUtil = row;
            if (col > maxColUtil) maxColUtil = col;
          }

          const corFundo = estilo?.corFundo || "";
          if (corFundo && !corAba) {
            corAba = corFundo;
          }

          celulasMap.set(`${row}:${col}`, {
            valor: textoValor,
            valorNumerico: valorNum,
            formula: formulaStr,
            funcoes: funcoesCelula,
            tipo: formulaStr
              ? "formula"
              : valorNum !== null
                ? "numero"
                : textoValor
                  ? "texto"
                  : "vazio",
            negrito: Boolean(estilo?.bold),
            corFundo,
            corTexto: estilo?.corTexto || "",
          });
        }
      }

      // 5. Células Mescladas (<mergeCells>)
      const mapaMesclagem = new Map<string, { rowSpan: number; colSpan: number }>();
      const ocultasMesclagem = new Set<string>();
      const mergeCellsNodes = Array.from(docSheet.getElementsByTagName("mergeCell"));

      for (const mc of mergeCellsNodes) {
        const refRange = mc.getAttribute("ref") || "";
        const partes = refRange.split(":");
        if (partes.length !== 2) continue;
        const ini = dividirRefCelula(partes[0]!);
        const fim = dividirRefCelula(partes[1]!);
        if (ini.row > maxRowUtil || ini.col > maxColUtil) continue;
        const rMax = Math.min(fim.row, Math.max(maxRowUtil, fim.row));
        const cMax = Math.min(fim.col, Math.max(maxColUtil, fim.col));
        if (rMax > maxRowUtil && rMax <= 2000) maxRowUtil = rMax;
        if (cMax > maxColUtil && cMax <= 50) maxColUtil = cMax;

        mapaMesclagem.set(`${ini.row}:${ini.col}`, {
          rowSpan: rMax - ini.row + 1,
          colSpan: cMax - ini.col + 1,
        });
        for (let r = ini.row; r <= rMax; r++) {
          for (let c = ini.col; c <= cMax; c++) {
            if (r !== ini.row || c !== ini.col) {
              ocultasMesclagem.add(`${r}:${c}`);
            }
          }
        }
      }

      const letrasColunas = Array.from({ length: maxColUtil }, (_, i) =>
        numeroParaLetraColuna(i + 1)
      );
      const grade: CelulaPlanilha[][] = [];
      let totalPreenchidas = 0;
      let totalFormulasAba = 0;

      for (let r = 1; r <= maxRowUtil; r++) {
        const linhaArr: CelulaPlanilha[] = [];
        for (let c = 1; c <= maxColUtil; c++) {
          const letra = letrasColunas[c - 1] || "A";
          const coord = `${letra}${r}`;
          const chave = `${r}:${c}`;
          const info = celulasMap.get(chave);
          const mesclagem = mapaMesclagem.get(chave) || { rowSpan: 1, colSpan: 1 };
          const oculta = ocultasMesclagem.has(chave);

          const valor = info?.valor || "";
          const formula = info?.formula || "";
          const valorNumerico = info?.valorNumerico ?? null;
          const funcoes = info?.funcoes || [];
          const tipo = info?.tipo || "vazio";

          if (tipo !== "vazio") totalPreenchidas++;
          if (formula) {
            totalFormulasAba++;
            catalogoFormulas.push({
              aba: nomeAba,
              indiceAba: idxAba,
              coord,
              formula,
              funcoes,
              valorCalculado: valor,
            });
          }

          linhaArr.push({
            coord,
            linha: r,
            coluna: c,
            letraColuna: letra,
            valor,
            valorNumerico,
            formula,
            funcoes,
            tipo,
            formatoNumero: "General",
            negrito: info?.negrito || false,
            alinhamento: valorNumerico !== null ? "right" : "left",
            corFundo: info?.corFundo || "",
            corTexto: info?.corTexto || "",
            comentario: "",
            rowSpan: mesclagem.rowSpan,
            colSpan: mesclagem.colSpan,
            ocultaPorMesclagem: oculta,
          });
        }
        grade.push(linhaArr);
      }

      abasProcessadas.push({
        nome: nomeAba,
        indice: idxAba,
        estadoVisibilidade: "visible",
        corAba,
        totalLinhas: maxRowUtil,
        totalColunas: maxColUtil,
        totalCelulasPreenchidas: totalPreenchidas,
        totalFormulas: totalFormulasAba,
        totalMesclagens: mergeCellsNodes.length,
        letrasColunas,
        grade,
      });
    });

    if (abasProcessadas.length === 0) return null;

    return {
      nomeArquivo,
      totalAbas: abasProcessadas.length,
      totalFormulasGlobal: catalogoFormulas.length,
      funcoesUtilizadas: funcoesUtilizadasSet,
      catalogoFormulas,
      abas: abasProcessadas,
    };
  } catch {
    return null;
  }
}
