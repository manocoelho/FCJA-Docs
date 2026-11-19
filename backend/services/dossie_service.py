import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from models.dossie import UnidadeArquivamentoModel
from models.documento import DocumentoModel
from services.protocolo_service import extrair_sigla_curta
from services.auditoria_service import registrar_evento


def gerar_codigo_dossie(db: Session, sigla_nucleo: str, nucleo: str, ano: int) -> str:
    """
    Responsabilidade única: Gerar o identificador único da Unidade de Arquivamento
    (Dossiê / Processo) no padrão: DOSSIE.FCJA.<SIGLA_CURTA>.<ANO>.<SEQ:04d>.
    """
    sigla_curta = extrair_sigla_curta(sigla_nucleo, nucleo)
    ano_valido = ano if (ano and ano > 1900) else datetime.now().year
    prefixo = f"DOSSIE.FCJA.{sigla_curta}.{ano_valido}."

    existentes = (
        db.query(UnidadeArquivamentoModel.codigo_dossie)
        .filter(UnidadeArquivamentoModel.codigo_dossie.like(f"{prefixo}%"))
        .all()
    )
    maior = 0
    for (cod,) in existentes:
        if cod and cod.startswith(prefixo):
            sufixo = cod[len(prefixo) :]
            if sufixo.isdigit():
                maior = max(maior, int(sufixo))
    return f"{prefixo}{maior + 1:04d}"


def popular_dossies_iniciais(db: Session) -> None:
    """
    Responsabilidade única: Preservar o estado das Unidades de Arquivamento (Dossiês)
    sem criar dossiês automáticos para documentos avulsos e sem vincular documentos
    sem ação explícita do arquivista.
    """
    return None


def listar_dossies(db: Session) -> list[dict]:
    """
    Responsabilidade única: Listar todas as Unidades de Arquivamento (Dossiês / Processos)
    com a contagem e relação orgânica dos documentos vinculados.
    """
    dossies = (
        db.query(UnidadeArquivamentoModel)
        .order_by(UnidadeArquivamentoModel.codigo_dossie.asc())
        .all()
    )
    todos_docs = db.query(DocumentoModel).all()

    docs_por_dossie: dict[str, list[DocumentoModel]] = {}
    for doc in todos_docs:
        if doc.dossie_id:
            docs_por_dossie.setdefault(doc.dossie_id, []).append(doc)

    resultado = []
    for d in dossies:
        vinculados = docs_por_dossie.get(d.id, [])
        tamanho_total = sum(x.tamanho or 0 for x in vinculados)
        resultado.append({
            "id": d.id,
            "codigoDossie": d.codigo_dossie,
            "titulo": d.titulo,
            "tipoUnidade": d.tipo_unidade,
            "nucleo": d.nucleo,
            "siglaNucleo": d.sigla_nucleo,
            "codigoClassificacao": d.codigo_classificacao,
            "descricaoCodigo": d.descricao_codigo,
            "destinacaoPrevista": d.destinacao_prevista,
            "faseAtual": d.fase_atual,
            "statusDossie": d.status_dossie,
            "volumeAtual": d.volume_atual,
            "dataAbertura": d.data_abertura,
            "dataEncerramento": d.data_encerramento,
            "responsavelAbertura": d.responsavel_abertura,
            "descricao": d.descricao,
            "totalDocumentos": len(vinculados),
            "tamanhoTotalBytes": tamanho_total,
            "documentos": [
                {
                    "id": x.id,
                    "numeroProtocolo": x.numero_protocolo or "",
                    "nome": x.nome or "",
                    "categoria": x.categoria or "",
                    "ano": x.ano or 2026,
                    "hashSha256": x.hash_sha256 or "",
                }
                for x in vinculados
            ],
        })
    return resultado


def criar_dossie(
    db: Session,
    dados: dict,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> dict:
    agora_data = datetime.now().strftime("%d/%m/%Y")
    nucleo = dados["nucleo"]
    sigla = dados.get("sigla_nucleo") or ""
    ano = int(dados.get("ano", datetime.now().year))
    codigo = gerar_codigo_dossie(db, sigla, nucleo, ano)

    novo = UnidadeArquivamentoModel(
        id=str(uuid.uuid4()),
        codigo_dossie=codigo,
        titulo=dados["titulo"].strip(),
        tipo_unidade=dados.get("tipo_unidade") or "DOSSIE",
        nucleo=nucleo,
        sigla_nucleo=sigla,
        codigo_classificacao=dados.get("codigo_classificacao") or "FIM.100.01.001",
        descricao_codigo=dados.get("descricao_codigo") or "",
        destinacao_prevista=dados.get("destinacao_prevista") or "GUARDA_PERMANENTE",
        fase_atual="CORRENTE",
        status_dossie="ABERTO",
        volume_atual=1,
        data_abertura=agora_data,
        responsavel_abertura=usuario_responsavel,
        descricao=dados.get("descricao") or "",
    )
    db.add(novo)

    registrar_evento(
        db=db,
        categoria_evento="CICLO_VIDA",
        tipo_evento="ABERTURA_DOSSIE_PROCESSO",
        numero_protocolo=codigo,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoCv] Unidade de Arquivamento ({novo.tipo_unidade}) aberta: "
            f"'{novo.codigo_dossie} — {novo.titulo}' no núcleo '{novo.nucleo}'."
        ),
    )
    db.commit()

    return {
        "id": novo.id,
        "codigoDossie": novo.codigo_dossie,
        "titulo": novo.titulo,
        "tipoUnidade": novo.tipo_unidade,
        "nucleo": novo.nucleo,
        "statusDossie": novo.status_dossie,
        "dataAbertura": novo.data_abertura,
    }


