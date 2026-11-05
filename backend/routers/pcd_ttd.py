from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

import database
from core.dependencies import exigir_papeis, extrair_agente_requisicao
from services.temporalidade_service import (
    alternar_status_classe_pcd,
    criar_classe_pcd,
    listar_classes_pcd,
    obter_avaliacao_temporal_acervo,
)

router = APIRouter()


class NovaClassePcdSchema(BaseModel):
    codigo: str
    titulo: str
    tipo_atividade: str = "Atividade-Fim"
    funcao: str = ""
    subfuncao: str = ""
    atividade: str = ""
    prazo_corrente_anos: int = 2
    evento_corrente: str = "Conclusão da atividade / encerramento do dossiê"
    prazo_intermediaria_anos: int = 0
    evento_intermediaria: str = "Cumprimento do prazo na fase corrente"
    destinacao_final: str = "GUARDA_PERMANENTE"
    observacoes_ttd: str = ""


@router.get("/api/pcd/classes")
def get_classes_pcd(
    tipo_atividade: Optional[str] = Query(None),
    apenas_ativas: bool = Query(False),
):
    with database.SessionLocal() as db:
        return listar_classes_pcd(
            db=db,
            tipo_atividade=tipo_atividade,
            apenas_ativas=apenas_ativas,
        )


@router.post("/api/pcd/classes")
def post_classe_pcd(
    dados: NovaClassePcdSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Cadastro de Classe no PCD/TTD")
    ip = request.client.host if (request and request.client) else ""

    with database.SessionLocal() as db:
        try:
            nova = criar_classe_pcd(
                db=db,
                dados=dados.model_dump(),
                usuario_responsavel=agente["nome"],
                papel_usuario=agente["papel"],
                ip_origem=ip,
            )
            return {"sucesso": True, "classe": nova}
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"O código de classificação '{dados.codigo}' já existe no PCD/TTD.",
            )


@router.put("/api/pcd/classes/{classe_id}/status")
def put_status_classe_pcd(
    classe_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Ativação/Inativação de Classe no PCD/TTD")
    ip = request.client.host if (request and request.client) else ""

    with database.SessionLocal() as db:
        resultado = alternar_status_classe_pcd(
            db=db,
            classe_id=classe_id,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
        if not resultado:
            raise HTTPException(status_code=404, detail="Classe não encontrada no PCD")
        return {"sucesso": True, "classe": resultado}


@router.get("/api/pcd/avaliacao-acervo")
def get_avaliacao_temporal_acervo():
    with database.SessionLocal() as db:
        return obter_avaliacao_temporal_acervo(db=db)
