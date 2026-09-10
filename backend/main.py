from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sqlite3
import os
import shutil
import platform
import uuid
import urllib.parse
import re
import string

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# GERENCIADOR DINÂMICO DE ARMAZENAMENTO
# ==========================================
class StorageManager:
    def __init__(self):
        self.modo = "LOCAL"
        self.pasta_dados = "C:/FCJA_Dados"
        self.pasta_arquivos = f"{self.pasta_dados}/arquivos"
        self.db_file = f"{self.pasta_dados}/fcja_ged.db"

    def encontrar_hd_externo(self):
        """Varre as letras do Windows buscando a pasta marcadora, ignorando drives fantasmas/vazios"""
        letras_disponiveis = string.ascii_uppercase.replace("A", "").replace("B", "").replace("C", "")
        
        for letra in letras_disponiveis:
            caminho_teste = f"{letra}:\\FCJA_Drive_Externo"
            
            try:
                if os.path.exists(caminho_teste):
                    return caminho_teste
            except OSError:
                continue
                
        return None

    def configurar(self, modo: str):
        if modo == "EXTERNO":
            caminho_ext = self.encontrar_hd_externo()
            if not caminho_ext:
                raise Exception("HD Externo não encontrado. Conecte-o e crie a pasta 'FCJA_Drive_Externo'.")
            self.modo = "EXTERNO"
            self.pasta_dados = caminho_ext
        else:
            self.modo = "LOCAL"
            self.pasta_dados = "C:/FCJA_Dados"

        self.pasta_arquivos = f"{self.pasta_dados}/arquivos"
        self.db_file = f"{self.pasta_dados}/fcja_ged.db"

        # Garante que as pastas existam na nova unidade
        os.makedirs(self.pasta_dados, exist_ok=True)
        os.makedirs(self.pasta_arquivos, exist_ok=True)

        # Inicia o banco de dados na nova unidade
        iniciar_banco()

storage = StorageManager()

