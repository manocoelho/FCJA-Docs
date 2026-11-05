import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from models.pcd_ttd import ClassePcdModel
from models.documento import DocumentoModel
from services.auditoria_service import registrar_evento


# Catálogo inicial do Plano de Classificação (PCD) e Tabela de Temporalidade (TTD) da FCJA
# Inclui as Classes de Atividade-Fim da Fundação Casa de José Américo e principais Atividades-Meio
CLASSES_INICIAIS_FCJA = [
    # --- ATIVIDADES-FIM DA FUNDAÇÃO CASA DE JOSÉ AMÉRICO (GUARDA PERMANENTE / RDC-Arq) ---
    {
        "codigo": "FIM.100.01.001",
        "titulo": "Inventário, Identificação e Descrição de Manuscritos de José Américo de Almeida",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 100 — PESQUISA HISTÓRICA, LITERÁRIA E MEMÓRIA",
        "subfuncao": "SUBFUNÇÃO 100.01 — Acervo Pessoal e Literário de José Américo",
        "atividade": "100.01.01 - Identificação, Transcrição e Catalogação de Manuscritos",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 0,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Recolhimento imediato ao RDC-Arq (Archivematica) após conclusão da revisão.",
    },
    {
        "codigo": "FIM.100.02.001",
        "titulo": "Dossiê e Estudos Críticos sobre o Modernismo na Paraíba e Revista Era Nova",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 100 — PESQUISA HISTÓRICA, LITERÁRIA E MEMÓRIA",
        "subfuncao": "SUBFUNÇÃO 100.02 — Estudos Literários e Imprensa Paraibana",
        "atividade": "100.02.01 - Pesquisa Documental sobre Periódicos Históricos (1921-1940)",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 2,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Valor histórico-cultural permanente para o acervo da FCJA.",
    },
    {
        "codigo": "FIM.100.03.001",
        "titulo": "Partituras, Registros Sonoros e Memória Musical (Maestro José Siqueira)",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 100 — PESQUISA HISTÓRICA, LITERÁRIA E MEMÓRIA",
        "subfuncao": "SUBFUNÇÃO 100.03 — Patrimônio Musical e Artístico",
        "atividade": "100.03.01 - Catalogação e Preservação de Partituras e Conexões Políticas",
        "prazo_corrente_anos": 1,
        "prazo_intermediaria_anos": 0,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Recolhimento direto ao Archivematica com difusão no AtoM.",
    },
    {
        "codigo": "FIM.200.01.001",
        "titulo": "Matriz Digital, Fotografia e Acervo Audiovisual da FCJA (Imagem e Memória)",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 200 — PRESERVAÇÃO DIGITAL, ARQUIVO E MUSEOLOGIA",
        "subfuncao": "SUBFUNÇÃO 200.01 — Digitalização e Curadoria de Acervos",
        "atividade": "200.01.01 - Representação Digital em Alta Resolução (TIFF / PDF/A)",
        "prazo_corrente_anos": 1,
        "prazo_intermediaria_anos": 0,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Objeto digital primário para empacotamento SIP/AIP no Archivematica.",
    },
    {
        "codigo": "FIM.200.02.001",
        "titulo": "Especificação Técnica, Políticas de Preservação e Pacotes OAIS do RDC-Arq",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 200 — PRESERVAÇÃO DIGITAL, ARQUIVO E MUSEOLOGIA",
        "subfuncao": "SUBFUNÇÃO 200.02 — Repositório Arquivístico Digital Confiável (RDC-Arq)",
        "atividade": "200.02.01 - Gestão de Preservação Digital Sistêmica (SIGAD / Archivematica / AtoM)",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 3,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Documentação normativa e relatórios de auditoria do RDC-Arq da FCJA.",
    },
    {
        "codigo": "FIM.300.01.001",
        "titulo": "Mapeamento Arqueológico, Cartografia de Lugares de Memória e Educação Patrimonial",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 300 — PATRIMÔNIO CULTURAL, ARQUEOLOGIA E MEIO AMBIENTE",
        "subfuncao": "SUBFUNÇÃO 300.01 — Patrimônio Arqueológico, Direitos Humanos e Sustentabilidade",
        "atividade": "300.01.01 - Laudos, Cartografias e Relatórios de Campo na Paraíba",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 2,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Guarda permanente pelo valor probatório e científico.",
    },
    {
        "codigo": "FIM.300.02.001",
        "titulo": "Relatório Técnico de Pesquisa-Ação e Sustentabilidade (Mata da Falésia / Cabo Branco)",
        "tipo_atividade": "Atividade-Fim",
        "funcao": "FUNÇÃO FIM 300 — PATRIMÔNIO CULTURAL, ARQUEOLOGIA E MEIO AMBIENTE",
        "subfuncao": "SUBFUNÇÃO 300.02 — Estudos Socioambientais",
        "atividade": "300.02.01 - Monitoramento e Pesquisa-Ação Ambiental",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 3,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Recolhimento ao RDC-Arq após fase intermediária.",
    },
    # --- ATIVIDADES-MEIO (PCDM / APEPB - Guarda Permanente e Eliminação Controlada) ---
    {
        "codigo": "001.01.01.030",
        "titulo": "Portaria administrativa e Atos Normativos Internos",
        "tipo_atividade": "Atividade-Meio",
        "funcao": "FUNÇÃO 001 — GESTÃO ORGANIZACIONAL E NORMATIVA",
        "subfuncao": "SUBFUNÇÃO 001.01 — Regulamentação e Normatização",
        "atividade": "001.01.01 - Elaboração de Atos Normativos",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 5,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Ato normativo constitutivo; recolhimento permanente conforme TTD APEPB.",
    },
    {
        "codigo": "001.02.01.005",
        "titulo": "Relatório Anual de Gestão e Atividades Institucionais",
        "tipo_atividade": "Atividade-Meio",
        "funcao": "FUNÇÃO 001 — GESTÃO ORGANIZACIONAL E NORMATIVA",
        "subfuncao": "SUBFUNÇÃO 001.02 — Planejamento e Acompanhamento Institucional",
        "atividade": "001.02.01 - Prestação de Contas e Relatórios Gerenciais",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 3,
        "destinacao_final": "GUARDA_PERMANENTE",
        "observacoes_ttd": "Síntese anual das ações da Fundação; guarda permanente.",
    },
    {
        "codigo": "003.01.02.010",
        "titulo": "Planilha de Controle Orçamentário, Notas Fiscais e Comprovantes Auxiliares",
        "tipo_atividade": "Atividade-Meio",
        "funcao": "FUNÇÃO 003 — GESTÃO ORÇAMENTÁRIA, FINANCEIRA E CONTÁBIL",
        "subfuncao": "SUBFUNÇÃO 003.01 — Execução Financeira",
        "atividade": "003.01.02 - Liquidação e Controle de Despesas",
        "prazo_corrente_anos": 5,
        "prazo_intermediaria_anos": 5,
        "destinacao_final": "ELIMINACAO",
        "observacoes_ttd": "Eliminação após 10 anos (aprovação das contas pelo TCE), mediante Edital e Termo de Eliminação.",
    },
    {
        "codigo": "002.03.01.004",
        "titulo": "Formulário Cadastral, Frequência e Controle Administrativo Rotineiro",
        "tipo_atividade": "Atividade-Meio",
        "funcao": "FUNÇÃO 002 — GESTÃO DE PESSOAS E BOLSISTAS",
        "subfuncao": "SUBFUNÇÃO 002.03 — Administração de Pessoal",
        "atividade": "002.03.01 - Registros Operacionais de Bolsistas e Colaboradores",
        "prazo_corrente_anos": 2,
        "prazo_intermediaria_anos": 3,
        "destinacao_final": "ELIMINACAO",
        "observacoes_ttd": "Guarda temporária (5 anos); eliminação controlada após vigência do projeto.",
    },
]


