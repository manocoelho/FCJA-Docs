"""
Serviço de Responsabilidade Única (SRP): Leitura e Inspeção Avançada de Planilhas (XLSX, XLS, CSV).
Extrai múltiplas abas (worksheets), coordenadas Excel (A1, B2...), fórmulas/funções exatas (=SUM, =IF...),
valores calculados, formatação numérica, células mescladas, comentários e estatísticas.
"""

import os
import re
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional
import openpyxl
from openpyxl.utils import get_column_letter
import pandas as pd


TRADUCAO_FUNCOES_EXCEL: Dict[str, str] = {
    "SUM": "SOMA",
    "AVERAGE": "MÉDIA",
    "IF": "SE",
    "VLOOKUP": "PROCV",
    "HLOOKUP": "PROCH",
    "XLOOKUP": "PROCX",
    "COUNT": "CONT.NÚM",
    "COUNTA": "CONT.VALORES",
    "COUNTIF": "CONT.SE",
    "COUNTIFS": "CONT.SES",
    "SUMIF": "SOMASE",
    "SUMIFS": "SOMASES",
    "AVERAGEIF": "MÉDIASE",
    "MAX": "MÁXIMO",
    "MIN": "MÍNIMO",
    "ROUND": "ARRED",
    "CONCATENATE": "CONCATENAR",
    "INDEX": "ÍNDICE",
    "MATCH": "CORRESP",
    "IFERROR": "SEERRO",
    "TODAY": "HOJE",
    "NOW": "AGORA",
    "SUBTOTAL": "SUBTOTAL",
}

LIMITE_LINHAS_POR_ABA = 500
LIMITE_COLUNAS_POR_ABA = 50


def _formatar_valor_celula(valor: Any, number_format: Optional[str] = None) -> str:
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "VERDADEIRO" if valor else "FALSO"
    if isinstance(valor, datetime):
        return (
            valor.strftime("%d/%m/%Y %H:%M")
            if (valor.hour or valor.minute)
            else valor.strftime("%d/%m/%Y")
        )
    if isinstance(valor, date):
        return valor.strftime("%d/%m/%Y")
    if isinstance(valor, time):
        return valor.strftime("%H:%M:%S")
    if isinstance(valor, (int, float)):
        fmt = (number_format or "").lower()
        if "%" in fmt:
            return (
                f"{valor * 100:,.2f}%"
                .replace(",", "X")
                .replace(".", ",")
                .replace("X", ".")
            )
        if "r$" in fmt or "$" in fmt or "[$r$" in fmt:
            texto_num = (
                f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            )
            return f"R$ {texto_num}"
        if isinstance(valor, float):
            if valor.is_integer():
                return str(int(valor))
            return f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return str(valor)
    return str(valor)


def _extrair_funcoes_da_formula(formula: str) -> List[str]:
    if not formula or not formula.startswith("="):
        return []
    nomes = re.findall(r"([A-ZÀ-Ú0-9_.]+)\s*\(", formula.upper())
    resultado: List[str] = []
    for n in nomes:
        pt = TRADUCAO_FUNCOES_EXCEL.get(n)
        rotulo = f"{pt} ({n})" if pt and pt != n else n
        if rotulo not in resultado:
            resultado.append(rotulo)
    return resultado


def ler_planilha_completa(
    caminho_fisico: str, nome_documento: str = ""
) -> Dict[str, Any]:
    """
    Lê um arquivo de planilha (.xlsx, .xls, .csv) preservando todas as abas,
    fórmulas/funções, valores calculados, mesclagens e metadados de células.
    """
    ext = os.path.splitext(caminho_fisico)[1].lower()

    if ext in (".xlsx", ".xlsm", ".xltx", ".xltm"):
        try:
            return _ler_via_openpyxl(caminho_fisico, nome_documento)
        except Exception:
            pass

    return _ler_via_pandas_multiaba(caminho_fisico, nome_documento)


