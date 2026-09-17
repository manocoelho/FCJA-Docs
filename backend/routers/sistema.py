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

        return {
            "sucesso": True,
            "pasta": database.PASTA_DADOS,
            "total_bytes": total,
            "usado_bytes": used,
            "livre_bytes": free,
            "acervo_bytes": tamanho_acervo,
            "modo": "LOCAL" if str(database.PASTA_DADOS).upper().startswith("C") else "EXTERNO"
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
            
            if not drive_externo:
                return {"sucesso": False, "erro": "Nenhum HD Externo ou Pendrive foi detectado no computador."}
            
            nova_pasta = drive_externo
        else:
            nova_pasta = "C:/FCJA_Dados"

        # Atualiza os caminhos do banco de dados em tempo de execução
        database.PASTA_DADOS = nova_pasta
        database.PASTA_ARQUIVOS = f"{nova_pasta}/arquivos"
        database.DB_FILE = f"{nova_pasta}/fcja_ged.db"
        
        # Garante que a estrutura de pastas e a tabela existam no novo local
        database.iniciar_banco()
        
        return {"sucesso": True, "modo": dados.modo, "pasta": nova_pasta}
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}