def popular_classes_pcd_iniciais(db: Session) -> None:
    """
    Responsabilidade única: Semear as classes iniciais de Atividade-Fim da FCJA e
    Atividade-Meio (PCDM/TTD) caso a tabela 'classes_pcd' esteja vazia.
    """
    if db.query(ClassePcdModel).count() > 0:
        return

    agora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    for item in CLASSES_INICIAIS_FCJA:
        db.add(
            ClassePcdModel(
                id=str(uuid.uuid4()),
                codigo=item["codigo"],
                titulo=item["titulo"],
                tipo_atividade=item["tipo_atividade"],
                funcao=item["funcao"],
                subfuncao=item["subfuncao"],
                atividade=item["atividade"],
                prazo_corrente_anos=item["prazo_corrente_anos"],
                prazo_intermediaria_anos=item["prazo_intermediaria_anos"],
                destinacao_final=item["destinacao_final"],
                observacoes_ttd=item["observacoes_ttd"],
                ativa=1,
                criado_em=agora,
                criado_por="sistema (seed TTD FCJA)",
            )
        )
    db.commit()


def calcular_temporalidade_documento(
    db: Session,
    ano_producao: int,
    codigo_classificacao: str,
    tipo_atividade: str,
    categoria: str = "",
) -> dict:
    """
    Responsabilidade única: Calcular os prazos de guarda (Corrente e Intermediário),
    a Destinação Final prevista (Guarda Permanente vs. Eliminação) e a Fase Arquivística
    atual do documento com base na Tabela de Temporalidade (TTD).
    """
    ano_atual = datetime.now().year
    ano_base = ano_producao if (ano_producao and ano_producao > 1900) else ano_atual

    classe = None
    if codigo_classificacao:
        classe = (
            db.query(ClassePcdModel)
            .filter(ClassePcdModel.codigo == codigo_classificacao)
            .first()
        )

    if classe:
        prazo_corr = classe.prazo_corrente_anos
        prazo_inter = classe.prazo_intermediaria_anos
        destinacao = classe.destinacao_final
    elif (tipo_atividade or "").lower() == "atividade-fim":
        prazo_corr = 2
        prazo_inter = 0
        destinacao = "GUARDA_PERMANENTE"
    else:
        cat_lower = (categoria or "").lower()
        if any(k in cat_lower for k in ("relatório", "relatorio", "portaria", "ata", "dossiê", "estudo")):
            prazo_corr = 2
            prazo_inter = 3
            destinacao = "GUARDA_PERMANENTE"
        else:
            prazo_corr = 2
            prazo_inter = 3
            destinacao = "ELIMINACAO"

    ano_fim_corrente = ano_base + prazo_corr
    ano_destinacao_final = ano_fim_corrente + prazo_inter

    if ano_atual < ano_fim_corrente:
        fase = "CORRENTE"
    elif ano_atual < ano_destinacao_final:
        fase = "INTERMEDIARIA"
    else:
        fase = (
            "APTO_RECOLHIMENTO"
            if destinacao == "GUARDA_PERMANENTE"
            else "APTO_ELIMINACAO"
        )

    return {
        "prazo_corrente_anos": prazo_corr,
        "prazo_intermediaria_anos": prazo_inter,
        "ano_destinacao_final": ano_destinacao_final,
        "destinacao_prevista": destinacao,
        "fase_arquivistica": fase,
    }


