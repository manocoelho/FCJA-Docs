from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
import database
from models.usuario import UsuarioModel
from services.auditoria_service import registrar_evento

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
def fazer_login(dados: LoginRequest, request: Request = None):
    ip_cliente = request.client.host if (request and request.client) else ""
    with database.SessionLocal() as db:
        user = (
            db.query(UsuarioModel)
            .filter(UsuarioModel.login == dados.login, UsuarioModel.senha == dados.senha)
            .first()
        )
        if user:
            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="AUTENTICACAO_USUARIO",
                usuario_responsavel=user.nome,
                papel_usuario=user.papel,
                resultado="SUCESSO",
                ip_origem=ip_cliente,
                detalhes=f"Sessão autenticada no SIGAD para o usuário '{user.login}' (papel: {user.papel}).",
            )
            db.commit()
            return {"sucesso": True, "nome": user.nome, "papel": user.papel, "login": user.login}

        registrar_evento(
            db=db,
            categoria_evento="PROCEDIMENTAL",
            tipo_evento="FALHA_AUTENTICACAO",
            usuario_responsavel=dados.login,
            resultado="FALHA",
            ip_origem=ip_cliente,
            detalhes=f"Tentativa de login mal-sucedida para o identificador '{dados.login}'.",
        )
        db.commit()
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
            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="CADASTRO_USUARIO",
                usuario_responsavel="admin",
                papel_usuario="admin",
                resultado="SUCESSO",
                detalhes=f"Novo agente cadastrado no SIGAD: '{dados.nome}' (login: {dados.login}, papel: {dados.papel}).",
            )
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
            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="REMOCAO_USUARIO",
                usuario_responsavel="admin",
                papel_usuario="admin",
                resultado="ALERTA",
                detalhes=f"Agente '{user.nome}' (login: {login}) removido do controle de acesso.",
            )
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
