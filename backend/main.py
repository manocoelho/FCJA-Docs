from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import os
import shutil
import uuid
import urllib.parse
import re # <-- Nova biblioteca para limpar textos

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

PASTA_DADOS = "C:/FCJA_Dados"
PASTA_ARQUIVOS = f"{PASTA_DADOS}/arquivos"
DB_FILE = f"{PASTA_DADOS}/fcja_ged.db"

app.mount("/arquivos", StaticFiles(directory=PASTA_ARQUIVOS), name="arquivos")

def iniciar_banco():
    if not os.path.exists(PASTA_DADOS):
        os.makedirs(PASTA_DADOS)
    if not os.path.exists(PASTA_ARQUIVOS):
        os.makedirs(PASTA_ARQUIVOS)

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documentos (
            id TEXT PRIMARY KEY,
            nome TEXT,
            ext TEXT,
            categoria TEXT,
            ano INTEGER,
            nucleo TEXT,
            upload TEXT,
            url TEXT
        )
    ''')
    conn.commit()
    conn.close()

iniciar_banco()

# ==========================================
# FUNÇÃO DE LIMPEZA DO WINDOWS
# ==========================================
def limpar_nome_pasta(texto: str) -> str:
    """Substitui caracteres proibidos do Windows (<>:"/\|?*) por underline."""
    return re.sub(r'[<>:"/\\|?*]', '_', texto)

class DocUpdate(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str

@app.get("/api/documentos")
def listar_documentos():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documentos")
    linhas = cursor.fetchall()
    conn.close()
    
    # Agora apenas devolvemos os dados, a URL já está salva certinha no banco
    return [dict(linha) for linha in linhas]

@app.post("/api/upload")
def upload_documento(
    file: UploadFile = File(...),
    nome: str = Form(...),
    ext: str = Form(...),
    categoria: str = Form(...),
    ano: int = Form(...),
    nucleo: str = Form(...)
):
    from datetime import datetime
    
    # 1. Limpa os nomes para o Windows não reclamar
    nucleo_limpo = limpar_nome_pasta(nucleo)
    categoria_limpa = limpar_nome_pasta(categoria)
    nome_limpo = limpar_nome_pasta(nome)
    
    # 2. Cria a árvore de pastas: C:/FCJA_Dados/arquivos/Nucleo/Ano/Categoria/
    subpasta = os.path.join(PASTA_ARQUIVOS, nucleo_limpo, str(ano), categoria_limpa)
    os.makedirs(subpasta, exist_ok=True) 
    
    # 3. Salva o arquivo lá dentro
    caminho_fisico = os.path.join(subpasta, nome_limpo)
    with open(caminho_fisico, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc_id = str(uuid.uuid4())
    data_upload = datetime.now().strftime("%d/%m/%Y")
    
    # 4. Gera a URL correta e salva no banco
    caminho_relativo = f"{nucleo_limpo}/{ano}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"http://localhost:8000/arquivos/{urllib.parse.quote(caminho_relativo)}"
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO documentos (id, nome, ext, categoria, ano, nucleo, upload, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (doc_id, nome, ext, categoria, ano, nucleo, data_upload, url_nova))
    
    conn.commit()
    conn.close()
    
    return {"mensagem": "Upload concluído", "id": doc_id, "upload": data_upload, "url": url_nova}

@app.delete("/api/documentos/{doc_id}")
def deletar_documento(doc_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if resultado:
        nucleo, ano, categoria, nome = resultado
        caminho_fisico = os.path.join(
            PASTA_ARQUIVOS, 
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

@app.put("/api/documentos/{doc_id}")
def atualizar_documento(doc_id: str, dados: DocUpdate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if not resultado:
        return {"erro": "Documento não encontrado"}

    n_antigo, a_antigo, c_antiga, nome_antigo = resultado
    
    caminho_antigo = os.path.join(
        PASTA_ARQUIVOS, limpar_nome_pasta(n_antigo), str(a_antigo), limpar_nome_pasta(c_antiga), limpar_nome_pasta(nome_antigo)
    )
    caminho_novo = os.path.join(
        PASTA_ARQUIVOS, limpar_nome_pasta(dados.nucleo), str(dados.ano), limpar_nome_pasta(dados.categoria), limpar_nome_pasta(dados.nome)
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