def _ler_via_openpyxl(caminho_fisico: str, nome_documento: str) -> Dict[str, Any]:
    wb_formulas = openpyxl.load_workbook(
        caminho_fisico, data_only=False, read_only=False
    )
    wb_valores = openpyxl.load_workbook(caminho_fisico, data_only=True, read_only=False)

    abas_processadas: List[Dict[str, Any]] = []
    catalogo_formulas: List[Dict[str, Any]] = []
    funcoes_utilizadas_set: List[str] = []

    for idx_aba, nome_aba in enumerate(wb_formulas.sheetnames):
        ws_f = wb_formulas[nome_aba]
        ws_v = wb_valores[nome_aba]

        max_row_raw = min(ws_f.max_row or 1, LIMITE_LINHAS_POR_ABA)
        max_col_raw = min(ws_f.max_column or 1, LIMITE_COLUNAS_POR_ABA)

        max_row_util = 1
        max_col_util = 1
        for r in range(1, max_row_raw + 1):
            for c in range(1, max_col_raw + 1):
                val_f = ws_f.cell(row=r, column=c).value
                val_v = ws_v.cell(row=r, column=c).value
                if val_f is not None or val_v is not None:
                    if r > max_row_util:
                        max_row_util = r
                    if c > max_col_util:
                        max_col_util = c

        mapa_mesclagem_inicio: Dict[tuple, Dict[str, int]] = {}
        celulas_ocultas_mesclagem = set()
        lista_mesclagens_str: List[str] = []

        for merged_range in ws_f.merged_cells.ranges:
            min_col, min_row, max_col, max_row = merged_range.bounds
            if min_row > max_row_util or min_col > max_col_util:
                continue
            row_span = min(max_row, max_row_util) - min_row + 1
            col_span = min(max_col, max_col_util) - min_col + 1
            mapa_mesclagem_inicio[(min_row, min_col)] = {
                "rowSpan": row_span,
                "colSpan": col_span,
            }
            lista_mesclagens_str.append(str(merged_range))
            for r in range(min_row, min(max_row, max_row_util) + 1):
                for c in range(min_col, min(max_col, max_col_util) + 1):
                    if (r, c) != (min_row, min_col):
                        celulas_ocultas_mesclagem.add((r, c))

        letras_colunas = [get_column_letter(c) for c in range(1, max_col_util + 1)]
        grade: List[List[Dict[str, Any]]] = []
        total_preenchidas = 0
        total_formulas_aba = 0

        for r in range(1, max_row_util + 1):
            linha_celulas: List[Dict[str, Any]] = []
            for c in range(1, max_col_util + 1):
                letra = get_column_letter(c)
                coord = f"{letra}{r}"
                cell_f = ws_f.cell(row=r, column=c)
                cell_v = ws_v.cell(row=r, column=c)

                bruto_f = cell_f.value
                bruto_v = cell_v.value

                eh_formula = isinstance(bruto_f, str) and bruto_f.startswith("=")
                formula_str = str(bruto_f) if eh_formula else ""
                funcoes_celula = (
                    _extrair_funcoes_da_formula(formula_str) if eh_formula else []
                )

                for fn in funcoes_celula:
                    if fn not in funcoes_utilizadas_set:
                        funcoes_utilizadas_set.append(fn)

                valor_base = (
                    bruto_v
                    if bruto_v is not None
                    else (None if eh_formula else bruto_f)
                )
                fmt_num = getattr(cell_f, "number_format", None) or "General"
                texto_exibicao = _formatar_valor_celula(valor_base, fmt_num)

                if eh_formula and not texto_exibicao:
                    texto_exibicao = formula_str

                valor_numerico: Optional[float] = None
                if isinstance(valor_base, (int, float)) and not isinstance(
                    valor_base, bool
                ):
                    valor_numerico = float(valor_base)

                if eh_formula:
                    tipo_celula = "formula"
                    total_formulas_aba += 1
                elif valor_base is None or texto_exibicao == "":
                    tipo_celula = "vazio"
                elif isinstance(valor_base, bool):
                    tipo_celula = "booleano"
                elif isinstance(valor_base, (int, float)):
                    tipo_celula = "numero"
                elif isinstance(valor_base, (datetime, date, time)):
                    tipo_celula = "data"
                elif isinstance(valor_base, str) and valor_base.startswith("#"):
                    tipo_celula = "erro"
                else:
                    tipo_celula = "texto"

                if tipo_celula != "vazio":
                    total_preenchidas += 1

                negrito = bool(cell_f.font and cell_f.font.bold)
                alinhamento = "right" if valor_numerico is not None else "left"
                if cell_f.alignment and cell_f.alignment.horizontal in (
                    "left",
                    "center",
                    "right",
                ):
                    alinhamento = cell_f.alignment.horizontal

                comentario_txt = ""
                if cell_f.comment and cell_f.comment.text:
                    comentario_txt = str(cell_f.comment.text).strip()

                info_mesclagem = mapa_mesclagem_inicio.get(
                    (r, c), {"rowSpan": 1, "colSpan": 1}
                )
                oculta_mesclagem = (r, c) in celulas_ocultas_mesclagem

                celula_dict: Dict[str, Any] = {
                    "coord": coord,
                    "linha": r,
                    "coluna": c,
                    "letraColuna": letra,
                    "valor": texto_exibicao,
                    "valorNumerico": valor_numerico,
                    "formula": formula_str,
                    "funcoes": funcoes_celula,
                    "tipo": tipo_celula,
                    "formatoNumero": str(fmt_num),
                    "negrito": negrito,
                    "alinhamento": alinhamento,
                    "comentario": comentario_txt,
                    "rowSpan": info_mesclagem["rowSpan"],
                    "colSpan": info_mesclagem["colSpan"],
                    "ocultaPorMesclagem": oculta_mesclagem,
                }
                linha_celulas.append(celula_dict)

                if eh_formula:
                    catalogo_formulas.append(
                        {
                            "aba": nome_aba,
                            "indiceAba": idx_aba,
                            "coord": coord,
                            "formula": formula_str,
                            "funcoes": funcoes_celula,
                            "valorCalculado": texto_exibicao,
                        }
                    )

            grade.append(linha_celulas)

        abas_processadas.append(
            {
                "nome": nome_aba,
                "indice": idx_aba,
                "estadoVisibilidade": getattr(ws_f, "sheet_state", "visible"),
                "totalLinhas": max_row_util,
                "totalColunas": max_col_util,
                "totalCelulasPreenchidas": total_preenchidas,
                "totalFormulas": total_formulas_aba,
                "totalMesclagens": len(lista_mesclagens_str),
                "letrasColunas": letras_colunas,
                "grade": grade,
            }
        )

    wb_formulas.close()
    wb_valores.close()

    primeira_aba = abas_processadas[0] if abas_processadas else None
    colunas_legado, linhas_legado = _gerar_formato_legado_de_grade(primeira_aba)

    return {
        "nomeArquivo": nome_documento or os.path.basename(caminho_fisico),
        "totalAbas": len(abas_processadas),
        "totalFormulasGlobal": len(catalogo_formulas),
        "funcoesUtilizadas": funcoes_utilizadas_set,
        "catalogoFormulas": catalogo_formulas,
        "abas": abas_processadas,
        "colunas": colunas_legado,
        "linhas": linhas_legado,
    }


