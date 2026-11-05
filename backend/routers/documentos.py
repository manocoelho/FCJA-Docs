from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import shutil
import uuid
import urllib.parse
import re
from datetime import datetime
import pandas as pd
import platform

import database
from database import DocumentoModel

router = APIRouter()


class DocUpdate(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str


def limpar_nome_pasta(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', '_', texto)


def get_base_url(request: Request = None) -> str:
    if request:
        return str(request.base_url).rstrip("/")
    return "http://localhost:8000"


@router.get("/api/documentos")
def listar_documentos(request: Request = None):
    base_atual = get_base_url(request)
    documentos_formatados = []

    with database.SessionLocal() as db:
        documentos = db.query(DocumentoModel).all()
        for doc in documentos:
            url_doc = doc.url or ""
            if request and url_doc and "localhost:8000" in url_doc and "localhost:8000" not in base_atual:
                url_doc = url_doc.replace("http://localhost:8000", base_atual)

            documentos_formatados.append({
                "id": doc.id or "",
                "nome": doc.nome or "",
                "ext": doc.ext or "",
                "categoria": doc.categoria or "",
                "ano": doc.ano or 0,
                "nucleo": doc.nucleo or "",
                "sigla": doc.sigla or "",
                "upload": doc.upload or "",
                "hora": doc.hora or "",
                "url": url_doc,
                "tamanho": doc.tamanho or 0,
                "tipoAtividade": doc.tipo_atividade or "",
                "codigoClassificacao": doc.codigo_classificacao or "",
                "descricaoCodigo": doc.descricao_codigo or "",
            })

    return documentos_formatados


@router.post("/api/upload")
def upload_documento(
    file: UploadFile = File(...),
    nome: str = Form(...),
    ext: str = Form(...),
    tipo_atividade: str = Form(""),
    codigo_classificacao: str = Form(""),
    descricao_codigo: str = Form(""),
    categoria: str = Form(...),
    ano: int = Form(...),
    nucleo: str = Form(...),
    sigla: str = Form(""),
    request: Request = None,
):
    nucleo_limpo = limpar_nome_pasta(nucleo)
    categoria_limpa = limpar_nome_pasta(categoria)
    nome_limpo = limpar_nome_pasta(nome)

    subpasta = os.path.join(database.PASTA_ARQUIVOS, nucleo_limpo, str(ano), categoria_limpa)
    os.makedirs(subpasta, exist_ok=True)

    caminho_fisico = os.path.join(subpasta, nome_limpo)
    with open(caminho_fisico, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tamanho_bytes = os.path.getsize(caminho_fisico)

    doc_id = str(uuid.uuid4())
    agora = datetime.now()
    data_upload = agora.strftime("%d/%m/%Y")
    hora_upload = agora.strftime("%H:%M:%S")

    base_atual = get_base_url(request)
    caminho_relativo = f"{nucleo_limpo}/{ano}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"{base_atual}/arquivos/{urllib.parse.quote(caminho_relativo)}"

    with database.SessionLocal() as db:
        novo_doc = DocumentoModel(
            id=doc_id,
            tipo_atividade=tipo_atividade,
            codigo_classificacao=codigo_classificacao,
            descricao_codigo=descricao_codigo,
            nome=nome,
            ext=ext,
            categoria=categoria,
            ano=ano,
            nucleo=nucleo,
            sigla=sigla,
            upload=data_upload,
            hora=hora_upload,
            url=url_nova,
            tamanho=tamanho_bytes,
        )
        db.add(novo_doc)
        db.commit()

    return {
        "mensagem": "Upload concluído",
        "id": doc_id,
        "upload": data_upload,
        "hora": hora_upload,
        "sigla": sigla,
        "url": url_nova,
        "tamanho": tamanho_bytes,
    }


@router.delete("/api/documentos/{doc_id}")
def deletar_documento(doc_id: str):
    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if doc:
            caminho_fisico = os.path.join(
                database.PASTA_ARQUIVOS,
                limpar_nome_pasta(doc.nucleo),
                str(doc.ano),
                limpar_nome_pasta(doc.categoria),
                limpar_nome_pasta(doc.nome),
            )
            if os.path.exists(caminho_fisico):
                os.remove(caminho_fisico)

            db.delete(doc)
            db.commit()

    return {"mensagem": "Documento apagado com sucesso"}


@router.put("/api/documentos/{doc_id}")
def atualizar_documento(doc_id: str, dados: DocUpdate, request: Request = None):
    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            return {"erro": "Documento não encontrado"}

        caminho_antigo = os.path.join(
            database.PASTA_ARQUIVOS,
            limpar_nome_pasta(doc.nucleo),
            str(doc.ano),
            limpar_nome_pasta(doc.categoria),
            limpar_nome_pasta(doc.nome),
        )
        caminho_novo = os.path.join(
            database.PASTA_ARQUIVOS,
            limpar_nome_pasta(dados.nucleo),
            str(dados.ano),
            limpar_nome_pasta(dados.categoria),
            limpar_nome_pasta(dados.nome),
        )

        if caminho_antigo != caminho_novo and os.path.exists(caminho_antigo):
            os.makedirs(os.path.dirname(caminho_novo), exist_ok=True)
            os.rename(caminho_antigo, caminho_novo)

        base_atual = get_base_url(request)
        caminho_relativo = f"{limpar_nome_pasta(dados.nucleo)}/{dados.ano}/{limpar_nome_pasta(dados.categoria)}/{limpar_nome_pasta(dados.nome)}"
        url_nova = f"{base_atual}/arquivos/{urllib.parse.quote(caminho_relativo)}"

        doc.nome = dados.nome
        doc.categoria = dados.categoria
        doc.ano = dados.ano
        doc.nucleo = dados.nucleo
        doc.url = url_nova

        db.commit()

    return {"mensagem": "Documento atualizado com sucesso", "url": url_nova}


@router.get("/api/visualizar-planilha/{doc_id}")
def visualizar_planilha(doc_id: str):
    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            return {"erro": "Documento não encontrado"}

        caminho_fisico = os.path.join(
            database.PASTA_ARQUIVOS,
            limpar_nome_pasta(doc.nucleo),
            str(doc.ano),
            limpar_nome_pasta(doc.categoria),
            limpar_nome_pasta(doc.nome),
        )

    if not os.path.exists(caminho_fisico):
        return {"erro": "Arquivo físico não encontrado."}

    try:
        try:
            df = pd.read_excel(caminho_fisico)
        except ValueError as e:
            if "engine" in str(e).lower() or "format" in str(e).lower():
                dfs = pd.read_html(caminho_fisico)
                df = dfs[0]
            else:
                raise e

        df = df.fillna("")
        colunas = df.columns.astype(str).tolist()
        linhas = df.to_dict(orient="records")
        return {"colunas": colunas, "linhas": linhas}

    except Exception as e:
        return {"erro": f"O arquivo é um 'falso Excel' não suportado ou está corrompido. Detalhe: {str(e)}"}


@router.post("/api/documentos/{doc_id}/abrir-local")
def abrir_arquivo_local(doc_id: str):
    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            return {"sucesso": False, "erro": "Documento não encontrado."}

        caminho_fisico = os.path.join(
            database.PASTA_ARQUIVOS,
            limpar_nome_pasta(doc.nucleo),
            str(doc.ano),
            limpar_nome_pasta(doc.categoria),
            limpar_nome_pasta(doc.nome),
        )

    if not os.path.exists(caminho_fisico):
        return {"sucesso": False, "erro": "Arquivo físico não encontrado."}

    if platform.system() == "Windows":
        try:
            os.startfile(caminho_fisico)
            return {"sucesso": True}
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
    else:
        return {
            "sucesso": False,
            "erro": "Em servidor Linux remoto, o arquivo deve ser aberto diretamente pelo navegador ou baixado.",
        }


@router.get("/arquivos/{caminho_arquivo:path}")
def servir_arquivo_dinamico(caminho_arquivo: str):
    caminho_completo = os.path.join(database.PASTA_ARQUIVOS, caminho_arquivo)

    caminho_absoluto_base = os.path.abspath(database.PASTA_ARQUIVOS)
    caminho_absoluto_arquivo = os.path.abspath(caminho_completo)
    if not caminho_absoluto_arquivo.startswith(caminho_absoluto_base):
        raise HTTPException(status_code=403, detail="Acesso negado")

    if not os.path.exists(caminho_absoluto_arquivo):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no armazenamento atual")

    return FileResponse(caminho_absoluto_arquivo)
