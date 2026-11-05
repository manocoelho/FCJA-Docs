from typing import Optional
from fastapi import APIRouter, Header, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

import database
from models.usuario import UsuarioModel
from core.security import (
    eh_hash_seguro,
    gerar_hash_senha,
    gerar_token_jwt,
    validar_token_jwt,
    verificar_senha,
)
from core.dependencies import exigir_papeis, extrair_agente_requisicao
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
            .filter(UsuarioModel.login == dados.login)
            .first()
        )
        if user and verificar_senha(dados.senha, user.senha or ""):
            if not eh_hash_seguro(user.senha or ""):
                user.senha = gerar_hash_senha(dados.senha)

            token_jwt = gerar_token_jwt(
                login=user.login,
                nome=user.nome,
                papel=user.papel,
            )

            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="AUTENTICACAO_JWT",
                usuario_responsavel=user.nome,
                papel_usuario=user.papel,
                resultado="SUCESSO",
                ip_origem=ip_cliente,
                detalhes=(
                    f"Sessão JWT (HS256) emitida no SIGAD para o agente '{user.login}' "
                    f"(perfil RBAC: {user.papel})."
                ),
            )
            db.commit()
            return {
                "sucesso": True,
                "nome": user.nome,
                "papel": user.papel,
                "login": user.login,
                "token": token_jwt,
            }

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


@router.get("/api/auth/me")
def verificar_sessao_atual(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        return {"autenticado": False, "erro": "Token JWT ausente"}

    token = authorization[7:].strip()
    payload = validar_token_jwt(token)
    if not payload:
        return {"autenticado": False, "erro": "Token JWT inválido ou expirado"}

    return {
        "autenticado": True,
        "login": payload.get("sub", ""),
        "nome": payload.get("nome", ""),
        "papel": payload.get("papel", "pesquisador"),
        "exp": payload.get("exp", 0),
    }


@router.get("/api/usuarios")
def listar_usuarios():
    with database.SessionLocal() as db:
        usuarios = db.query(UsuarioModel).all()
        return [
            {
                "login": u.login,
                "nome": u.nome,
                "papel": u.papel,
                "senhaCriptografada": eh_hash_seguro(u.senha or ""),
            }
            for u in usuarios
        ]


@router.post("/api/usuarios")
def criar_usuario(
    dados: NovoUsuario,
    authorization: Optional[str] = Header(None),
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="admin")
    exigir_papeis(agente, {"admin"}, "Cadastro de usuário no SIGAD")

    with database.SessionLocal() as db:
        existente = db.query(UsuarioModel).filter(UsuarioModel.login == dados.login).first()
        if existente:
            return {"sucesso": False, "erro": "Esse login já existe."}

        try:
            novo = UsuarioModel(
                login=dados.login,
                senha=gerar_hash_senha(dados.senha),
                nome=dados.nome,
                papel=dados.papel,
            )
            db.add(novo)
            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="CADASTRO_USUARIO_RBAC",
                usuario_responsavel=agente["nome"],
                papel_usuario=agente["papel"],
                resultado="SUCESSO",
                detalhes=(
                    f"Novo agente cadastrado no SIGAD com senha PBKDF2-SHA256: "
                    f"'{dados.nome}' (login: {dados.login}, perfil RBAC: {dados.papel})."
                ),
            )
            db.commit()
            return {"sucesso": True, "mensagem": "Usuário cadastrado com senha criptografada!"}
        except IntegrityError:
            db.rollback()
            return {"sucesso": False, "erro": "Esse login já existe."}


@router.delete("/api/usuarios/{login}")
def deletar_usuario(
    login: str,
    authorization: Optional[str] = Header(None),
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="admin")
    exigir_papeis(agente, {"admin"}, "Revogação de acesso de usuário")

    with database.SessionLocal() as db:
        user = db.query(UsuarioModel).filter(UsuarioModel.login == login).first()
        if user:
            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="REMOCAO_USUARIO_RBAC",
                usuario_responsavel=agente["nome"],
                papel_usuario=agente["papel"],
                resultado="ALERTA",
                detalhes=f"Agente '{user.nome}' (login: {login}, papel: {user.papel}) removido do controle de acesso.",
            )
            db.delete(user)
            db.commit()
    return {"sucesso": True}


@router.put("/api/usuarios/{login}")
def atualizar_papel(
    login: str,
    dados: EdicaoPapel,
    authorization: Optional[str] = Header(None),
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="admin")
    exigir_papeis(agente, {"admin"}, "Alteração de perfil RBAC")

    with database.SessionLocal() as db:
        user = db.query(UsuarioModel).filter(UsuarioModel.login == login).first()
        if user:
            papel_anterior = user.papel
            user.papel = dados.papel
            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="ALTERACAO_PAPEL_RBAC",
                usuario_responsavel=agente["nome"],
                papel_usuario=agente["papel"],
                resultado="SUCESSO",
                detalhes=(
                    f"Perfil RBAC do agente '{user.login}' alterado de "
                    f"'{papel_anterior}' para '{dados.papel}'."
                ),
            )
            db.commit()
    return {"sucesso": True}


@router.put("/api/usuarios/{login_atual}/editar")
def editar_usuario_completo(
    login_atual: str,
    dados: UsuarioEdicao,
    authorization: Optional[str] = Header(None),
):
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="admin")
    exigir_papeis(agente, {"admin"}, "Edição cadastral de usuário")

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
                user.senha = gerar_hash_senha(dados.senha)

            registrar_evento(
                db=db,
                categoria_evento="PROCEDIMENTAL",
                tipo_evento="EDICAO_USUARIO_RBAC",
                usuario_responsavel=agente["nome"],
                papel_usuario=agente["papel"],
                resultado="SUCESSO",
                detalhes=(
                    f"Dados cadastrais do agente '{dados.login}' atualizados "
                    f"(perfil: {dados.papel}, senha alterada: {'sim' if dados.senha else 'não'})."
                ),
            )
            db.commit()
            return {"sucesso": True, "mensagem": "Usuário atualizado com sucesso!"}
        except IntegrityError:
            db.rollback()
            return {"sucesso": False, "erro": "Este login já está em uso."}