def alterar_status_dossie(
    db: Session,
    dossie_id: str,
    novo_status: str,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> Optional[dict]:
    dossie = (
        db.query(UnidadeArquivamentoModel)
        .filter(UnidadeArquivamentoModel.id == dossie_id)
        .first()
    )
    if not dossie:
        return None

    dossie.status_dossie = novo_status
    if novo_status == "ENCERRADO":
        dossie.data_encerramento = datetime.now().strftime("%d/%m/%Y")
    elif novo_status == "ABERTO":
        dossie.data_encerramento = ""

    registrar_evento(
        db=db,
        categoria_evento="CICLO_VIDA",
        tipo_evento="ALTERACAO_STATUS_DOSSIE",
        numero_protocolo=dossie.codigo_dossie,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoCv] Unidade de Arquivamento '{dossie.codigo_dossie}' ({dossie.titulo}) "
            f"alterada para status '{novo_status}'."
        ),
    )
    db.commit()
    return {
        "id": dossie.id,
        "codigoDossie": dossie.codigo_dossie,
        "statusDossie": dossie.status_dossie,
        "dataEncerramento": dossie.data_encerramento,
    }


def juntar_documentos_ao_dossie(
    db: Session,
    dossie_id: str,
    ids_documentos: list[str],
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> Optional[dict]:
    """
    Responsabilidade única: Executar a operação procedimental de Juntada e Desentranhamento
    de documentos arquivísticos em uma Unidade de Arquivamento.
    Documentos desmarcados pelo arquivista retornam à condição de Documento Avulso.
    """
    dossie = (
        db.query(UnidadeArquivamentoModel)
        .filter(UnidadeArquivamentoModel.id == dossie_id)
        .first()
    )
    if not dossie:
        return None

    conjunto_ids = {str(x) for x in ids_documentos if x}

    # 1. Desvincula documentos que estavam neste dossiê mas foram desmarcados pelo arquivista
    docs_atuais_dossie = (
        db.query(DocumentoModel)
        .filter(DocumentoModel.dossie_id == dossie.id)
        .all()
    )
    desvinculados = 0
    for doc_atual in docs_atuais_dossie:
        if str(doc_atual.id) not in conjunto_ids:
            doc_atual.dossie_id = ""
            doc_atual.codigo_dossie = ""
            desvinculados += 1

    # 2. Vincula os documentos marcados ao dossiê
    juntados = 0
    for doc_id in conjunto_ids:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if doc:
            doc.dossie_id = dossie.id
            doc.codigo_dossie = dossie.codigo_dossie
            juntados += 1

    registrar_evento(
        db=db,
        categoria_evento="PROCEDIMENTAL",
        tipo_evento="JUNTADA_DOCUMENTO_DOSSIE",
        numero_protocolo=dossie.codigo_dossie,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoProc] Atualização de vínculo orgânico no dossiê '{dossie.codigo_dossie} — {dossie.titulo}': "
            f"{juntados} peça(s) vinculada(s), {desvinculados} peça(s) retornada(s) a Documento Avulso."
        ),
    )
    db.commit()

    return {
        "dossieId": dossie.id,
        "codigoDossie": dossie.codigo_dossie,
        "documentosJuntados": juntados,
        "documentosDesvinculados": desvinculados,
    }


