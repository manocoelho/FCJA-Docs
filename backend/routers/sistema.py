from fastapi import APIRouter
from pydantic import BaseModel
import shutil
import os
import platform
import database

router = APIRouter()

@router.get("/api/sistema/status")
def status_sistema():
    try:
        total, used, free = shutil.disk_usage(database.PASTA_DADOS)
        
        tamanho_acervo = 0
        if os.path.exists(database.PASTA_DADOS):
            for dirpath, _, filenames in os.walk(database.PASTA_DADOS):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        tamanho_acervo += os.path.getsize(fp)

        is_local = (
            str(database.PASTA_DADOS).upper().startswith("C")
            if platform.system() == "Windows"
            else database.PASTA_DADOS == database.DEFAULT_DATA_DIR
        )

        return {
            "sucesso": True,
            "pasta": database.PASTA_DADOS,
            "total_bytes": total,
            "usado_bytes": used,
            "livre_bytes": free,
            "acervo_bytes": tamanho_acervo,
            "modo": "LOCAL" if is_local else "EXTERNO"
        }
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}

class ModoRequest(BaseModel):
    modo: str

@router.post("/api/sistema/armazenamento")
def alterar_armazenamento(dados: ModoRequest):
    try:
        if dados.modo == "EXTERNO":
            drive_externo = None
            if platform.system() == "Windows":
                # Procura o primeiro HD/Pendrive disponível conectado (de D até Z)
                for letra in "DEFGHJKLMNOPQRSTUVWXYZ":
                    if os.path.exists(f"{letra}:/"):
                        drive_externo = f"{letra}:/FCJA_Dados"
                        break
            elif platform.system() == "Linux":
                # Procura pontos de montagem externos em /media ou /mnt
                for base in ["/media", "/mnt"]:
                    if os.path.exists(base):
                        for entry in os.listdir(base):
                            sub = os.path.join(base, entry)
                            if os.path.isdir(sub) and os.path.ismount(sub):
                                drive_externo = os.path.join(sub, "FCJA_Dados")
                                break
                    if drive_externo:
                        break
            
            if not drive_externo:
                return {"sucesso": False, "erro": "Nenhum HD Externo ou Pendrive foi detectado no computador."}
            
            nova_pasta = drive_externo
        else:
            nova_pasta = database.DEFAULT_DATA_DIR

        # Atualiza os caminhos do banco de dados em tempo de execução
        database.PASTA_DADOS = nova_pasta
        database.PASTA_ARQUIVOS = os.path.join(nova_pasta, "arquivos")
        database.DB_FILE = os.path.join(nova_pasta, "fcja_ged.db")
        
        # Garante que a estrutura de pastas e a tabela existam no novo local
        database.iniciar_banco()
        
        return {"sucesso": True, "modo": dados.modo, "pasta": nova_pasta}
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}

@router.post("/api/sistema/abrir-pasta")
def abrir_pasta_sistema():
    if platform.system() == "Windows":
        try:
            os.startfile(database.PASTA_ARQUIVOS)
            return {"sucesso": True}
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
    return {
        "sucesso": False, 
        "erro": "Abertura direta do explorador não aplicável em servidor Linux remoto."
    }
