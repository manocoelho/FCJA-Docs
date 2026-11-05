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
    Responsabilidade única: Criar Unidades de Arquivamento (Dossiês) iniciais para os
    núcleos que já possuem documentos no banco e vincular documentos órfãos ao respectivo
    dossiê para garantir a relação orgânica (e-ARQ Brasil v2 Cap. 1.3).
    """
    docs = db.query(DocumentoModel).all()
    dossies_existentes = db.query(UnidadeArquivamentoModel).all()

    mapa_nucleo_dossie = {d.nucleo: d for d in dossies_existentes}
    agora_data = datetime.now().strftime("%d/%m/%Y")
    alterou = False

    # Se não houver nenhum dossiê no banco ainda, cria ao menos os dossiês padrão de referência
    if not dossies_existentes:
        padroes = [
            (
                "Repositório Arquivistico Digital Confiável da produção do Projeto Preservação e Difusão do Acervo da FCJA",
                "BR_PB_FCJA_GEDA_GOP_PPMD_NRDCARQ",
                "FIM.200.02.001",
                "Dossiê Técnico de Implantação e Preservação do RDC-Arq / SIGAD FCJA",
            ),
            (
                "Manuscritos de José Américo de Almeida: identificação e descrição de documentos",
                "BR_PB_FCJA_GEDA_GOP_PPMD_NMJAA",
                "FIM.100.01.001",
                "Dossiê de Pesquisa e Catalogação de Manuscritos de José Américo",
            ),
            (
                "Acervo audiovisual da FCJA: imagem e memória",
                "BR_PB_FCJA_GEDA_GOP_PPMD_NAFCJA",
                "FIM.200.01.001",
                "Dossiê de Curadoria e Digitalização do Acervo Audiovisual",
            ),
        ]
        for nucleo_nome, sigla, cod_classe, titulo_dossie in padroes:
            cod_dossie = gerar_codigo_dossie(db, sigla, nucleo_nome, 2026)
            novo = UnidadeArquivamentoModel(
                id=str(uuid.uuid4()),
                codigo_dossie=cod_dossie,
                titulo=titulo_dossie,
                tipo_unidade="DOSSIE",
                nucleo=nucleo_nome,
                sigla_nucleo=sigla,
                codigo_classificacao=cod_classe,
                descricao_codigo=titulo_dossie,
                destinacao_prevista="GUARDA_PERMANENTE",
                fase_atual="CORRENTE",
                status_dossie="ABERTO",
                volume_atual=1,
                data_abertura=agora_data,
                responsavel_abertura="sistema (organização arquivística)",
                descricao="Unidade de arquivamento estruturada automaticamente para manter o vínculo orgânico do núcleo.",
            )
            db.add(novo)
            db.flush()
            mapa_nucleo_dossie[nucleo_nome] = novo
            alterou = True

    for doc in docs:
        if not doc.dossie_id and doc.nucleo:
            dossie = mapa_nucleo_dossie.get(doc.nucleo)
            if not dossie:
                cod_dossie = gerar_codigo_dossie(
                    db, doc.sigla or "", doc.nucleo, doc.ano or 2026
                )
                dossie = UnidadeArquivamentoModel(
                    id=str(uuid.uuid4()),
                    codigo_dossie=cod_dossie,
                    titulo=f"Dossiê Geral — {doc.nucleo[:85]}",
                    tipo_unidade="DOSSIE",
                    nucleo=doc.nucleo,
                    sigla_nucleo=doc.sigla or "",
                    codigo_classificacao=doc.codigo_classificacao or "FIM.100.01.001",
                    descricao_codigo=doc.descricao_codigo or "Produção Documental do Núcleo",
                    destinacao_prevista="GUARDA_PERMANENTE",
                    fase_atual="CORRENTE",
                    status_dossie="ABERTO",
                    volume_atual=1,
                    data_abertura=doc.upload or agora_data,
                    responsavel_abertura="sistema",
                    descricao=f"Dossiê orgânico dos documentos produzidos pelo núcleo '{doc.nucleo}'.",
                )
                db.add(dossie)
                db.flush()
                mapa_nucleo_dossie[doc.nucleo] = dossie

            doc.dossie_id = dossie.id
            doc.codigo_dossie = dossie.codigo_dossie
            alterou = True

    if alterou:
        db.commit()


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
    Responsabilidade única: Executar a operação procedimental de Juntada (Anexação / Apensação)
    de documentos arquivísticos a uma Unidade de Arquivamento (e-ARQ Brasil v2 Cap. 1.3 e 4).
    """
    dossie = (
        db.query(UnidadeArquivamentoModel)
        .filter(UnidadeArquivamentoModel.id == dossie_id)
        .first()
    )
    if not dossie:
        return None

    juntados = 0
    for doc_id in ids_documentos:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if doc:
            doc.dossie_id = dossie.id
            doc.codigo_dossie = dossie.codigo_dossie
            juntados += 1

    if juntados > 0:
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
                f"[EarqEventoProc] Juntada arquivística realizada: {juntados} documento(s) "
                f"vinculado(s) organicamente ao dossiê '{dossie.codigo_dossie} — {dossie.titulo}'."
            ),
        )
        db.commit()

    return {
        "dossieId": dossie.id,
        "codigoDossie": dossie.codigo_dossie,
        "documentosJuntados": juntados,
    }