def iniciar_banco():
    conn = sqlite3.connect(storage.db_file)
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
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            login TEXT PRIMARY KEY,
            senha TEXT,
            nome TEXT,
            papel TEXT
        )
    ''')
    
    usuarios_equipe = [
        ('barbara', '1980', 'Bárbara', 'pesquisador'),
        ('andre', '1980', 'André', 'pesquisador'),
        ('antonio', '1980', 'Antonio', 'admin'),
        ('pablo', '1980', 'Pablo', 'pesquisador'),
        ('josilene', '1980', 'Josilene', 'pesquisador')
    ]
    
    for user in usuarios_equipe:
        cursor.execute("INSERT OR IGNORE INTO usuarios (login, senha, nome, papel) VALUES (?, ?, ?, ?)", user)

    conn.commit()
    conn.close()

storage.configurar("LOCAL") # Liga o sistema apontando para o C: por padrão

def limpar_nome_pasta(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', '_', texto)

class DocUpdate(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str

class LoginRequest(BaseModel):
    login: str
    senha: str

class ArmazenamentoRequest(BaseModel):
    modo: str

# ==========================================
# ROTAS DO SISTEMA DE ARMAZENAMENTO
# ==========================================
@app.post("/api/sistema/armazenamento")
def trocar_armazenamento(req: ArmazenamentoRequest):
    """Rota chamada pelo botão no React para trocar o HD"""
    try:
        storage.configurar(req.modo)
        return {"sucesso": True, "modo": storage.modo, "pasta": storage.pasta_dados}
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}

@app.get("/arquivos/{file_path:path}")
def servir_arquivo_dinamico(file_path: str):
    """Substitui o app.mount() para ler o arquivo do HD ativo no momento"""
    caminho_absoluto = os.path.join(storage.pasta_arquivos, file_path)
    if os.path.exists(caminho_absoluto):
        return FileResponse(caminho_absoluto)
    return {"erro": "Arquivo não encontrado"}

@app.get("/api/sistema/status")
def status_sistema():
    try:
        total, used, free = shutil.disk_usage(storage.pasta_dados)
        tamanho_acervo = 0
        if os.path.exists(storage.pasta_dados):
            for dirpath, _, filenames in os.walk(storage.pasta_dados):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        tamanho_acervo += os.path.getsize(fp)

        return {
            "sucesso": True,
            "modo": storage.modo,
            "pasta": storage.pasta_dados,
            "total_bytes": total,
            "usado_bytes": used,
            "livre_bytes": free,
            "acervo_bytes": tamanho_acervo
        }
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}

@app.post("/api/sistema/abrir-pasta")
def abrir_pasta_windows():
    try:
        if platform.system() == "Windows":
            os.startfile(storage.pasta_dados)
        return {"sucesso": True}
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}

# ==========================================
# ROTAS DE DOCUMENTOS E LOGIN
# ==========================================
@app.get("/api/documentos")
def listar_documentos():
    conn = sqlite3.connect(storage.db_file)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documentos")
    linhas = cursor.fetchall()
    conn.close()
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
    nucleo_limpo = limpar_nome_pasta(nucleo)
    categoria_limpa = limpar_nome_pasta(categoria)
    nome_limpo = limpar_nome_pasta(nome)
    
    subpasta = os.path.join(storage.pasta_arquivos, nucleo_limpo, str(ano), categoria_limpa)
    os.makedirs(subpasta, exist_ok=True) 
    
    caminho_fisico = os.path.join(subpasta, nome_limpo)
    with open(caminho_fisico, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc_id = str(uuid.uuid4())
    data_upload = datetime.now().strftime("%d/%m/%Y")
    
    caminho_relativo = f"{nucleo_limpo}/{ano}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"http://localhost:8000/arquivos/{urllib.parse.quote(caminho_relativo)}"
    
    conn = sqlite3.connect(storage.db_file)
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
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if resultado:
        nucleo, ano, categoria, nome = resultado
        caminho_fisico = os.path.join(
            storage.pasta_arquivos, limpar_nome_pasta(nucleo), str(ano), 
            limpar_nome_pasta(categoria), limpar_nome_pasta(nome)
        )
        if os.path.exists(caminho_fisico):
            os.remove(caminho_fisico)
            
        cursor.execute("DELETE FROM documentos WHERE id = ?", (doc_id,))
        conn.commit()

    conn.close()
    return {"mensagem": "Documento apagado"}

@app.put("/api/documentos/{doc_id}")
def atualizar_documento(doc_id: str, dados: DocUpdate):
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT nucleo, ano, categoria, nome FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    
    if not resultado:
        return {"erro": "Documento não encontrado"}

    n_antigo, a_antigo, c_antiga, nome_antigo = resultado
    caminho_antigo = os.path.join(storage.pasta_arquivos, limpar_nome_pasta(n_antigo), str(a_antigo), limpar_nome_pasta(c_antiga), limpar_nome_pasta(nome_antigo))
    caminho_novo = os.path.join(storage.pasta_arquivos, limpar_nome_pasta(dados.nucleo), str(dados.ano), limpar_nome_pasta(dados.categoria), limpar_nome_pasta(dados.nome))

    if caminho_antigo != caminho_novo and os.path.exists(caminho_antigo):
        os.makedirs(os.path.dirname(caminho_novo), exist_ok=True)
        os.rename(caminho_antigo, caminho_novo)

    caminho_relativo = f"{limpar_nome_pasta(dados.nucleo)}/{dados.ano}/{limpar_nome_pasta(dados.categoria)}/{limpar_nome_pasta(dados.nome)}"
    url_nova = f"http://localhost:8000/arquivos/{urllib.parse.quote(caminho_relativo)}"

    cursor.execute('''
        UPDATE documentos SET nome = ?, categoria = ?, ano = ?, nucleo = ?, url = ? WHERE id = ?
    ''', (dados.nome, dados.categoria, dados.ano, dados.nucleo, url_nova, doc_id))
    
    conn.commit()
    conn.close()
    return {"mensagem": "Documento atualizado com sucesso", "url": url_nova}

@app.post("/api/login")
def fazer_login(dados: LoginRequest):
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT nome, papel FROM usuarios WHERE login = ? AND senha = ?", (dados.login, dados.senha))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {"sucesso": True, "nome": user[0], "papel": user[1]}
    else:
        return {"sucesso": False, "erro": "Usuário ou senha incorretos"}

# ==========================================
# ROTAS DE GERENCIAMENTO DE USUÁRIOS (ADMIN)
# ==========================================
class UsuarioNovo(BaseModel):
    login: str
    senha: str
    nome: str
    papel: str

class UsuarioUpdate(BaseModel):
    papel: str

@app.get("/api/usuarios")
def listar_usuarios():
    """Lista todos os usuários cadastrados (sem devolver as senhas por segurança)"""
    conn = sqlite3.connect(storage.db_file)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT login, nome, papel FROM usuarios")
    usuarios = cursor.fetchall()
    conn.close()
    return [dict(u) for u in usuarios]

@app.post("/api/usuarios")
def criar_usuario(user: UsuarioNovo):
    """Cadastra um novo usuário no sistema"""
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO usuarios (login, senha, nome, papel) VALUES (?, ?, ?, ?)", 
                       (user.login, user.senha, user.nome, user.papel))
        conn.commit()
        sucesso = True
    except sqlite3.IntegrityError:
        sucesso = False # Falha se o login já existir
    conn.close()
    
    if not sucesso:
        return {"sucesso": False, "erro": "Este login já está em uso."}
    return {"sucesso": True, "mensagem": "Usuário criado com sucesso!"}

@app.put("/api/usuarios/{login}")
def atualizar_papel_usuario(login: str, dados: UsuarioUpdate):
    """Promove ou rebaixa um usuário"""
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    cursor.execute("UPDATE usuarios SET papel = ? WHERE login = ?", (dados.papel, login))
    conn.commit()
    conn.close()
    return {"sucesso": True}

@app.delete("/api/usuarios/{login}")
def deletar_usuario(login: str):
    """Remove um usuário do sistema"""
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE login = ?", (login,))
    conn.commit()
    conn.close()
    return {"sucesso": True}

class UsuarioEdicao(BaseModel):
    nome: str
    login: str
    senha: str = "" # Vazio significa que não quer trocar
    papel: str

@app.put("/api/usuarios/{login_atual}/editar")
def editar_usuario_completo(login_atual: str, dados: UsuarioEdicao):
    """Atualiza todos os dados do usuário. Protege a senha caso venha vazia."""
    conn = sqlite3.connect(storage.db_file)
    cursor = conn.cursor()
    
    try:
        if dados.senha:
            # Atualiza tudo, incluindo a senha nova
            cursor.execute('''
                UPDATE usuarios SET login = ?, nome = ?, senha = ?, papel = ? WHERE login = ?
            ''', (dados.login, dados.nome, dados.senha, dados.papel, login_atual))
        else:
            # Atualiza apenas os dados, mantendo a senha antiga intacta
            cursor.execute('''
                UPDATE usuarios SET login = ?, nome = ?, papel = ? WHERE login = ?
            ''', (dados.login, dados.nome, dados.papel, login_atual))
            
        conn.commit()
        sucesso = True
    except sqlite3.IntegrityError:
        sucesso = False # Dispara se tentar mudar o login para um que já existe
    conn.close()
    
    if not sucesso:
        return {"sucesso": False, "erro": "Este login já está em uso por outra pessoa."}
        
    return {"sucesso": True, "mensagem": "Usuário atualizado com sucesso!"}