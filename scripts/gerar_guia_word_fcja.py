"""
Gerador do Guia Oficial de Operação e Referência — SIGAD FCJA em formato Microsoft Word (.docx e .doc).
Cria um clone visual e estrutural do GUIA_COMPLETO_SIGAD_FCJA.pdf para permitir edição direta
no Microsoft Word / LibreOffice Writer e exportação futura para PDF sem depender do agente.
"""

import os
import docx
from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Mm, Pt, RGBColor


def _set_cell_background(cell, hex_color: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)


def _set_cell_margins(cell, top=100, bottom=100, left=140, right=140) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement("w:tcMar")
    for m_name, val in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        node = OxmlElement(f"w:{m_name}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tc_mar.append(node)
    tc_pr.append(tc_mar)


def _set_cell_borders(
    cell,
    top=None,
    bottom=None,
    left=None,
    right=None,
) -> None:
    """
    Configura bordas individuais de uma célula.
    Cada argumento deve ser uma tupla (val, sz, color), ex: ('single', '12', '2563EB').
    """
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement("w:tcBorders")
    for border_name, cfg in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        if cfg:
            b_val, b_sz, b_color = cfg
            b_el = OxmlElement(f"w:{border_name}")
            b_el.set(qn("w:val"), b_val)
            b_el.set(qn("w:sz"), str(b_sz))
            b_el.set(qn("w:space"), "0")
            b_el.set(qn("w:color"), b_color)
            tc_borders.append(b_el)
    tc_pr.append(tc_borders)


def _add_heading_h2(doc: Document, texto: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(texto)
    run.bold = True
    run.font.name = "Segoe UI"
    run.font.size = Pt(13.5)
    run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    # Borda inferior sutil simulando o border-bottom do PDF
    p_pr = p._p.get_or_add_pPr()
    p_bdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="CBD5E1"/></w:pBdr>'
    )
    p_pr.append(p_bdr)


def _add_heading_h3(doc: Document, texto: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(texto)
    run.bold = True
    run.font.name = "Segoe UI"
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)


def _add_bullet(doc: Document, prefixo_negrito: str, texto_resto: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    if prefixo_negrito:
        r_bold = p.add_run(prefixo_negrito)
        r_bold.bold = True
        r_bold.font.name = "Segoe UI"
        r_bold.font.size = Pt(9.5)
        r_bold.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r_txt = p.add_run(texto_resto)
    r_txt.font.name = "Segoe UI"
    r_txt.font.size = Pt(9.5)
    r_txt.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)


def _add_styled_table(
    doc: Document,
    headers: list[str],
    rows: list[list[str]],
    col_widths_mm: list[float] | None = None,
) -> None:
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Cabeçalho escuro (#0F172A)
    hdr_cells = table.rows[0].cells
    for idx, h_text in enumerate(headers):
        cell = hdr_cells[idx]
        if col_widths_mm and idx < len(col_widths_mm):
            cell.width = Mm(col_widths_mm[idx])
        _set_cell_background(cell, "0F172A")
        _set_cell_margins(cell, top=80, bottom=80, left=110, right=110)
        _set_cell_borders(
            cell,
            top=("single", "6", "0F172A"),
            bottom=("single", "6", "0F172A"),
            left=("single", "6", "0F172A"),
            right=("single", "6", "0F172A"),
        )
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(h_text)
        r.bold = True
        r.font.name = "Segoe UI"
        r.font.size = Pt(8.8)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Linhas de dados com zebra (#FFFFFF / #F8FAFC)
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        bg_hex = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row_cells[c_idx]
            if col_widths_mm and c_idx < len(col_widths_mm):
                cell.width = Mm(col_widths_mm[c_idx])
            _set_cell_background(cell, bg_hex)
            _set_cell_margins(cell, top=75, bottom=75, left=110, right=110)
            _set_cell_borders(
                cell,
                top=("single", "4", "CBD5E1"),
                bottom=("single", "4", "CBD5E1"),
                left=("single", "4", "CBD5E1"),
                right=("single", "4", "CBD5E1"),
            )
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            # Se for a 1ª coluna, destaca em negrito
            r = p.add_run(val)
            r.font.name = "Segoe UI"
            r.font.size = Pt(8.5)
            if c_idx == 0:
                r.bold = True
                r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            else:
                r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)


def construir_guia_docx(caminho_saida_docx: str) -> None:
    doc = Document()

    # Configuração de Página A4 com margens de 14mm (idêntico ao PDF)
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Mm(14)
    section.bottom_margin = Mm(14)
    section.left_margin = Mm(14)
    section.right_margin = Mm(14)

    # Estilo base Normal
    style_normal = doc.styles["Normal"]
    style_normal.font.name = "Segoe UI"
    style_normal.font.size = Pt(9.5)
    style_normal.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    # =========================================================================
    # 1. CAPA INSTITUCIONAL (BANNER AZUL MARINHO #0F172A COM BORDA #3B82F6)
    # =========================================================================
    tbl_capa = doc.add_table(rows=1, cols=1)
    tbl_capa.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_capa = tbl_capa.cell(0, 0)
    c_capa.width = Mm(182)
    _set_cell_background(c_capa, "0F172A")
    _set_cell_margins(c_capa, top=220, bottom=220, left=260, right=260)
    _set_cell_borders(
        c_capa,
        top=("single", "12", "1E3A8A"),
        left=("single", "12", "1E3A8A"),
        right=("single", "12", "1E3A8A"),
        bottom=("single", "36", "3B82F6"),
    )

    p_top = c_capa.paragraphs[0]
    p_top.paragraph_format.space_after = Pt(6)
    r_sigla = p_top.add_run(
        "FUNDAÇÃO CASA DE JOSÉ AMÉRICO (FCJA) · PARAÍBA          |          Código CONARQ: BR-PBFCJA-RADC · Versão Atualizada 2.5"
    )
    r_sigla.bold = True
    r_sigla.font.name = "Segoe UI"
    r_sigla.font.size = Pt(8.5)
    r_sigla.font.color.rgb = RGBColor(0x93, 0xC5, 0xFD)

    p_title = c_capa.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("Guia Oficial de Operação e Referência — SIGAD FCJA")
    r_title.bold = True
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    p_sub = c_capa.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(8)
    r_sub = p_sub.add_run(
        "Sistema Informatizado de Gestão Arquivística de Documentos, Visualizador Multi-Abas, Docker Compose & Conector Archivematica 1.18.0"
    )
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(9.5)
    r_sub.font.color.rgb = RGBColor(0xCB, 0xD5, 0xE1)

    p_meta = c_capa.add_paragraph()
    p_meta.paragraph_format.space_after = Pt(0)
    r_meta = p_meta.add_run(
        "Acesso Principal: http://[IP-DO-SERVIDOR-LOCAL]:8085    |    Alternativo / Dev: http://192.168.1.115 (ou localhost:8080)    |    Archivematica 1.18.0: http://192.168.1.132 (:80 / :8000)"
    )
    r_meta.bold = True
    r_meta.font.name = "Consolas"
    r_meta.font.size = Pt(8.5)
    r_meta.font.color.rgb = RGBColor(0xE2, 0xE8, 0xF0)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # =========================================================================
    # 2. QUADRO EDITÁVEL DE ENDEREÇOS DE ACESSO AO SERVIDOR LOCAL DA FCJA
    # =========================================================================
    tbl_edit = doc.add_table(rows=3, cols=2)
    tbl_edit.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Mescla a primeira linha para o título e explicação do quadro editável
    cell_header_edit = tbl_edit.cell(0, 0).merge(tbl_edit.cell(0, 1))
    _set_cell_background(cell_header_edit, "EFF6FF")
    _set_cell_margins(cell_header_edit, top=120, bottom=100, left=160, right=160)
    _set_cell_borders(
        cell_header_edit,
        top=("dashed", "12", "2563EB"),
        left=("dashed", "12", "2563EB"),
        right=("dashed", "12", "2563EB"),
        bottom=("single", "6", "93C5FD"),
    )
    p_eh = cell_header_edit.paragraphs[0]
    p_eh.paragraph_format.space_after = Pt(3)
    r_eh1 = p_eh.add_run(
        "QUADRO DE ENDEREÇOS DE ACESSO AO SERVIDOR LOCAL DA FCJA (ESPAÇO EDITÁVEL NO WORD)"
    )
    r_eh1.bold = True
    r_eh1.font.size = Pt(9.5)
    r_eh1.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_eh_desc = cell_header_edit.add_paragraph()
    p_eh_desc.paragraph_format.space_after = Pt(0)
    r_eh2 = p_eh_desc.add_run(
        "Quando o sistema for hospedado definitivamente no servidor local da Fundação Casa de José Américo (via Docker Compose), "
        "basta clicar nos 4 campos abaixo neste arquivo Word (.docx), digitar o novo endereço IP e salvar como PDF (Arquivo -> Salvar como -> PDF):"
    )
    r_eh2.font.size = Pt(8.5)
    r_eh2.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    caixas_editaveis = [
        (
            1,
            0,
            "1. ENDEREÇO PRINCIPAL DO SIGAD FCJA (URL / IP):",
            "http://[IP-DO-SERVIDOR-LOCAL]:8085",
        ),
        (
            1,
            1,
            "2. ENDEREÇO ALTERNATIVO / AMBIENTE LOCAL:",
            "http://192.168.1.115 (ou http://localhost:8080)",
        ),
        (
            2,
            0,
            "3. STATUS ATUAL DA HOSPEDAGEM / SERVIDOR:",
            "Aguardando implantação local (Docker Compose)",
        ),
        (
            2,
            1,
            "4. SERVIDORES RDC-ARQ INTEGRADOS (AM / SS / ATOM):",
            "AM: http://192.168.1.132 | SS: :8000 | AtoM: http://192.168.1.110",
        ),
    ]
    for r_i, c_i, rotulo_caixa, valor_caixa in caixas_editaveis:
        c_box = tbl_edit.cell(r_i, c_i)
        c_box.width = Mm(91)
        _set_cell_background(c_box, "FFFFFF")
        _set_cell_margins(c_box, top=90, bottom=90, left=140, right=140)
        _set_cell_borders(
            c_box,
            top=("single", "8", "93C5FD"),
            bottom=("dashed" if r_i == 2 else "single", "12" if r_i == 2 else "8", "2563EB" if r_i == 2 else "93C5FD"),
            left=("dashed" if c_i == 0 else "single", "12" if c_i == 0 else "8", "2563EB" if c_i == 0 else "93C5FD"),
            right=("dashed" if c_i == 1 else "single", "12" if c_i == 1 else "8", "2563EB" if c_i == 1 else "93C5FD"),
        )
        p_lbl = c_box.paragraphs[0]
        p_lbl.paragraph_format.space_after = Pt(2)
        r_lbl = p_lbl.add_run(rotulo_caixa)
        r_lbl.bold = True
        r_lbl.font.size = Pt(7.5)
        r_lbl.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

        p_val = c_box.add_paragraph()
        p_val.paragraph_format.space_after = Pt(0)
        r_val = p_val.add_run(valor_caixa)
        r_val.bold = True
        r_val.font.name = "Consolas"
        r_val.font.size = Pt(9.5)
        r_val.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # =========================================================================
    # 3. SUMÁRIO GERAL DO GUIA ATUALIZADO
    # =========================================================================
    tbl_sum = doc.add_table(rows=1, cols=2)
    tbl_sum.alignment = WD_TABLE_ALIGNMENT.CENTER
    sum_esq = [
        "1. Apresentação Institucional e Novidades da Versão",
        "2. O Ecossistema Digital (SIGAD -> Archivematica 1.18 -> AtoM)",
        "3. Acesso, Credenciais e Perfis de Permissão (RBAC Atualizado)",
        "4. Dicionário Completo: O Que Cada Termo e Campo Significa",
        "5.1. Aba 1 — Novo Dashboard Analítico do SIGAD",
        "5.2. Aba 2 — Novo Explorador Arquivístico Multinível (4 Visões)",
        "5.3. Aba 3 — Nova Estação de Captura & Indexação Arquivística",
    ]
    sum_dir = [
        "5.4. Aba 4 — PCD, TTD & Dossiês (Incluindo Exclusão de Dossiê)",
        "5.5. Aba 5 — Conector Archivematica 1.18.0 & Storage Service (:8000)",
        "5.6. Aba 6 — Auditoria & Fixidade (Governança e Termos)",
        "5.7. Aba 7 — Gerenciar Acessos (Administração RBAC)",
        "6. Visualizador Avançado de Planilhas Multi-Abas e Ficha PREMIS",
        "7. Tabelas Institucionais (16 Núcleos e Classes de Atividade-Fim)",
        "8. Implantação via Docker Compose no Servidor Local & Edição",
    ]
    for col_i, lista_s in enumerate((sum_esq, sum_dir)):
        c_s = tbl_sum.cell(0, col_i)
        c_s.width = Mm(91)
        _set_cell_background(c_s, "F8FAFC")
        _set_cell_margins(c_s, top=100, bottom=100, left=140, right=140)
        _set_cell_borders(
            c_s,
            top=("single", "6", "E2E8F0"),
            bottom=("single", "6", "E2E8F0"),
            left=("single", "6", "E2E8F0"),
            right=("single", "6", "E2E8F0"),
        )
        p0 = c_s.paragraphs[0]
        p0.paragraph_format.space_after = Pt(4)
        r0 = p0.add_run(
            "Sumário Geral do Guia Atualizado" if col_i == 0 else "Módulos Operacionais e Anexos"
        )
        r0.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        for item_txt in lista_s:
            pi = c_s.add_paragraph()
            pi.paragraph_format.space_after = Pt(2)
            ri = pi.add_run(item_txt)
            ri.font.size = Pt(8.5)
            ri.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # =========================================================================
    # SEÇÃO 1
    # =========================================================================
    _add_heading_h2(doc, "1. Apresentação Institucional e Visão Geral do Sistema")
    p_s1 = doc.add_paragraph(
        "O SIGAD FCJA é o Sistema Informatizado de Gestão Arquivística de Documentos da Fundação Casa de José Américo. "
        "Projetado em estrita conformidade com os requisitos do CONARQ, da norma ISO 14721 (OAIS) e da Resolução CONARQ nº 51/2023 (RDC-Arq), "
        "o sistema controla todo o ciclo vital dos documentos arquivísticos digitais:"
    )
    p_s1.paragraph_format.space_after = Pt(5)

    _add_bullet(
        doc,
        "Autenticidade e Fixidade Criptográfica (PREMIS): ",
        "Cada arquivo capturado recebe um Número Único de Protocolo (NUP) e tem seu resumo criptográfico Hash SHA-256 calculado e auditado continuamente.",
    )
    _add_bullet(
        doc,
        "Relação Orgânica (Dossiês e Processos) e Respeito ao Documento Avulso: ",
        "Agrupamento lógico de documentos em Unidades de Arquivamento numeradas, mantendo documentos marcados como 'Avulso' 100% independentes e permitindo excluir dossiês criados por engano sem apagar os documentos do acervo.",
    )
    _add_bullet(
        doc,
        "Classificação e Temporalidade Automática (PCD/TTD): ",
        "Integra o Plano de Classificação de Atividades-Meio (PCDM/APEPB) com busca rápida instantânea por código/assunto e o Plano de Classificação de Atividades-Fim da FCJA (Guarda Permanente automática).",
    )
    _add_bullet(
        doc,
        "Visualizador Avançado de Planilhas Multi-Abas: ",
        "Leitura completa de arquivos Excel (.xlsx) e .csv com navegação entre todas as abas/guias, inspeção de fórmulas (=SOMA, =PROCV) e preservação das cores originais das células.",
    )
    _add_bullet(
        doc,
        "Integração Homologada com o Archivematica 1.18.0 (192.168.1.132) e Storage Service (:8000): ",
        "Geração nativa de pacotes Standard Transfer com objects/, metadata/metadata.csv (15 elementos Dublin Core + qualificadores + campos FCJA), metadata/rights.csv (18 colunas PREMIS Rights / LAI), metadata/premis.xml (PREMIS v3 XML) e validação prévia no FPR (1.639 formatos PRONOM).",
    )

    # =========================================================================
    # SEÇÃO 2
    # =========================================================================
    _add_heading_h2(doc, "2. O Ecossistema Digital da Fundação (SIGAD -> Archivematica 1.18.0 -> AtoM)")
    tbl_oais = doc.add_table(rows=1, cols=3)
    tbl_oais.alignment = WD_TABLE_ALIGNMENT.CENTER
    cards_oais = [
        (
            "1. SIGAD FCJA (Porta 8085)",
            "Captura, Protocolo NUP, Busca Rápida PCD/TTD, Dossiês, Fixidade SHA-256 e empacotamento Standard Transfer (metadata.csv + rights.csv + premis.xml).",
            "EFF6FF",
            "2563EB",
        ),
        (
            "2. Archivematica 1.18.0 (192.168.1.132 :80 / :8000)",
            "Valida rights.csv, identifica PUID PRONOM (Siegfried), normaliza para preservação (PDF/A, ODS, TIFF) e consolida o Pacote AIP no Storage Service.",
            "ECFDF5",
            "059669",
        ),
        (
            "3. AtoM (192.168.1.110)",
            "Portal de descrição arquivística multinível (NOBRADE/ISAD-G) e difusão pública para consulta aos pacotes derivados DIP.",
            "F5F3FF",
            "7C3AED",
        ),
    ]
    for idx, (t_card, d_card, bg_c, top_c) in enumerate(cards_oais):
        cell = tbl_oais.cell(0, idx)
        cell.width = Mm(60.6)
        _set_cell_background(cell, bg_c)
        _set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        _set_cell_borders(
            cell,
            top=("single", "24", top_c),
            bottom=("single", "6", "CBD5E1"),
            left=("single", "6", "CBD5E1"),
            right=("single", "6", "CBD5E1"),
        )
        p1 = cell.paragraphs[0]
        p1.paragraph_format.space_after = Pt(3)
        r1 = p1.add_run(t_card)
        r1.bold = True
        r1.font.size = Pt(9)
        r1.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(d_card)
        r2.font.size = Pt(8.3)
        r2.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # =========================================================================
    # SEÇÃO 3
    # =========================================================================
    _add_heading_h2(doc, "3. Acesso ao Sistema, Credenciais e Perfis de Permissão (RBAC Atualizado)")
    _add_heading_h3(doc, "3.1. Os 3 Perfis de Permissão do Sistema (Governança RBAC)")

    _add_styled_table(
        doc,
        headers=["Perfil no Sistema", "Quem Utiliza", "Telas e Ações Liberadas", "Proteção e Restrições"],
        rows=[
            [
                "Pesquisador FCJA (pesquisador)",
                "Pesquisadores, bolsistas e consulentes internos dos núcleos",
                "Acesso focado e exclusivo a 2 telas:\n• 1. Dashboard Analítico (estatísticas, gráficos e indicadores do acervo);\n• 2. Explorador do Acervo (navegação multinível nas 4 visões, visualização de PDFs e Planilhas Multi-Abas, download, verificação de fixidade SHA-256 e exportação de Planilha CSV e Relatório PDF).",
                "Proteção de Integridade: Não acessa as abas de Captura/Upload, Gestão de Dossiês/TTD, Conector Archivematica, Auditoria ou Gerenciamento de Acessos, e não pode excluir documentos.",
            ],
            [
                "Arquivista SIGAD (arquivista)",
                "Arquivistas, coordenadores de acervo e comissão de avaliação (CPAD)",
                "Acesso operacional a 6 telas:\n• Dashboard Analítico e Explorador do Acervo;\n• Captura & Acervo (upload em lote, edição de metadados e baixa controlada);\n• PCD, TTD & Dossiês (abertura, juntada, desentranhamento e exclusão de dossiês + gestão de classes PCD/TTD);\n• Conector Archivematica (geração de pacotes SIP, descoberta de Transfer Source e homologação de AIPs);\n• Auditoria & Fixidade (varredura SHA-256 em lote e emissão de Termos de Eliminação).",
                "Não gerencia o cadastro de contas de usuários e senhas (exclusivo do Administrador Geral).",
            ],
            [
                "Administrador Geral (admin)",
                "Coordenação de TI e Administração Geral do Repositório",
                "Acesso Total e Irrestrito às 7 telas do sistema, incluindo a aba exclusiva Gerenciar Acessos (cadastro de novos agentes, redefinição de senhas PBKDF2-SHA256 e atribuição de perfis RBAC).",
                "Nenhuma restrição no sistema.",
            ],
        ],
        col_widths_mm=[34, 36, 68, 44],
    )

    _add_heading_h3(doc, "3.2. Credenciais Iniciais Cadastradas")
    _add_styled_table(
        doc,
        headers=["Membro da Equipe", "Usuário (Login)", "Senha Inicial", "Perfil Inicial", "Escopo de Acesso Inicial"],
        rows=[
            ["Antonio", "antonio", "1980", "Administrador Geral (admin)", "Todas as 7 telas do sistema"],
            ["Arquivista FCJA", "arquivista", "1980", "Arquivista SIGAD (arquivista)", "Dashboard, Explorador, Captura, Dossiês/TTD, Archivematica e Auditoria"],
            ["Bárbara", "barbara", "1980", "Pesquisador FCJA (pesquisador)", "Dashboard Analítico e Explorador do Acervo"],
            ["André", "andre", "1980", "Pesquisador FCJA (pesquisador)", "Dashboard Analítico e Explorador do Acervo"],
            ["Pablo", "pablo", "1980", "Pesquisador FCJA (pesquisador)", "Dashboard Analítico e Explorador do Acervo"],
            ["Josilene", "josilene", "1980", "Pesquisador FCJA (pesquisador)", "Dashboard Analítico e Explorador do Acervo"],
        ],
        col_widths_mm=[32, 28, 22, 42, 58],
    )

    # =========================================================================
    # SEÇÃO 4
    # =========================================================================
    _add_heading_h2(doc, "4. Dicionário Rápido: O Que Cada Termo e Campo Significa")
    _add_bullet(
        doc,
        "Protocolo SIGAD (NUP): ",
        "Número Único de Protocolo gerado automaticamente na captura no formato FCJA.<SIGLA_CURTA>.<ANO>.<SEQUENCIAL> (ex.: FCJA.NMJAA.2026.00001).",
    )
    _add_bullet(
        doc,
        "Sigla NOBRADE: ",
        "Identificador normativo do fundo e núcleo produtor na Fundação (ex.: BR_PB_FCJA_GEDA_GOP_PPMD_NMJAA), preenchido automaticamente ao selecionar o Núcleo.",
    )
    _add_bullet(
        doc,
        "Status Diplomático (Original, Minuta, Cópia): ",
        "Define a maturidade do documento. Documentos marcados como Original possuem bloqueio de imutabilidade e só podem ser baixados mediante Termo de Eliminação oficial emitido por Arquivista ou Administrador.",
    )
    _add_bullet(
        doc,
        "Nível de Acesso (Ostensivo, Restrito LGPD, Sigiloso LAI): ",
        "Define as permissões de difusão pública e preenche automaticamente a tabela metadata/rights.csv (18 colunas PREMIS Rights) enviada ao Archivematica.",
    )
    _add_bullet(
        doc,
        "Unidade de Arquivamento (Dossiê ou Processo) vs. Documento Avulso: ",
        "O Dossiê é uma pasta oficial numerada (ex.: DOSSIE.FCJA.NMJAA.2026.0001) que agrupa vários documentos de uma mesma pesquisa mantendo o Vínculo Orgânico. Já o Documento Avulso permanece independente até que o arquivista decida juntá-lo a um dossiê.",
    )

    # =========================================================================
    # SEÇÃO 5
    # =========================================================================
    _add_heading_h2(doc, "5. Guia Detalhado Tela por Tela (As 7 Abas do Sistema)")

    _add_heading_h3(doc, "5.1. Aba 1 — Dashboard Analítico (Atualizado)")
    _add_bullet(
        doc,
        "Indicadores de Topo: ",
        "Total de documentos no acervo, volume de armazenamento e espaço livre no servidor, percentual de Fixidade SHA-256 Íntegra (PREMIS) e documentos destinados à Guarda Permanente (RDC-Arq).",
    )
    _add_bullet(
        doc,
        "Monitoramento do Ciclo Vital e OAIS: ",
        "Exibe a distribuição entre documentos em Fase Corrente, Fase Intermediária, Guarda Permanente e pacotes SIP/AIP recolhidos ao Archivematica.",
    )
    _add_bullet(
        doc,
        "Gráficos e Filtros Avançados: ",
        "Distribuição por Núcleo Produtor, Série Histórica por Ano e Ranking de Tipologias Documentais, com suporte a filtros combinados.",
    )

    _add_heading_h3(doc, "5.2. Aba 2 — Explorador Arquivístico do Acervo (4 Visões Multinível + Relatório PDF)")
    _add_bullet(
        doc,
        "1. Por Núcleo Produtor (Fundo): ",
        "Organiza o acervo pelos 16 Núcleos de Pesquisa da FCJA (Fundo/Subfundo NOBRADE).",
    )
    _add_bullet(
        doc,
        "2. Por Plano de Classificação (PCD & TTD): ",
        "Agrupa os documentos pelas classes de Atividade-Fim (FCJA) e Atividade-Meio (APEPB), permitindo inspecionar cada série documental.",
    )
    _add_bullet(
        doc,
        "3. Por Dossiês & Processos (Unidades): ",
        "Exibe as pastas de dossiês abertos/encerrados e os documentos avulsos.",
    )
    _add_bullet(
        doc,
        "4. Por Ciclo Vital, OAIS & Sigilo: ",
        "Agrupa o acervo por Fase Arquivística (Corrente, Intermediária, Permanente), Status de Recolhimento ao Archivematica e Nível de Acesso (Ostensivo, Restrito LGPD, Sigiloso LAI).",
    )
    _add_bullet(
        doc,
        "Painel Inspetor Lateral ('Diagnóstico do Nível Atual'): ",
        "Exibe a contagem de pastas, documentos, volume em MB e os botões de exportação imediata do escopo selecionado em Planilha CSV e Relatório PDF institucional nativo.",
    )

    _add_heading_h3(doc, "5.3. Aba 3 — Estação de Captura & Indexação Arquivística (Nova Interface)")
    _add_bullet(
        doc,
        "4 Cartões de Indicadores em Tempo Real (Topo): ",
        "Fila de Captura Atual, Padrão de Protocolo NUP previsto (FCJA.<SIGLA>.<ANO>.XXXX), Regime TTD Selecionado e Total no Acervo SIGAD.",
    )
    _add_bullet(
        doc,
        "Zona de Depósito Adaptativa: ",
        "Quando a fila está vazia, exibe a área ampla de Drag & Drop. Assim que você seleciona os arquivos, ela se compacta em uma barra superior com o botão '+ Adicionar Mais Arquivos'.",
    )
    _add_bullet(
        doc,
        "Passo 1 — Fila de Componentes Digitais: ",
        "Cada arquivo exibe o badge colorido do formato (PDF, XLSX, DOCX, TIFF), campo com ícone de lápis para editar o título do documento diretamente na linha e etiquetas resumindo os metadados atribuídos.",
    )
    _add_bullet(
        doc,
        "Passo 2 — Metadados de Captura em Lote (3 Blocos Lógicos): ",
        "Bloco A (Cronologia & Proveniência NOBRADE), Bloco B (Autoria, Status Diplomático, Direitos de Acesso LAI/LGPD & Juntada em Dossiê ou Documento Avulso) e Bloco C (Classificação Arquivística PCD & Natureza da Atividade com Busca Rápida Inteligente por código ou assunto).",
    )

    _add_heading_h3(doc, "5.4. Aba 4 — PCD, TTD & Dossiês (Guia Simples das 3 Sub-Abas + Exclusão de Dossiê)")
    _add_styled_table(
        doc,
        headers=["Sub-Aba na Tela", "O Que É (Em Linguagem Simples)", "O Que o Arquivista Faz Aqui"],
        rows=[
            [
                "1. Dossiês & Processos — Relação Orgânica",
                "É a 'Pasta Oficial' (Unidade de Arquivamento) que reúne todos os documentos de uma mesma pesquisa, projeto ou processo administrativo em ordem cronológica (Peça #1, Peça #2...).",
                "• Abrir Novo Dossiê / Processo: cria uma pasta oficial numerada;\n• Juntar Documentos / Desvincular Peça (X): vincula documentos avulsos ao dossiê ou retira uma peça devolvendo-a para Documento Avulso;\n• Encerrar / Reabrir Dossiê: conclui o dossiê para recolhimento;\n• Excluir Dossiê: remove dossiês criados por engano (os documentos dentro dele NÃO são apagados e retornam para Documento Avulso).",
            ],
            [
                "2. Plano de Classificação (PCD) & Tabela de Temporalidade (TTD)",
                "É o 'Livro de Regras' da Fundação: lista todos os códigos de classificação (PCD) e define quantos anos cada documento fica na Fase Corrente, na Fase Intermediária e qual seu destino final.",
                "• Consulta os prazos de Atividade-Fim (FCJA) e Atividade-Meio (APEPB);\n• Cadastra novas classes clicando em '+ Nova Classe PCD/TTD';\n• Ativa ou inativa classes existentes.",
            ],
            [
                "3. Avaliação Temporal & Relação de Recolhimento",
                "É o 'Painel de Vencimento e Triagem Automática': o sistema soma o ano do documento com os prazos da TTD e separa automaticamente o acervo em duas listas.",
                "• Painel Verde (Esquerda): Lista os documentos de Guarda Permanente prontos para ir ao Archivematica;\n• Painel Âmbar (Direita): Lista os documentos administrativos de Guarda Temporária indicando o ano em que poderão ser eliminados.",
            ],
        ],
        col_widths_mm=[46, 62, 74],
    )

    _add_heading_h3(doc, "5.5. Aba 5 — Conector Automático Archivematica 1.18.0 & Storage Service (:8000)")
    _add_bullet(
        doc,
        "Sub-Aba 1 — Construtor de Pacote SIP (Standard Transfer): ",
        "Exibe o PUID PRONOM de cada documento e gera a estrutura oficial Standard Transfer (objects/, metadata/metadata.csv com 15 elementos Dublin Core + qualificadores + campos FCJA, metadata/rights.csv com 18 colunas PREMIS Rights / LAI, metadata/premis.xml em PREMIS v3 XML, mets_earq_manifest.xml e submissionDocumentation/).",
    )
    _add_bullet(
        doc,
        "Sub-Aba 2 — Fila de Transferências (8 Etapas + Inspetor CSV/XML): ",
        "Acompanha as 8 Etapas (Transfer Source :8000 -> Pacote Standard -> Validação rights.csv -> POST /v2beta/package -> Status Transfer -> Status Ingest -> Storage Service UPLOADED -> Vínculo Definitivo do AIP no SIGAD) e permite ler metadata.csv, rights.csv e premis.xml diretamente na tela.",
    )
    _add_bullet(
        doc,
        "Sub-Aba 3 — Política de Formatos FPR (1.639 PRONOM): ",
        "Catálogo completo das regras de normalização de preservação (AIP), acesso (DIP/AtoM) e validação (JHOVE, Siegfried, FFprobe) do servidor 192.168.1.132.",
    )
    _add_bullet(
        doc,
        "Sub-Aba 4 — Configuração Dual (:80 e :8000): ",
        "Configura as credenciais do Archivematica Dashboard (porta 80) e do Storage Service (porta 8000), incluindo o botão 'Descobrir Transfer Source (Etapa 1)' (GET /api/v2/location/?purpose=TS).",
    )

    _add_heading_h3(doc, "5.6. Aba 6 — Auditoria & Fixidade e Aba 7 — Gerenciar Acessos")
    _add_bullet(
        doc,
        "Auditoria & Fixidade: ",
        "Executa varredura 'Auditar Fixidade SHA-256 em Lote' sobre todos os arquivos físicos, exibe a Trilha Imutável de Eventos e imprime Termos de Eliminação oficiais com campos de assinatura para a CPAD.",
    )
    _add_bullet(
        doc,
        "Gerenciar Acessos (Exclusivo Admin): ",
        "Criação de usuários com senhas criptografadas em PBKDF2-HMAC-SHA256 e troca rápida de perfil entre Pesquisador, Arquivista SIGAD e Administrador.",
    )

    # =========================================================================
    # SEÇÃO 6
    # =========================================================================
    _add_heading_h2(doc, "6. Visualizador Avançado de Planilhas Multi-Abas (.xlsx / .csv)")
    _add_bullet(
        doc,
        "Navegação Completa entre Abas/Guias: ",
        "Exibe todas as abas da planilha tanto na barra superior quanto na barra inferior estilo Excel (com botões < e >, indicador da cor original da aba e dimensões linhas x colunas de cada guia).",
    )
    _add_bullet(
        doc,
        "Barra de Fórmulas (fx) e Inspeção de Funções: ",
        "Clique em qualquer célula para ver sua coordenada (ex.: C14), seu tipo de dado (FÓRMULA, NÚMERO, TEXTO), a fórmula original do Excel (ex.: =SOMA(C2:C13)) e o valor calculado.",
    )
    _add_bullet(
        doc,
        "Botões 'Exibir =Fórmulas' e 'Destacar fx': ",
        "Alternam a grade inteira entre os resultados calculados e as expressões matemáticas originais, destacando em roxo todas as células que possuem fórmulas.",
    )
    _add_bullet(
        doc,
        "Cores Originais e Estatísticas Automáticas: ",
        "Preserva as cores de preenchimento e fonte das células da planilha original e calcula automaticamente na barra inferior a Contagem, Soma, Média, Mínimo e Máximo da coluna selecionada.",
    )

    # =========================================================================
    # SEÇÃO 7
    # =========================================================================
    _add_heading_h2(doc, "7. Tabelas Institucionais (Os 16 Núcleos e Classes de Atividade-Fim)")
    _add_styled_table(
        doc,
        headers=["#", "Núcleo de Pesquisa da FCJA", "Sigla NOBRADE Automática", "Prefixo NUP"],
        rows=[
            ["1", "Manuscritos de José Américo de Almeida: identificação e descrição de documentos", "BR_PB_FCJA_GEDA_GOP_PPMD_NMJAA", "NMJAA"],
            ["2", "O modernismo na Paraíba a revista Era Nova e a Novela Reflexões de uma cabra", "BR_PB_FCJA_GEDA_GOP_PPMD_NRENN", "NRENN"],
            ["3", "A Paraíba e seus problemas: permanências e transformações", "BR_PB_FCJA_GEDA_GOP_PPMD_NPBP", "NPBP"],
            ["4", "Partituras de uma história pela democracia: as conexões artísticas e políticas entre José Siqueira e José Américo de Almeida", "BR_PB_FCJA_GEDA_GOP_PPMD_NJSJAA", "NJSJAA"],
            ["5", "Acervo audiovisual da FCJA: imagem e memória", "BR_PB_FCJA_GEDA_GOP_PPMD_NAFCJA", "NAFCJA"],
            ["6", "Os Modernismos na Paraíba e o Circuito de Comunicação da Revista Era Nova (1921-1926)", "BR_PB_FCJA_GEDA_GOP_PPMD_NMREN", "NMREN"],
            ["7", "De A Paraíba e seus problemas à A Bagaceira: Itinerários literários de José Américo de Almeida", "BR_PB_FCJA_GEDA_GOP_PPMD_NPBPB", "NPBPB"],
            ["8", "Maestro José Siqueira: Memórias da Música para o futuro", "BR_PB_FCJA_GEDA_GOP_PPMD_NMJS", "NMJS"],
            ["9", "1930 A caminho do centenário: convergências bibliográficas e fontes digitais (BR 1930)", "BR_PB_FCJA_GEDA_GOP_PPMD_NBR1930", "NBR1930"],
            ["10", "Modernização digital do acervo da Fundação Casa de José Américo: estruturando a preservação e o acesso", "BR_PB_FCJA_GEDA_GOP_PPMD_NMD", "NMD"],
            ["11", "Imprensa e cultura na Paraíba: os circuitos de comunicação das revistas Ilustração e Manaíra (1930-1940)", "BR_PB_FCJA_GEDA_GOP_PPMD_NRIM", "NRIM"],
            ["12", "Por uma cartografia dos lugares de consciência na Paraíba: trajetos do patrimônio cultural por meio da memória das violações de direitos humanos e da resistência", "BR_PB_FCJA_GEDA_GOP_PPMD_NCMR", "NCMR"],
            ["13", "Repositório Arquivístico Digital Confiável da produção do Projeto Preservação e Difusão do Acervo da FCJA", "BR_PB_FCJA_GEDA_GOP_PPMD_NRDCARQ", "NRDCARQ"],
            ["14", "Mapeamento do Patrimônio Arqueológico da Paraíba", "BR_PB_FCJA_GEDA_GOP_PPMD_NMAPB", "NMAPB"],
            ["15", "Entre Termos e Conceitos: Uma Pesquisa Documental sobre Educação Patrimonial", "BR_PB_FCJA_GEDA_GOP_PPMD_NEP", "NEP"],
            ["16", "Sustentabilidade e Diversidade: Pesquisa-ação na Mata da Falésia de Cabo Branco", "BR_PB_FCJA_GEDA_GOP_PPMD_NMFCB", "NMFCB"],
        ],
        col_widths_mm=[10, 96, 54, 22],
    )

    # =========================================================================
    # SEÇÃO 8
    # =========================================================================
    _add_heading_h2(doc, "8. Implantação via Docker Compose & Como Editar Este Guia e Gerar Novos PDFs")
    _add_bullet(
        doc,
        "1. Como iniciar o sistema no servidor local da Fundação (Docker Compose): ",
        "Na raiz do projeto, execute 'docker compose up -d --build' (ou dê duplo clique em scripts/windows/Iniciar_Docker_FCJA.bat no Windows / execute ./scripts/linux/iniciar_docker_fcja.sh no Linux). O sistema subirá os 4 containers integrados (MySQL 8.0, Backend FastAPI, Frontend React 19 e Gateway Nginx na porta 8085).",
    )
    _add_bullet(
        doc,
        "2. Como editar este documento no Word e gerar novos PDFs sem precisar do agente: ",
        "Abra este arquivo (docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.docx ou GUIA_COMPLETO_SIGAD_FCJA.doc) no Microsoft Word, LibreOffice Writer ou Google Docs, altere qualquer texto, tabela ou o Quadro de Endereços da Página 1 e clique em 'Arquivo -> Salvar como -> PDF' (ou 'Exportar para PDF').",
    )

    # Rodapé institucional
    p_foot = doc.add_paragraph()
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_foot.paragraph_format.space_before = Pt(14)
    r_foot = p_foot.add_run(
        "Fundação Casa de José Américo (FCJA) · Repositório Arquivístico Digital Confiável (BR-PBFCJA-RADC) · Guia Oficial de Operação SIGAD FCJA v2.5"
    )
    r_foot.font.size = Pt(8.5)
    r_foot.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    os.makedirs(os.path.dirname(os.path.abspath(caminho_saida_docx)), exist_ok=True)
    doc.save(caminho_saida_docx)


def construir_guia_doc_compativel(caminho_html: str, caminho_saida_doc: str) -> None:
    """
    Gera também uma versão .doc compatível com o Microsoft Word (Word HTML com diretivas
    de paginação Print Layout do Office) a partir do nosso GUIA_COMPLETO_SIGAD_FCJA.html,
    ocultando a barra superior de script para abrir pronto para edição e impressão no Word.
    """
    with open(caminho_html, "r", encoding="utf-8") as f:
        html = f.read()

    # Remove a barra de script não imprimível para que no Word apareça direto a Capa Institucional
    import re
    html_limpo = re.sub(
        r'<div class="painel-editor-nao-imprimivel">.*?</div>\s*<!-- CAPA INSTITUCIONAL -->',
        "<!-- CAPA INSTITUCIONAL -->",
        html,
        flags=re.DOTALL,
    )

    cabecalho_word_xml = """<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40" lang="pt-BR">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
"""
    html_word = html_limpo.replace('<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8" />', cabecalho_word_xml)

    with open(caminho_saida_doc, "w", encoding="utf-8") as f_out:
        f_out.write(html_word)


if __name__ == "__main__":
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pasta_manuais = os.path.join(raiz, "docs", "manuais")
    caminho_docx = os.path.join(pasta_manuais, "GUIA_COMPLETO_SIGAD_FCJA.docx")
    caminho_doc = os.path.join(pasta_manuais, "GUIA_COMPLETO_SIGAD_FCJA.doc")
    caminho_html = os.path.join(pasta_manuais, "GUIA_COMPLETO_SIGAD_FCJA.html")

    construir_guia_docx(caminho_docx)
    construir_guia_doc_compativel(caminho_html, caminho_doc)
    print(f"Arquivos gerados com sucesso:\n - {caminho_docx}\n - {caminho_doc}")
