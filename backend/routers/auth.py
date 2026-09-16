from fastapi import APIRouter
from pydantic import BaseModel
import sqlite3
import database

router = APIRouter()

class LoginRequest(BaseModel):
    login: str
    senha: str

class NovoUsuario(BaseModel):
    nome: str
    login: str
    senha: str
    papel: str

class EdicaoPapel(BaseModel):
    papel: str

class UsuarioEdicao(BaseModel):
    nome: str
    login: str
    senha: str = ""
    papel: str

@router.post("/api/login")
def fazer_login(dados: LoginRequest):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT nome, papel FROM usuarios WHERE login = ? AND senha = ?", (dados.login, dados.senha))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {"sucesso": True, "nome": user[0], "papel": user[1]}
    return {"sucesso": False, "erro": "Usuário ou senha incorretos"}

@router.get("/api/usuarios")
def listar_usuarios():
    conn = sqlite3.connect(database.DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT login, nome, papel FROM usuarios")
    usuarios = cursor.fetchall()
    conn.close()
    return [dict(u) for u in usuarios]

@router.post("/api/usuarios")
def criar_usuario(dados: NovoUsuario):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO usuarios (login, senha, nome, papel) VALUES (?, ?, ?, ?)", 
                       (dados.login, dados.senha, dados.nome, dados.papel))
        conn.commit()
        sucesso = True
    except sqlite3.IntegrityError:
        sucesso = False
    conn.close()
    
    if sucesso:
        return {"sucesso": True, "mensagem": "Usuário cadastrado com sucesso!"}
    return {"sucesso": False, "erro": "Esse login já existe."}

@router.delete("/api/usuarios/{login}")
def deletar_usuario(login: str):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE login = ?", (login,))
    conn.commit()
    conn.close()
    return {"sucesso": True}

@router.put("/api/usuarios/{login}")
def atualizar_papel(login: str, dados: EdicaoPapel):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE usuarios SET papel = ? WHERE login = ?", (dados.papel, login))
    conn.commit()
    conn.close()
    return {"sucesso": True}

@router.put("/api/usuarios/{login_atual}/editar")
def editar_usuario_completo(login_atual: str, dados: UsuarioEdicao):
    conn = sqlite3.connect(database.DB_FILE)
    cursor = conn.cursor()
    try:
        if dados.senha:
            cursor.execute("UPDATE usuarios SET login = ?, nome = ?, senha = ?, papel = ? WHERE login = ?", 
                           (dados.login, dados.nome, dados.senha, dados.papel, login_atual))
        else:
            cursor.execute("UPDATE usuarios SET login = ?, nome = ?, papel = ? WHERE login = ?", 
                           (dados.login, dados.nome, dados.papel, login_atual))
        conn.commit()
        sucesso = True
    except sqlite3.IntegrityError:
        sucesso = False
    conn.close()
    
    if not sucesso:
        return {"sucesso": False, "erro": "Este login já está em uso."}
    return {"sucesso": True, "mensagem": "Usuário atualizado com sucesso!"}