def listar_classes_pcd(
    db: Session,
    tipo_atividade: Optional[str] = None,
    apenas_ativas: bool = False,
) -> list[dict]:
    query = db.query(ClassePcdModel)
    if tipo_atividade and tipo_atividade != "TODAS":
        query = query.filter(ClassePcdModel.tipo_atividade == tipo_atividade)
    if apenas_ativas:
        query = query.filter(ClassePcdModel.ativa == 1)

    classes = query.order_by(ClassePcdModel.codigo.asc()).all()
    return [
        {
            "id": c.id,
            "codigo": c.codigo,
            "titulo": c.titulo,
            "tipoAtividade": c.tipo_atividade,
            "funcao": c.funcao,
            "subfuncao": c.subfuncao,
            "atividade": c.atividade,
            "prazoCorrenteAnos": c.prazo_corrente_anos,
            "eventoCorrente": c.evento_corrente,
            "prazoIntermediariaAnos": c.prazo_intermediaria_anos,
            "eventoIntermediaria": c.evento_intermediaria,
            "destinacaoFinal": c.destinacao_final,
            "observacoesTtd": c.observacoes_ttd,
            "ativa": bool(c.ativa),
            "criadoEm": c.criado_em,
        }
        for c in classes
    ]


def criar_classe_pcd(
    db: Session,
    dados: dict,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> dict:
    agora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    nova = ClassePcdModel(
        id=str(uuid.uuid4()),
        codigo=dados["codigo"].strip(),
        titulo=dados["titulo"].strip(),
        tipo_atividade=dados.get("tipo_atividade") or "Atividade-Fim",
        funcao=dados.get("funcao") or "",
        subfuncao=dados.get("subfuncao") or "",
        atividade=dados.get("atividade") or "",
        prazo_corrente_anos=int(dados.get("prazo_corrente_anos", 2)),
        evento_corrente=dados.get("evento_corrente") or "Conclusão da ação",
        prazo_intermediaria_anos=int(dados.get("prazo_intermediaria_anos", 0)),
        evento_intermediaria=dados.get("evento_intermediaria") or "Cumprimento da fase corrente",
        destinacao_final=dados.get("destinacao_final") or "GUARDA_PERMANENTE",
        observacoes_ttd=dados.get("observacoes_ttd") or "",
        ativa=1,
        criado_em=agora,
        criado_por=usuario_responsavel,
    )
    db.add(nova)

    registrar_evento(
        db=db,
        categoria_evento="CLASSE",
        tipo_evento="CRIACAO_CLASSE_PCD_TTD",
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoClasse] Nova classe '{nova.codigo} - {nova.titulo}' ({nova.tipo_atividade}) "
            f"incluída no PCD/TTD: Corrente={nova.prazo_corrente_anos}a, "
            f"Intermediária={nova.prazo_intermediaria_anos}a, Destinação={nova.destinacao_final}."
        ),
    )
    db.commit()

    return {
        "id": nova.id,
        "codigo": nova.codigo,
        "titulo": nova.titulo,
        "tipoAtividade": nova.tipo_atividade,
        "destinacaoFinal": nova.destinacao_final,
        "ativa": True,
    }


