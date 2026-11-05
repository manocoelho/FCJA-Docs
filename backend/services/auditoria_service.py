import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from sqlalchemy.orm import Session

from models.evento import EventoArquivisticoModel
from models.documento import DocumentoModel


def registrar_evento(
    db: Session,
    categoria_evento: str,
    tipo_evento: str,
    detalhes: str,
    documento_id: str = "",
    numero_protocolo: str = "",
    usuario_responsavel: str = "sistema",
    papel_usuario: str = "",
    resultado: str = "SUCESSO",
    hash_evidencia: str = "",
    ip_origem: str = "",
) -> EventoArquivisticoModel:
    """
    Responsabilidade única: Gravar um evento imutável (append-only) na trilha
    de auditoria do SIGAD conforme as 4 categorias do e-ARQ Brasil v2:
    - CICLO_VIDA (EarqEventoCv)
    - PRESERVACAO (EarqEventoPreservacao / PREMIS)
    - PROCEDIMENTAL (EarqEventoProc)
    - CLASSE (EarqEventoClasse)
    """
    agora = datetime.now()
    evento = EventoArquivisticoModel(
        id=str(uuid.uuid4()),
        categoria_evento=categoria_evento,
        tipo_evento=tipo_evento,
        documento_id=documento_id or "",
        numero_protocolo=numero_protocolo or "",
        usuario_responsavel=usuario_responsavel or "sistema",
        papel_usuario=papel_usuario or "",
        data_evento=agora.strftime("%d/%m/%Y"),
        hora_evento=agora.strftime("%H:%M:%S"),
        timestamp_iso=agora.isoformat(),
        resultado=resultado,
        detalhes=detalhes,
        hash_evidencia=hash_evidencia or "",
        ip_origem=ip_origem or "",
    )
    db.add(evento)
    return evento


def listar_eventos(
    db: Session,
    categoria_evento: Optional[str] = None,
    tipo_evento: Optional[str] = None,
    documento_id: Optional[str] = None,
    busca: Optional[str] = None,
    limite: int = 150,
) -> list[dict]:
    """
    Responsabilidade única: Consultar eventos arquivísticos com filtros para auditoria.
    """
    query = db.query(EventoArquivisticoModel)

    if categoria_evento and categoria_evento != "TODOS":
        query = query.filter(EventoArquivisticoModel.categoria_evento == categoria_evento)
    if tipo_evento and tipo_evento != "TODOS":
        query = query.filter(EventoArquivisticoModel.tipo_evento == tipo_evento)
    if documento_id:
        query = query.filter(EventoArquivisticoModel.documento_id == documento_id)

    eventos = query.order_by(desc(EventoArquivisticoModel.timestamp_iso)).limit(max(1, min(limite, 500))).all()

    termo = (busca or "").strip().lower()
    resultado = []
    for ev in eventos:
        item = {
            "id": ev.id,
            "categoriaEvento": ev.categoria_evento,
            "tipoEvento": ev.tipo_evento,
            "documentoId": ev.documento_id,
            "numeroProtocolo": ev.numero_protocolo,
            "usuarioResponsavel": ev.usuario_responsavel,
            "papelUsuario": ev.papel_usuario,
            "dataEvento": ev.data_evento,
            "horaEvento": ev.hora_evento,
            "timestampIso": ev.timestamp_iso,
            "resultado": ev.resultado,
            "detalhes": ev.detalhes,
            "hashEvidencia": ev.hash_evidencia,
            "ipOrigem": ev.ip_origem,
        }
        if termo:
            texto_busca = " ".join(
                [
                    item["categoriaEvento"],
                    item["tipoEvento"],
                    item["numeroProtocolo"],
                    item["usuarioResponsavel"],
                    item["detalhes"],
                    item["hashEvidencia"],
                    item["documentoId"],
                ]
            ).lower()
            if termo not in texto_busca:
                continue
        resultado.append(item)

    return resultado


def obter_resumo_auditoria(db: Session) -> dict:
    """
    Responsabilidade única: Consolidar indicadores de conformidade e-ARQ Brasil v2 e PREMIS.
    """
    todos_eventos = db.query(EventoArquivisticoModel).all()
    todos_docs = db.query(DocumentoModel).all()

    total_docs = len(todos_docs)
    docs_com_hash = sum(1 for d in todos_docs if d.hash_sha256)
    docs_integros = sum(1 for d in todos_docs if d.hash_sha256 and d.fixidade_verificada == 1)
    docs_violados = sum(1 for d in todos_docs if d.fixidade_verificada == 0)

    contagem_categorias = {
        "CICLO_VIDA": 0,
        "PRESERVACAO": 0,
        "PROCEDIMENTAL": 0,
        "CLASSE": 0,
    }
    for ev in todos_eventos:
        cat = ev.categoria_evento or "PROCEDIMENTAL"
        contagem_categorias[cat] = contagem_categorias.get(cat, 0) + 1

    return {
        "totalEventos": len(todos_eventos),
        "eventosPorCategoria": contagem_categorias,
        "totalDocumentos": total_docs,
        "documentosComHash": docs_com_hash,
        "documentosIntegros": docs_integros,
        "documentosViolados": docs_violados,
        "taxaIntegridadePercentual": round((docs_integros / total_docs) * 100, 1) if total_docs > 0 else 100.0,
    }
