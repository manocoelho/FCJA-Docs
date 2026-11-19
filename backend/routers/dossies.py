from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

import database
from core.dependencies import exigir_papeis, extrair_agente_requisicao
from services.dossie_service import (
    alterar_status_dossie,
    criar_dossie,
    excluir_dossie,
    juntar_documentos_ao_dossie,
    listar_dossies,
    reclassificar_dossie,
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


class ReclassificarDossieSchema(BaseModel):
    codigo_classificacao: str
    descricao_codigo: str = ""
    destinacao_prevista: str = "GUARDA_PERMANENTE"
    justificativa: str
    propagar_documentos: bool = True


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


@router.delete("/api/dossies/{dossie_id}")
def delete_dossie(
    dossie_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"auxiliar", "arquivista", "admin"}, "Exclusão de Dossiê / Unidade de Arquivamento")
    ip = request.client.host if (request and request.client) else ""

    with database.SessionLocal() as db:
        excluido = excluir_dossie(
            db=db,
            dossie_id=dossie_id,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
        if not excluido:
            raise HTTPException(status_code=404, detail="Dossiê/Processo não encontrado")
        return {
            "sucesso": True,
            "mensagem": f"Dossiê {excluido['codigoDossie']} excluído com sucesso.",
            "dossie": excluido,
        }


@router.put("/api/dossies/{dossie_id}/reclassificar")
def put_reclassificar_dossie(
    dossie_id: str,
    dados: ReclassificarDossieSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Reclassificação de Dossiê no PCD/TTD (e-ARQ 1.3.9)")
    ip = request.client.host if (request and request.client) else ""

    justificativa = (dados.justificativa or "").strip()
    if len(justificativa) < 8:
        raise HTTPException(
            status_code=400,
            detail="É obrigatório informar uma justificativa técnica (mínimo de 8 caracteres) para reclassificar o dossiê.",
        )

    with database.SessionLocal() as db:
        atualizado = reclassificar_dossie(
            db=db,
            dossie_id=dossie_id,
            codigo_classificacao=dados.codigo_classificacao,
            descricao_codigo=dados.descricao_codigo,
            destinacao_prevista=dados.destinacao_prevista,
            justificativa=justificativa,
            propagar_documentos=dados.propagar_documentos,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            ip_origem=ip,
        )
        if not atualizado:
            raise HTTPException(status_code=404, detail="Dossiê/Processo não encontrado")
        return {
            "sucesso": True,
            "mensagem": f"Dossiê {atualizado['codigoDossie']} reclassificado para '{atualizado['codigoClassificacao']}'.",
            "dossie": atualizado,
        }