def excluir_dossie(
    db: Session,
    dossie_id: str,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> Optional[dict]:
    """
    Responsabilidade única: Excluir uma Unidade de Arquivamento (Dossiê / Processo)
    criada por engano ou gerada automaticamente, retornando eventuais documentos
    vinculados à condição de Documento Avulso sem excluí-los do acervo.
    """
    dossie = (
        db.query(UnidadeArquivamentoModel)
        .filter(UnidadeArquivamentoModel.id == dossie_id)
        .first()
    )
    if not dossie:
        return None

    codigo_dossie = dossie.codigo_dossie
    titulo_dossie = dossie.titulo

    # Desvincula todos os documentos que pertenciam a este dossiê (tornando-os Avulsos)
    docs_vinculados = (
        db.query(DocumentoModel)
        .filter(DocumentoModel.dossie_id == dossie.id)
        .all()
    )
    qtd_desvinculados = 0
    for doc in docs_vinculados:
        doc.dossie_id = ""
        doc.codigo_dossie = ""
        qtd_desvinculados += 1

    db.delete(dossie)

    registrar_evento(
        db=db,
        categoria_evento="PROCEDIMENTAL",
        tipo_evento="EXCLUSAO_DOSSIE_PROCESSO",
        numero_protocolo=codigo_dossie,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoProc] Unidade de Arquivamento '{codigo_dossie} — {titulo_dossie}' excluída "
            f"por {usuario_responsavel}. {qtd_desvinculados} documento(s) retornaram ao status de Documento Avulso."
        ),
    )
    db.commit()

    return {
        "id": dossie_id,
        "codigoDossie": codigo_dossie,
        "titulo": titulo_dossie,
        "documentosDesvinculados": qtd_desvinculados,
    }


def reclassificar_dossie(
    db: Session,
    dossie_id: str,
    codigo_classificacao: str,
    descricao_codigo: str,
    destinacao_prevista: str,
    justificativa: str,
    propagar_documentos: bool,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> Optional[dict]:
    """
    Requisitos Obrigatórios e-ARQ Brasil v2 (1.3.9, 1.3.10 e 1.3.11):
    Reclassifica uma Unidade de Arquivamento (Dossiê / Processo) no Plano de Classificação,
    registrando o código de classificação anterior (valorAnterior) na Trilha de Auditoria e
    opcionalmente propagando a nova classificação e temporalidade para os documentos vinculados.
    """
    from services.temporalidade_service import calcular_temporalidade_documento

    dossie = (
        db.query(UnidadeArquivamentoModel)
        .filter(UnidadeArquivamentoModel.id == dossie_id)
        .first()
    )
    if not dossie:
        return None

    valor_anterior = (
        f"Classe='{dossie.codigo_classificacao or 'N/A'} - {dossie.descricao_codigo or ''}', "
        f"Destinação='{dossie.destinacao_prevista or ''}'"
    )

    dossie.codigo_classificacao = (codigo_classificacao or "").strip()
    dossie.descricao_codigo = (descricao_codigo or "").strip()
    if destinacao_prevista:
        dossie.destinacao_prevista = destinacao_prevista.strip()

    docs_propagados = 0
    if propagar_documentos:
        docs_dossie = (
            db.query(DocumentoModel)
            .filter(DocumentoModel.dossie_id == dossie.id)
            .all()
        )
        tipo_ativ = (
            "Atividade-Fim"
            if dossie.codigo_classificacao.upper().startswith("FIM")
            else "Atividade-Meio"
        )
        for doc in docs_dossie:
            doc.codigo_classificacao = dossie.codigo_classificacao
            doc.descricao_codigo = dossie.descricao_codigo
            doc.tipo_atividade = tipo_ativ
            calc = calcular_temporalidade_documento(
                db=db,
                ano_producao=doc.ano or datetime.now().year,
                codigo_classificacao=doc.codigo_classificacao,
                tipo_atividade=doc.tipo_atividade,
                categoria=doc.categoria or "",
            )
            doc.prazo_corrente_anos = calc["prazo_corrente_anos"]
            doc.prazo_intermediaria_anos = calc["prazo_intermediaria_anos"]
            doc.ano_destinacao_final = calc["ano_destinacao_final"]
            doc.destinacao_prevista = calc["destinacao_prevista"]
            if doc.fase_arquivistica != "RECOLHIDO_RDC_ARQ":
                doc.fase_arquivistica = calc["fase_arquivistica"]
            docs_propagados += 1

    registrar_evento(
        db=db,
        categoria_evento="CICLO_VIDA",
        tipo_evento="RECLASSIFICACAO_DOSSIE_PCD",
        numero_protocolo=dossie.codigo_dossie,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        ip_origem=ip_origem,
        detalhes=(
            f"[EarqEventoCv — Requisito 1.3.9/1.3.11] Unidade de Arquivamento '{dossie.codigo_dossie} — {dossie.titulo}' "
            f"reclassificada no PCD/TTD. valorAnterior=[{valor_anterior}] -> "
            f"valorNovo=[Classe='{dossie.codigo_classificacao} - {dossie.descricao_codigo}', "
            f"Destinação='{dossie.destinacao_prevista}']. "
            f"Peças propagadas: {docs_propagados}. Justificativa: {justificativa}"
        ),
    )
    db.commit()

    return {
        "id": dossie.id,
        "codigoDossie": dossie.codigo_dossie,
        "codigoClassificacao": dossie.codigo_classificacao,
        "descricaoCodigo": dossie.descricao_codigo,
        "destinacaoPrevista": dossie.destinacao_prevista,
        "documentosPropagados": docs_propagados,
    }
