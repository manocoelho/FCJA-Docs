from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # <-- 1. Nova Importação
import sqlite3
import os
import shutil
import uuid

class DocUpdate(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str

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

# ==========================================
# 2. A MÁGICA: Transforma a pasta física em uma pasta pública na web
# ==========================================
app.mount("/arquivos", StaticFiles(directory=PASTA_ARQUIVOS), name="arquivos")

def iniciar_banco():
    """Cria as pastas e o banco de dados caso não existam."""
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

@app.get("/api/documentos")
def listar_documentos():
    """Devolve a lista de documentos para a tabela com o link correto."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documentos")
    linhas = cursor.fetchall()
    conn.close()
    
    # 3. Alteramos a saída para gerar o link do navegador dinamicamente
    documentos = []
    for linha in linhas:
        doc = dict(linha)
        # O React vai ler este link (ex: http://localhost:8000/arquivos/relatorio.pdf)
        doc["url"] = f"http://localhost:8000/arquivos/{doc['nome']}"
        documentos.append(doc)
        
    return documentos

# ... (a rota @app.post("/api/upload") continua exatamente igual embaixo disso) ...
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
    
    caminho_fisico = os.path.join(PASTA_ARQUIVOS, file.filename)
    with open(caminho_fisico, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc_id = str(uuid.uuid4())
    data_upload = datetime.now().strftime("%d/%m/%Y")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO documentos (id, nome, ext, categoria, ano, nucleo, upload, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (doc_id, nome, ext, categoria, ano, nucleo, data_upload, caminho_fisico))
    
    conn.commit()
    conn.close()

    
    return {"mensagem": "Upload concluído", "id": doc_id, "upload": data_upload}

@app.delete("/api/documentos/{doc_id}")
def deletar_documento(doc_id: str):
    """Apaga o registro do banco de dados e o arquivo físico do HD."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Busca o nome do arquivo para podermos apagar do computador
    cursor.execute("SELECT nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if resultado:
        nome_arquivo = resultado[0]
        caminho_fisico = os.path.join(PASTA_ARQUIVOS, nome_arquivo)
        
        # 2. Apaga o arquivo físico da pasta C:/FCJA_Dados/arquivos/ (se existir)
        if os.path.exists(caminho_fisico):
            os.remove(caminho_fisico)
            
        # 3. Apaga a linha correspondente no banco de dados SQLite
        cursor.execute("DELETE FROM documentos WHERE id = ?", (doc_id,))
        conn.commit()

    conn.close()
    return {"mensagem": "Documento apagado com sucesso"}

@app.put("/api/documentos/{doc_id}")
def atualizar_documento(doc_id: str, dados: DocUpdate):
    """Atualiza os dados no banco e renomeia o arquivo físico se necessário."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Pega o nome antigo para saber se precisamos renomear o arquivo no HD
    cursor.execute("SELECT nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if not resultado:
        return {"erro": "Documento não encontrado"}

    nome_antigo = resultado[0]
    nome_novo = dados.nome
    url_nova = f"http://localhost:8000/arquivos/{nome_novo}"

    # 2. Se o usuário mudou o nome, renomeamos o arquivo na pasta
    if nome_antigo != nome_novo:
        caminho_antigo = os.path.join(PASTA_ARQUIVOS, nome_antigo)
        caminho_novo = os.path.join(PASTA_ARQUIVOS, nome_novo)
        if os.path.exists(caminho_antigo):
            os.rename(caminho_antigo, caminho_novo)

    # 3. Atualizamos todas as informações no SQLite
    cursor.execute('''
        UPDATE documentos 
        SET nome = ?, categoria = ?, ano = ?, nucleo = ?, url = ?
        WHERE id = ?
    ''', (nome_novo, dados.categoria, dados.ano, dados.nucleo, url_nova, doc_id))
    
    conn.commit()
    conn.close()
    
    return {"mensagem": "Documento atualizado com sucesso", "url": url_nova}

    