def _ler_via_pandas_multiaba(
    caminho_fisico: str, nome_documento: str
) -> Dict[str, Any]:
    ext = os.path.splitext(caminho_fisico)[1].lower()
    abas_dict: Dict[str, pd.DataFrame] = {}

    if ext == ".csv":
        df_csv = pd.read_csv(caminho_fisico, sep=None, engine="python").fillna("")
        abas_dict["Planilha_CSV"] = df_csv
    else:
        try:
            lidos = pd.read_excel(caminho_fisico, sheet_name=None, header=None)
            for k, v in lidos.items():
                abas_dict[str(k)] = v.fillna("")
        except ValueError as e:
            if "engine" in str(e).lower() or "format" in str(e).lower():
                dfs_html = pd.read_html(caminho_fisico)
                for idx_h, df_h in enumerate(dfs_html):
                    abas_dict[f"Tabela_{idx_h + 1}"] = df_h.fillna("")
            else:
                raise e

    abas_processadas: List[Dict[str, Any]] = []
    for idx_aba, (nome_aba, df) in enumerate(abas_dict.items()):
        df_lim = df.iloc[:LIMITE_LINHAS_POR_ABA, :LIMITE_COLUNAS_POR_ABA]
        n_rows, n_cols = df_lim.shape
        n_rows = max(1, n_rows)
        n_cols = max(1, n_cols)
        letras_colunas = [get_column_letter(c) for c in range(1, n_cols + 1)]
        grade: List[List[Dict[str, Any]]] = []
        total_preenchidas = 0

        for r_idx in range(n_rows):
            linha_celulas: List[Dict[str, Any]] = []
            for c_idx in range(n_cols):
                r_num = r_idx + 1
                c_num = c_idx + 1
                letra = get_column_letter(c_num)
                coord = f"{letra}{r_num}"
                val = (
                    df_lim.iat[r_idx, c_idx]
                    if (r_idx < df_lim.shape[0] and c_idx < df_lim.shape[1])
                    else ""
                )
                val_num: Optional[float] = None
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    val_num = float(val)
                texto = _formatar_valor_celula(val)
                if texto != "":
                    total_preenchidas += 1

                linha_celulas.append(
                    {
                        "coord": coord,
                        "linha": r_num,
                        "coluna": c_num,
                        "letraColuna": letra,
                        "valor": texto,
                        "valorNumerico": val_num,
                        "formula": "",
                        "funcoes": [],
                        "tipo": (
                            "numero"
                            if val_num is not None
                            else ("vazio" if texto == "" else "texto")
                        ),
                        "formatoNumero": "General",
                        "negrito": r_num == 1,
                        "alinhamento": "right" if val_num is not None else "left",
                        "comentario": "",
                        "rowSpan": 1,
                        "colSpan": 1,
                        "ocultaPorMesclagem": False,
                    }
                )
            grade.append(linha_celulas)

        abas_processadas.append(
            {
                "nome": nome_aba,
                "indice": idx_aba,
                "estadoVisibilidade": "visible",
                "totalLinhas": n_rows,
                "totalColunas": n_cols,
                "totalCelulasPreenchidas": total_preenchidas,
                "totalFormulas": 0,
                "totalMesclagens": 0,
                "letrasColunas": letras_colunas,
                "grade": grade,
            }
        )

    primeira_aba = abas_processadas[0] if abas_processadas else None
    colunas_legado, linhas_legado = _gerar_formato_legado_de_grade(primeira_aba)

    return {
        "nomeArquivo": nome_documento or os.path.basename(caminho_fisico),
        "totalAbas": len(abas_processadas),
        "totalFormulasGlobal": 0,
        "funcoesUtilizadas": [],
        "catalogoFormulas": [],
        "abas": abas_processadas,
        "colunas": colunas_legado,
        "linhas": linhas_legado,
    }


