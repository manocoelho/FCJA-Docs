from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

import database
from core.dependencies import extrair_agente_requisicao
from services.dossie_service import (
    alterar_status_dossie,
    criar_dossie,
    juntar_documentos_ao_dossie,
    listar_dossies,
)

router = APIRouter()


class NovoDossieSchema(BaseModel):
    titulo: str
    tipo_unidade: str = "DOSSIE"
    nucleo: str
    sigla_nucleo: str = ""
    codigo_classificacao: str = "FIM.100.01.001"
    descricao_codigo: str = ""
    destinacao_prevista: str = "GUARDA_PERMANENTE"
    ano: int = 2026
    descricao: str = ""


class StatusDossieSchema(BaseModel):
    status_dossie: str  # ABERTO | ENCERRADO | RECOLHIDO_ARCHIVEMATICA


class JuntadaDossieSchema(BaseModel):
    ids_documentos: list[str]


@router.get("/api/dossies")
def get_dossies():
    with database.SessionLocal() as db:
        return listar_dossies(db=db)


@router.post("/api/dossies")
def post_dossie(
    dados: NovoDossieSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization)
    ip = request.client.host if (request and request.client) else ""

    with database.SessionLocal() as db:
        novo = criar_dossie(
            db=db,
            dados=dados.model_dump(),
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
        return {"sucesso": True, "dossie": novo}


@router.put("/api/dossies/{dossie_id}/status")
def put_status_dossie(
    dossie_id: str,
    dados: StatusDossieSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization)
    ip = request.client.host if (request and request.client) else ""

    with database.SessionLocal() as db:
        atualizado = alterar_status_dossie(
            db=db,
            dossie_id=dossie_id,
            novo_status=dados.status_dossie,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
        if not atualizado:
            raise HTTPException(status_code=404, detail="Dossiê/Processo não encontrado")
        return {"sucesso": True, "dossie": atualizado}


@router.post("/api/dossies/{dossie_id}/juntar")
def post_juntar_documentos(
    dossie_id: str,
    dados: JuntadaDossieSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization)
    ip = request.client.host if (request and request.client) else ""

    with database.SessionLocal() as db:
        resultado = juntar_documentos_ao_dossie(
            db=db,
            dossie_id=dossie_id,
            ids_documentos=dados.ids_documentos,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
        if not resultado:
            raise HTTPException(status_code=404, detail="Dossiê/Processo não encontrado")
        return {"sucesso": True, "juntada": resultado}