def alternar_status_classe_pcd(
    db: Session,
    classe_id: str,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> Optional[dict]:
    classe = db.query(ClassePcdModel).filter(ClassePcdModel.id == classe_id).first()
    if not classe:
        return None

    classe.ativa = 0 if classe.ativa == 1 else 1
    acao = "ATIVACAO_CLASSE_PCD" if classe.ativa == 1 else "INATIVACAO_CLASSE_PCD"

    registrar_evento(
        db=db,
        categoria_evento="CLASSE",
        tipo_evento=acao,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoClasse] Classe '{classe.codigo} - {classe.titulo}' marcada como "
            f"{'ATIVA' if classe.ativa == 1 else 'INATIVA'} por {usuario_responsavel}."
        ),
    )
    db.commit()
    return {"id": classe.id, "codigo": classe.codigo, "ativa": bool(classe.ativa)}


def obter_avaliacao_temporal_acervo(db: Session) -> dict:
    """
    Responsabilidade única: Consolidar o diagnóstico de temporalidade e destinação (TTD)
    de todo o acervo para orientar a Relação de Recolhimento (Archivematica) e a Listagem de Eliminação.
    """
    docs = db.query(DocumentoModel).all()
    contagem_fases = {
        "CORRENTE": 0,
        "INTERMEDIARIA": 0,
        "APTO_RECOLHIMENTO": 0,
        "APTO_ELIMINACAO": 0,
    }
    contagem_destinacao = {
        "GUARDA_PERMANENTE": 0,
        "ELIMINACAO": 0,
    }

    aptos_recolhimento = []
    aptos_eliminacao = []

    for doc in docs:
        calc = calcular_temporalidade_documento(
            db=db,
            ano_producao=doc.ano or 2026,
            codigo_classificacao=doc.codigo_classificacao or "",
            tipo_atividade=doc.tipo_atividade or "Atividade-Meio",
            categoria=doc.categoria or "",
        )
        fase = calc["fase_arquivistica"]
        dest = calc["destinacao_prevista"]

        contagem_fases[fase] = contagem_fases.get(fase, 0) + 1
        contagem_destinacao[dest] = contagem_destinacao.get(dest, 0) + 1

        resumo_doc = {
            "id": doc.id,
            "numeroProtocolo": doc.numero_protocolo or "",
            "nome": doc.nome or "",
            "nucleo": doc.nucleo or "",
            "ano": doc.ano or 2026,
            "codigoClassificacao": doc.codigo_classificacao or "",
            "tipoAtividade": doc.tipo_atividade or "",
            "destinacaoPrevista": dest,
            "faseArquivistica": fase,
            "anoDestinacaoFinal": calc["ano_destinacao_final"],
            "codigoDossie": doc.codigo_dossie or "",
        }
        if dest == "GUARDA_PERMANENTE":
            aptos_recolhimento.append(resumo_doc)
        else:
            aptos_eliminacao.append(resumo_doc)

    return {
        "totalAvaliados": len(docs),
        "porFase": contagem_fases,
        "porDestinacao": contagem_destinacao,
        "relacaoGuardaPermanente": aptos_recolhimento,
        "listagemGuardaTemporaria": aptos_eliminacao,
    }
