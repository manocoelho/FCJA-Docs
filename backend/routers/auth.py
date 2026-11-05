from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
import database
from database import UsuarioModel

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
    with database.SessionLocal() as db:
        user = (
            db.query(UsuarioModel)
            .filter(UsuarioModel.login == dados.login, UsuarioModel.senha == dados.senha)
            .first()
        )
        if user:
            return {"sucesso": True, "nome": user.nome, "papel": user.papel}
    return {"sucesso": False, "erro": "Usuário ou senha incorretos"}


@router.get("/api/usuarios")
def listar_usuarios():
    with database.SessionLocal() as db:
        usuarios = db.query(UsuarioModel).all()
        return [
            {"login": u.login, "nome": u.nome, "papel": u.papel}
            for u in usuarios
        ]


@router.post("/api/usuarios")
def criar_usuario(dados: NovoUsuario):
    with database.SessionLocal() as db:
        existente = db.query(UsuarioModel).filter(UsuarioModel.login == dados.login).first()
        if existente:
            return {"sucesso": False, "erro": "Esse login já existe."}

        try:
            novo = UsuarioModel(
                login=dados.login,
                senha=dados.senha,
                nome=dados.nome,
                papel=dados.papel,
            )
            db.add(novo)
            db.commit()
            return {"sucesso": True, "mensagem": "Usuário cadastrado com sucesso!"}
        except IntegrityError:
            db.rollback()
            return {"sucesso": False, "erro": "Esse login já existe."}


@router.delete("/api/usuarios/{login}")
def deletar_usuario(login: str):
    with database.SessionLocal() as db:
        user = db.query(UsuarioModel).filter(UsuarioModel.login == login).first()
        if user:
            db.delete(user)
            db.commit()
    return {"sucesso": True}


@router.put("/api/usuarios/{login}")
def atualizar_papel(login: str, dados: EdicaoPapel):
    with database.SessionLocal() as db:
        user = db.query(UsuarioModel).filter(UsuarioModel.login == login).first()
        if user:
            user.papel = dados.papel
            db.commit()
    return {"sucesso": True}


@router.put("/api/usuarios/{login_atual}/editar")
def editar_usuario_completo(login_atual: str, dados: UsuarioEdicao):
    with database.SessionLocal() as db:
        user = db.query(UsuarioModel).filter(UsuarioModel.login == login_atual).first()
        if not user:
            return {"sucesso": False, "erro": "Usuário não encontrado."}

        if dados.login != login_atual:
            conflito = db.query(UsuarioModel).filter(UsuarioModel.login == dados.login).first()
            if conflito:
                return {"sucesso": False, "erro": "Este login já está em uso."}

        try:
            user.login = dados.login
            user.nome = dados.nome
            user.papel = dados.papel
            if dados.senha:
                user.senha = dados.senha
            db.commit()
            return {"sucesso": True, "mensagem": "Usuário atualizado com sucesso!"}
        except IntegrityError:
            db.rollback()
            return {"sucesso": False, "erro": "Este login já está em uso."}
