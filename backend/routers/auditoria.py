from typing import Optional
from fastapi import APIRouter, Header, Query, Request
import database
from core.dependencies import exigir_papeis, extrair_agente_requisicao
from services.auditoria_service import (
    arquivar_trilha_auditoria_como_documento,
    listar_eventos,
    obter_resumo_auditoria,
)
from services.eliminacao_service import listar_termos_eliminacao

router = APIRouter()


@router.get("/api/auditoria/eventos")
def get_eventos_auditoria(
    categoria_evento: Optional[str] = Query(None),
    tipo_evento: Optional[str] = Query(None),
    documento_id: Optional[str] = Query(None),
    usuario_responsavel: Optional[str] = Query(None),
    busca: Optional[str] = Query(None),
    limite: int = Query(150),
):
    """
    Lista a Trilha de Auditoria Imutável (Eventos e-ARQ Brasil v2:
    CICLO_VIDA, PRESERVACAO, PROCEDIMENTAL e CLASSE) com filtros cronológicos (7.4.12).
    """
    with database.SessionLocal() as db:
        return listar_eventos(
            db=db,
            categoria_evento=categoria_evento,
            tipo_evento=tipo_evento,
            documento_id=documento_id,
            usuario_responsavel=usuario_responsavel,
            busca=busca,
            limite=limite,
        )


@router.get("/api/auditoria/resumo")
def get_resumo_auditoria():
    """
    Retorna indicadores consolidados de conformidade e-ARQ Brasil v2 e Fixidade PREMIS.
    """
    with database.SessionLocal() as db:
        return obter_resumo_auditoria(db=db)


@router.get("/api/auditoria/termos-eliminacao")
def get_termos_eliminacao(limite: int = Query(100)):
    """
    Lista todos os Termos de Eliminação emitidos pelo SIGAD (e-ARQ Brasil v2 Cap. 3.2).
    """
    with database.SessionLocal() as db:
        return listar_termos_eliminacao(db=db, limite=limite)


@router.post("/api/auditoria/arquivar-trilha")
def post_arquivar_trilha_auditoria(
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """
    Requisito Obrigatório e-ARQ Brasil v2 (7.4.15 [O]):
    Empacota e arquiva a Trilha de Auditoria atual como um documento arquivístico oficial
    de Guarda Permanente no repositório do SIGAD FCJA.
    """
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(
        agente,
        {"arquivista", "admin"},
        "Arquivamento Oficial da Trilha de Auditoria como Documento Arquivístico (e-ARQ 7.4.15)",
    )
    ip = request.client.host if (request and request.client) else ""
    base_url = str(request.base_url).rstrip("/") if request else "http://localhost:8000"

    with database.SessionLocal() as db:
        return arquivar_trilha_auditoria_como_documento(
            db=db,
            pasta_arquivos=database.PASTA_ARQUIVOS,
            base_url=base_url,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
