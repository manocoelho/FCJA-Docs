import sqlite3
import os

PASTA_DADOS = "C:/FCJA_Dados"
PASTA_ARQUIVOS = f"{PASTA_DADOS}/arquivos"
DB_FILE = f"{PASTA_DADOS}/fcja_ged.db"

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
            url TEXT,
            tamanho INTEGER
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