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
    nucleo: str = Form(...),
    sigla: str = Form("")
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
    agora = datetime.now()
    data_upload = agora.strftime("%d/%m/%Y")
    hora_upload = agora.strftime("%H:%M:%S") # Pega a hora exata da máquina
         
    caminho_relativo = f"{nucleo_limpo}/{ano}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"http://localhost:8000/arquivos/{urllib.parse.quote(caminho_relativo)}"
         
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
         
    # Inserindo com as colunas completas, incluindo a sigla
    cursor.execute('''
        INSERT INTO documentos (id, nome, ext, categoria, ano, nucleo, sigla, upload, hora, url, tamanho)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (doc_id, nome, ext, categoria, ano, nucleo, sigla, data_upload, hora_upload, url_nova, tamanho_bytes))
    conn.commit()
    conn.close()
         
    return {
        "mensagem": "Upload concluído", 
        "id": doc_id, 
        "upload": data_upload,
        "hora": hora_upload,
        "sigla": sigla,
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
        try:
            df = pd.read_excel(caminho_fisico)
        except ValueError as e:
            if "engine" in str(e).lower() or "format" in str(e).lower():
                dfs = pd.read_html(caminho_fisico)
                df = dfs[0] # Pega a primeira tabela encontrada dentro do arquivo
            else:
                raise e
                
        # Limpa os dados vazios e envia para o React
        df = df.fillna("")
        colunas = df.columns.astype(str).tolist()
        linhas = df.to_dict(orient="records")
        return {"colunas": colunas, "linhas": linhas}
             
    except Exception as e:
        return {"erro": f"O arquivo é um 'falso Excel' não suportado ou está corrompido. Detalhe: {str(e)}"}

# --- ROTA PARA ABRIR ARQUIVOS NATIVAMENTE NO WINDOWS ---
@router.post("/api/documentos/{doc_id}/abrir-local")
def abrir_arquivo_local(doc_id: str):
    import platform
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    conn.close()
    
    if not resultado:
        return {"sucesso": False, "erro": "Documento não encontrado."}
        
    nucleo, ano, categoria, nome = resultado
    caminho_fisico = os.path.join(
        database.PASTA_ARQUIVOS, limpar_nome_pasta(nucleo), str(ano), limpar_nome_pasta(categoria), limpar_nome_pasta(nome)
    )
    
    if os.path.exists(caminho_fisico):
        try:
            if platform.system() == "Windows":
                os.startfile(caminho_fisico)
                return {"sucesso": True}
            else:
                return {"sucesso": False, "erro": "Este recurso só funciona no Windows."}
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
            
    return {"sucesso": False, "erro": "Arquivo físico não encontrado no HD."}