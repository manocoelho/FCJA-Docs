import os
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

import database
from core.dependencies import exigir_papeis, extrair_agente_requisicao
from models.pacote_sip import PacoteSipModel
from services.archivematica_service import (
    criar_e_enviar_pacote_sip,
    descobrir_transfer_source_storage_service,
    inspecionar_arquivos_pacote_sip,
    listar_pacotes_sip,
    obter_config_archivematica_dict,
    salvar_config_archivematica,
    sincronizar_status_sip,
    testar_conexao_archivematica,
)
from services.fpr_archivematica_service import REGRAS_FPR_ARCHIVEMATICA

router = APIRouter()


class ConfigArchivematicaSchema(BaseModel):
    urlArchivematica: Optional[str] = None
    usuarioArchivematica: Optional[str] = None
    apiKeyArchivematica: Optional[str] = None
    urlStorageService: Optional[str] = None
    usuarioStorageService: Optional[str] = None
    apiKeyStorageService: Optional[str] = None
    locationUuidTransfer: Optional[str] = None
    caminhoRelativoTransfer: Optional[str] = None
    diretorioCompartilhado: Optional[str] = None
    processingConfig: Optional[str] = None
    autoApprove: Optional[bool] = True
    urlAtom: Optional[str] = None


class CriarPacoteSipSchema(BaseModel):
    titulo: str
    documentoIds: List[str] = []
    dossieId: Optional[str] = None


class SincronizarSipSchema(BaseModel):
    confirmarAip: Optional[bool] = False


@router.get("/api/archivematica/config")
def obter_configuracao_conector():
    """Retorna a configuração atual do conector SIGAD FCJA -> Archivematica 1.18.0, Storage Service (:8000) & AtoM."""
    with database.SessionLocal() as db:
        return obter_config_archivematica_dict(db)


@router.put("/api/archivematica/config")
def atualizar_configuracao_conector(
    dados: ConfigArchivematicaSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """Atualiza os parâmetros de integração com o Archivematica Dashboard, Storage Service e AtoM."""
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Configuração do Conector Archivematica")
    ip = request.client.host if (request and request.client) else "127.0.0.1"

    with database.SessionLocal() as db:
        cfg = salvar_config_archivematica(
            db=db,
            dados=dados.model_dump(exclude_unset=True),
            usuario_responsavel=agente["nome"],
            ip_origem=ip,
        )
        return {
            "mensagem": "Configuração do conector Archivematica 1.18.0 e Storage Service atualizada com sucesso.",
            "config": cfg,
        }


@router.post("/api/archivematica/descobrir-transfer-source")
def descobrir_transfer_source(
    authorization: Optional[str] = Header(None),
):
    """
    ETAPA 1: Consulta `GET {SS}/api/v2/location/?purpose=TS` no Archivematica Storage Service (:8000)
    para descobrir automaticamente o `location_uuid` e o `relative_path` da pasta de Transfer Source.
    """
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Descoberta de Transfer Source no Storage Service")

    with database.SessionLocal() as db:
        return descobrir_transfer_source_storage_service(db)


@router.post("/api/archivematica/testar-conexao")
def diagnosticar_conexao_archivematica():
    """Realiza diagnóstico de rede com o Archivematica Dashboard (:80), Storage Service (:8000) e Transfer Source."""
    with database.SessionLocal() as db:
        return testar_conexao_archivematica(db)


@router.get("/api/archivematica/fpr")
def listar_regras_fpr_archivematica():
    """Retorna a tabela de regras do FPR (Format Policy Registry) do Archivematica 1.18.0 da FCJA."""
    return {
        "versaoArchivematica": "1.18.0",
        "servidorReferencia": "http://192.168.1.132",
        "totalFormatosPronom": 1639,
        "regras": list(REGRAS_FPR_ARCHIVEMATICA.values()),
    }


@router.get("/api/archivematica/sips")
def obter_pacotes_sip():
    """Lista todos os pacotes SIP OAIS gerados pelo SIGAD e o resumo de recolhimento RDC-Arq."""
    with database.SessionLocal() as db:
        return listar_pacotes_sip(db)


@router.post("/api/archivematica/sips")
def gerar_e_enviar_sip(
    dados: CriarPacoteSipSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """
    Constrói um pacote SIP no formato Standard Transfer (`objects/`, `metadata/metadata.csv`,
    `metadata/rights.csv`, `metadata/premis.xml`) + BagIt (.zip) e inicia o fluxo das Etapas 2, 3 e 4.
    """
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Geração e Envio de Pacote SIP ao Archivematica")
    ip = request.client.host if (request and request.client) else "127.0.0.1"

    with database.SessionLocal() as db:
        try:
            pacote = criar_e_enviar_pacote_sip(
                db=db,
                pasta_dados=database.PASTA_DADOS,
                pasta_arquivos=database.PASTA_ARQUIVOS,
                titulo=dados.titulo,
                doc_ids=dados.documentoIds,
                dossie_id=dados.dossieId,
                usuario_responsavel=agente["nome"],
                ip_origem=ip,
            )
            return {
                "mensagem": f"Pacote SIP {pacote['codigoSip']} gerado (metadata.csv + rights.csv + premis.xml) e encaminhado!",
                "pacote": pacote,
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/archivematica/sips/{sip_id}/sincronizar")
def sincronizar_pacote_sip(
    sip_id: int,
    dados: SincronizarSipSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """Executa as Etapas 5, 6, 7 e 8 (Transfer -> Ingest -> Storage Service AIP -> Vínculo SIGAD)."""
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Sincronização/Homologação de Pacote SIP/AIP")
    ip = request.client.host if (request and request.client) else "127.0.0.1"

    with database.SessionLocal() as db:
        try:
            pacote = sincronizar_status_sip(
                db=db,
                sip_id=sip_id,
                confirmar_aip=bool(dados.confirmarAip),
                usuario_responsavel=agente["nome"],
                ip_origem=ip,
            )
            return {
                "mensagem": f"Status do pacote {pacote['codigoSip']} atualizado ({pacote['statusSip']}).",
                "pacote": pacote,
            }
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/archivematica/sips/{sip_id}/inspecionar")
def inspecionar_pacote_sip(sip_id: int):
    """Retorna o conteúdo de metadata.csv, rights.csv, premis.xml e mets_earq_manifest.xml do pacote SIP."""
    with database.SessionLocal() as db:
        try:
            return inspecionar_arquivos_pacote_sip(db, sip_id)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/archivematica/sips/{sip_id}/download")
def baixar_pacote_sip_zip(sip_id: int):
    """Faz o download do pacote (.zip) completo (objects + metadata.csv + rights.csv + premis.xml + METS)."""
    with database.SessionLocal() as db:
        sip = db.query(PacoteSipModel).filter(PacoteSipModel.id == sip_id).first()
        if not sip or not sip.caminho_zip or not os.path.isfile(sip.caminho_zip):
            raise HTTPException(
                status_code=404,
                detail="Arquivo compactado (.zip) do pacote SIP não encontrado em disco.",
            )
        caminho_zip = sip.caminho_zip
        codigo_sip = sip.codigo_sip

    return FileResponse(
        path=caminho_zip,
        media_type="application/zip",
        filename=f"{codigo_sip}.zip",
    )