def _gerar_formato_legado_de_grade(aba: Optional[Dict[str, Any]]):
    if not aba or not aba.get("grade"):
        return [], []
    grade = aba["grade"]
    primeira_linha = grade[0]
    colunas = [c["valor"] if c["valor"] else c["letraColuna"] for c in primeira_linha]
    linhas = []
    for row in grade[1:]:
        item = {}
        for idx, col_nome in enumerate(colunas):
            item[col_nome] = row[idx]["valor"] if idx < len(row) else ""
        linhas.append(item)
    return colunas, linhas


def gerar_planilha_demonstracao(nome_documento: str = "Planilha_Orcamento_Consolidado.xlsx") -> Dict[str, Any]:
    """
    Fallback rico para documentos de demonstração sem arquivo físico em disco,
    exibindo múltiplas abas, fórmulas (=SUM, =AVERAGE, =IF) e formatação.
    """
    def criar_cel(r: int, c: int, valor: str, val_num: Optional[float] = None, formula: str = "", negrito: bool = False, comentario: str = ""):
        letra = get_column_letter(c)
        funs = _extrair_funcoes_da_formula(formula)
        return {
            "coord": f"{letra}{r}",
            "linha": r,
            "coluna": c,
            "letraColuna": letra,
            "valor": valor,
            "valorNumerico": val_num,
            "formula": formula,
            "funcoes": funs,
            "tipo": "formula" if formula else ("numero" if val_num is not None else "texto"),
            "formatoNumero": "R$ #,##0.00" if val_num is not None else "General",
            "negrito": negrito,
            "alinhamento": "right" if val_num is not None else "left",
            "comentario": comentario,
            "rowSpan": 1,
            "colSpan": 1,
            "ocultaPorMesclagem": False,
        }

    aba1_grade = [
        [
            criar_cel(1, 1, "Código PCD", negrito=True),
            criar_cel(1, 2, "Núcleo / Rubrica de Preservação", negrito=True),
            criar_cel(1, 3, "Previsto (R$)", negrito=True),
            criar_cel(1, 4, "Executado (R$)", negrito=True),
            criar_cel(1, 5, "Saldo Disponível (R$)", negrito=True),
            criar_cel(1, 6, "Status Execução", negrito=True),
        ],
        [
            criar_cel(2, 1, "FIM.100.01.001"),
            criar_cel(2, 2, "Digitalização de Manuscritos José Américo"),
            criar_cel(2, 3, "R$ 85.000,00", 85000.0),
            criar_cel(2, 4, "R$ 82.400,00", 82400.0),
            criar_cel(2, 5, "R$ 2.600,00", 2600.0, "=C2-D2"),
            criar_cel(2, 6, "DENTRO DO TETO", None, '=IF(D2<=C2,"DENTRO DO TETO","ACIMA DO TETO")'),
        ],
        [
            criar_cel(3, 1, "FIM.200.01.001"),
            criar_cel(3, 2, "Restauro e Matrizes TIFF (Acervo Audiovisual)"),
            criar_cel(3, 3, "R$ 64.000,00", 64000.0),
            criar_cel(3, 4, "R$ 61.500,00", 61500.0),
            criar_cel(3, 5, "R$ 2.500,00", 2500.0, "=C3-D3"),
            criar_cel(3, 6, "DENTRO DO TETO", None, '=IF(D3<=C3,"DENTRO DO TETO","ACIMA DO TETO")'),
        ],
        [
            criar_cel(4, 1, "FIM.200.02.001"),
            criar_cel(4, 2, "Infraestrutura Repositório RDC-Arq (Archivematica)"),
            criar_cel(4, 3, "R$ 110.000,00", 110000.0),
            criar_cel(4, 4, "R$ 108.900,00", 108900.0),
            criar_cel(4, 5, "R$ 1.100,00", 1100.0, "=C4-D4"),
            criar_cel(4, 6, "DENTRO DO TETO", None, '=IF(D4<=C4,"DENTRO DO TETO","ACIMA DO TETO")'),
        ],
        [
            criar_cel(5, 1, "FIM.300.01.001"),
            criar_cel(5, 2, "Mapeamento do Patrimônio Arqueológico da PB"),
            criar_cel(5, 3, "R$ 52.000,00", 52000.0),
            criar_cel(5, 4, "R$ 49.200,00", 49200.0),
            criar_cel(5, 5, "R$ 2.800,00", 2800.0, "=C5-D5"),
            criar_cel(5, 6, "DENTRO DO TETO", None, '=IF(D5<=C5,"DENTRO DO TETO","ACIMA DO TETO")'),
        ],
        [
            criar_cel(6, 1, "TOTAL GERAL", negrito=True),
            criar_cel(6, 2, "Consolidação Anual FCJA", negrito=True),
            criar_cel(6, 3, "R$ 311.000,00", 311000.0, "=SUM(C2:C5)", negrito=True, comentario="Soma global do orçamento previsto"),
            criar_cel(6, 4, "R$ 302.000,00", 302000.0, "=SUM(D2:D5)", negrito=True),
            criar_cel(6, 5, "R$ 9.000,00", 9000.0, "=SUM(E2:E5)", negrito=True),
            criar_cel(6, 6, "MÉDIA: R$ 75.500,00", 75500.0, "=AVERAGE(D2:D5)", negrito=True),
        ],
    ]

    aba2_grade = [
        [
            criar_cel(1, 1, "Indicador de Meta Arquivística", negrito=True),
            criar_cel(1, 2, "1º Semestre", negrito=True),
            criar_cel(1, 3, "2º Semestre", negrito=True),
            criar_cel(1, 4, "Total Anual", negrito=True),
        ],
        [
            criar_cel(2, 1, "Documentos Capturados e Protocolados (NUP)"),
            criar_cel(2, 2, "420", 420.0),
            criar_cel(2, 3, "560", 560.0),
            criar_cel(2, 4, "980", 980.0, "=SUM(B2:C2)", negrito=True),
        ],
        [
            criar_cel(3, 1, "Auditorias de Fixidade SHA-256 (PREMIS)"),
            criar_cel(3, 2, "1.250", 1250.0),
            criar_cel(3, 3, "1.680", 1680.0),
            criar_cel(3, 4, "2.930", 2930.0, "=SUM(B3:C3)", negrito=True),
        ],
        [
            criar_cel(4, 1, "Pacotes SIP BagIt Recolhidos ao Archivematica"),
            criar_cel(4, 2, "18", 18.0),
            criar_cel(4, 3, "27", 27.0),
            criar_cel(4, 4, "45", 45.0, "=SUM(B4:C4)", negrito=True),
        ],
    ]

    abas = [
        {
            "nome": "1. Orçamento & Execução",
            "indice": 0,
            "estadoVisibilidade": "visible",
            "totalLinhas": 6,
            "totalColunas": 6,
            "totalCelulasPreenchidas": 36,
            "totalFormulas": 12,
            "totalMesclagens": 0,
            "letrasColunas": ["A", "B", "C", "D", "E", "F"],
            "grade": aba1_grade,
        },
        {
            "nome": "2. Metas Físicas & Acervo",
            "indice": 1,
            "estadoVisibilidade": "visible",
            "totalLinhas": 4,
            "totalColunas": 4,
            "totalCelulasPreenchidas": 16,
            "totalFormulas": 3,
            "totalMesclagens": 0,
            "letrasColunas": ["A", "B", "C", "D"],
            "grade": aba2_grade,
        },
    ]

    catalogo = []
    for a in abas:
        for row in a["grade"]:
            for cell in row:
                if cell["formula"]:
                    catalogo.append({
                        "aba": a["nome"],
                        "indiceAba": a["indice"],
                        "coord": cell["coord"],
                        "formula": cell["formula"],
                        "funcoes": cell["funcoes"],
                        "valorCalculado": cell["valor"],
                    })

    colunas_legado, linhas_legado = _gerar_formato_legado_de_grade(abas[0])

    return {
        "nomeArquivo": nome_documento,
        "totalAbas": len(abas),
        "totalFormulasGlobal": len(catalogo),
        "funcoesUtilizadas": ["SOMA (SUM)", "MÉDIA (AVERAGE)", "SE (IF)"],
        "catalogoFormulas": catalogo,
        "abas": abas,
        "colunas": colunas_legado,
        "linhas": linhas_legado,
    }
