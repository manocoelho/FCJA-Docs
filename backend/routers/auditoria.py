from typing import Optional
from fastapi import APIRouter, Query
import database
from services.auditoria_service import listar_eventos, obter_resumo_auditoria
from services.eliminacao_service import listar_termos_eliminacao

router = APIRouter()


@router.get("/api/auditoria/eventos")
def get_eventos_auditoria(
    categoria_evento: Optional[str] = Query(None),
    tipo_evento: Optional[str] = Query(None),
    documento_id: Optional[str] = Query(None),
    busca: Optional[str] = Query(None),
    limite: int = Query(150),
):
    """
    Lista a Trilha de Auditoria Imutável (Eventos e-ARQ Brasil v2:
    CICLO_VIDA, PRESERVACAO, PROCEDIMENTAL e CLASSE).
    """
    with database.SessionLocal() as db:
        return listar_eventos(
            db=db,
            categoria_evento=categoria_evento,
            tipo_evento=tipo_evento,
            documento_id=documento_id,
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
