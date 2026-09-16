from fastapi import APIRouter, File, UploadFile, Form
from pydantic import BaseModel
import sqlite3
import os
import shutil
import uuid
import urllib.parse
import re
from datetime import datetime
import pandas as pd  # <-- Importação do Pandas adicionada aqui
import database

router = APIRouter()

class DocUpdate(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str

def limpar_nome_pasta(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', '_', texto)

@router.get("/api/documentos")
def listar_documentos():
    conn = sqlite3.connect(database.DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documentos")
    linhas = cursor.fetchall()
    conn.close()
    return [dict(linha) for linha in linhas]

@router.post("/api/upload")
def upload_documento(
    file: UploadFile = File(...),
    nome: str = Form(...),
    ext: str = Form(...),
    categoria: str = Form(...),
    ano: int = Form(...),
    nucleo: str = Form(...)
):
    nucleo_limpo = limpar_nome_pasta(nucleo)
    categoria_limpa = limpar_nome_pasta(categoria)
    nome_limpo = limpar_nome_pasta(nome)
    
    subpasta = os.path.join(database.PASTA_ARQUIVOS, nucleo_limpo, str(ano), categoria_limpa)
    os.makedirs(subpasta, exist_ok=True) 
    
    caminho_fisico = os.path.join(subpasta, nome_limpo)
    with open(caminho_fisico, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Mede o tamanho real do arquivo que acabou de ser salvo no SSD
    tamanho_bytes = os.path.getsize(caminho_fisico)
        
    doc_id = str(uuid.uuid4())
    data_upload = datetime.now().strftime("%d/%m/%Y")
    
    caminho_relativo = f"{nucleo_limpo}/{ano}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"http://localhost:8000/arquivos/{urllib.parse.quote(caminho_relativo)}"
    
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    
    # Inserindo com a coluna 'tamanho'
    cursor.execute('''
        INSERT INTO documentos (id, nome, ext, categoria, ano, nucleo, upload, url, tamanho)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (doc_id, nome, ext, categoria, ano, nucleo, data_upload, url_nova, tamanho_bytes))
    conn.commit()
    conn.close()
    
    return {
        "mensagem": "Upload concluído", 
        "id": doc_id, 
        "upload": data_upload, 
        "url": url_nova,
        "tamanho": tamanho_bytes
    }

@router.delete("/api/documentos/{doc_id}")
def deletar_documento(doc_id: str):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if resultado:
        nucleo, ano, categoria, nome = resultado
        caminho_fisico = os.path.join(
            database.PASTA_ARQUIVOS, 
            limpar_nome_pasta(nucleo), 
            str(ano), 
            limpar_nome_pasta(categoria), 
            limpar_nome_pasta(nome)
        )
        if os.path.exists(caminho_fisico):
            os.remove(caminho_fisico)
            
        cursor.execute("DELETE FROM documentos WHERE id = ?", (doc_id,))
        conn.commit()

    conn.close()
    return {"mensagem": "Documento apagado com sucesso"}

@router.put("/api/documentos/{doc_id}")
def atualizar_documento(doc_id: str, dados: DocUpdate):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if not resultado:
        return {"erro": "Documento não encontrado"}

    n_antigo, a_antigo, c_antiga, nome_antigo = resultado
    
    caminho_antigo = os.path.join(
        database.PASTA_ARQUIVOS, limpar_nome_pasta(n_antigo), str(a_antigo), limpar_nome_pasta(c_antiga), limpar_nome_pasta(nome_antigo)
    )
    caminho_novo = os.path.join(
        database.PASTA_ARQUIVOS, limpar_nome_pasta(dados.nucleo), str(dados.ano), limpar_nome_pasta(dados.categoria), limpar_nome_pasta(dados.nome)
    )

    if caminho_antigo != caminho_novo and os.path.exists(caminho_antigo):
        os.makedirs(os.path.dirname(caminho_novo), exist_ok=True)
        os.rename(caminho_antigo, caminho_novo)

    caminho_relativo = f"{limpar_nome_pasta(dados.nucleo)}/{dados.ano}/{limpar_nome_pasta(dados.categoria)}/{limpar_nome_pasta(dados.nome)}"
    url_nova = f"http://localhost:8000/arquivos/{urllib.parse.quote(caminho_relativo)}"

    cursor.execute('''
        UPDATE documentos 
        SET nome = ?, categoria = ?, ano = ?, nucleo = ?, url = ?
        WHERE id = ?
    ''', (dados.nome, dados.categoria, dados.ano, dados.nucleo, url_nova, doc_id))
    
    conn.commit()
    conn.close()
    
    return {"mensagem": "Documento atualizado com sucesso", "url": url_nova}

# --- NOVA ROTA DE VISUALIZAÇÃO DE PLANILHAS ---
@router.get("/api/visualizar-planilha/{doc_id}")
def visualizar_planilha(doc_id: str):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    conn.close()

    if not resultado:
        return {"erro": "Documento não encontrado"}

    nucleo, ano, categoria, nome = resultado
    caminho_fisico = os.path.join(
        database.PASTA_ARQUIVOS, limpar_nome_pasta(nucleo), str(ano), limpar_nome_pasta(categoria), limpar_nome_pasta(nome)
    )

    if not os.path.exists(caminho_fisico):
         return {"erro": "Arquivo físico não encontrado."}

    try:
        # O Pandas lê o arquivo físico e converte para dados compatíveis com o React
        df = pd.read_excel(caminho_fisico)
        colunas = df.columns.astype(str).tolist()
        linhas = df.fillna("").to_dict(orient="records")
        return {"colunas": colunas, "linhas": linhas}
    except Exception as e:
        return {"erro": str(e)}