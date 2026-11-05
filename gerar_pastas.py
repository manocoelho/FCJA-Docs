#!/usr/bin/env python3
"""
Utilitário de provisionamento de estrutura e códigos PCDM do GED - FCJA.
Segue o Princípio da Responsabilidade Única (SRP):
1. Extrai tipologias e hierarquia das planilhas base.
2. Gera o artefato TypeScript para o frontend.
3. Provisiona os diretórios de armazenamento no Linux com permissões seguras (2775 / 775).
"""

import json
import os
import platform
import re
import shutil
from pathlib import Path
import pandas as pd

# Configurações de caminhos e permissões
FILE_FUNCOES = "APEPB_PCDM - FUNÇÃO 1 2 3 4 5 6 7 - CORES.xlsx"
FILE_TIPOS = "Tipos Atividades Meio.xlsx"
OUTPUT_TS = Path("frontend/src/components/ged/codigos.ts")

# No Linux usa /var/lib/fcja_dados (ou variável de ambiente FCJA_PASTA_DADOS)
DEFAULT_DATA_DIR = (
    "C:/FCJA_Dados" if platform.system() == "Windows" else "/var/lib/fcja_dados"
)
PASTA_DADOS = Path(os.getenv("FCJA_PASTA_DADOS", DEFAULT_DATA_DIR))
PASTA_ARQUIVOS = PASTA_DADOS / "arquivos"

# Usuário e grupo padrão do serviço web no Ubuntu
WEB_USER = os.getenv("FCJA_WEB_USER", os.getenv("SUDO_USER", "www-data"))
WEB_GROUP = os.getenv("FCJA_WEB_GROUP", "www-data")

# 0o2775 = rwxrwsr-x (dono e grupo leem/escrevem + SetGID para herança de grupo)
DIR_MODE = 0o2775
FILE_MODE = 0o664


def limpar_nome_pasta(texto: str) -> str:
    """Remove caracteres inválidos para nomes de diretórios."""
    return re.sub(r'[<>:"/\\|?*]', "_", texto).strip()


def extrair_tipologias(caminho_planilha: str) -> list[str]:
    """Responsabilidade: Extrair a lista única de tipologias da atividade-meio."""
    print("Extraindo as Tipologias...")
    df_tipos = pd.read_excel(caminho_planilha, sheet_name="Tipos documentais")
    return df_tipos["Tipo documental"].dropna().unique().tolist()


def mapear_hierarquia_pcdm(caminho_planilha: str) -> dict:
    """Responsabilidade: Mapear a árvore de Funções, Subfunções e Atividades."""
    print("Mapeando a Hierarquia de Pastas...")
    xls_funcoes = pd.ExcelFile(caminho_planilha)
    hierarchy: dict = {}

    for sheet in xls_funcoes.sheet_names:
        if "FUNÇÃO" not in sheet:
            continue
        df = pd.read_excel(caminho_planilha, sheet_name=sheet)
        current_funcao, current_subfuncao, current_atividade_full = None, None, None

        for index, row in df.iterrows():
            col0 = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
            col1 = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
            col2 = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""

            if col0.startswith("FUNÇÃO"):
                current_funcao = col0
                hierarchy[current_funcao] = {}
                current_subfuncao, current_atividade_full = None, None
                continue

            if col0.startswith("SUBFUNÇÃO"):
                current_subfuncao = col0
                if current_funcao:
                    hierarchy[current_funcao][current_subfuncao] = {}
                current_atividade_full = None
                continue

            if (
                col0
                and col0[0].isdigit()
                and col0.count(".") == 2
                and not col1.startswith("SUBFUNÇÃO")
            ):
                current_atividade_code = col0
                current_atividade_name = "Sem descrição"
                if index + 1 < len(df):
                    next_col0 = (
                        str(df.iloc[index + 1, 0]).strip()
                        if pd.notna(df.iloc[index + 1, 0])
                        else ""
                    )
                    if (
                        next_col0
                        and not next_col0.startswith("FUNÇÃO")
                        and not next_col0.startswith("SUBFUNÇÃO")
                        and not next_col0[0].isdigit()
                    ):
                        current_atividade_name = next_col0

                current_atividade_full = (
                    f"{current_atividade_code} - {current_atividade_name}"
                )
                if current_funcao and current_subfuncao:
                    hierarchy[current_funcao][current_subfuncao][
                        current_atividade_full
                    ] = []

            if col1 and col1[0].isdigit():
                if current_funcao and current_subfuncao and current_atividade_full:
                    hierarchy[current_funcao][current_subfuncao][
                        current_atividade_full
                    ].append({"codigo": col1, "descricao": col2})

    return hierarchy


def exportar_codigos_ts(tipos: list[str], hierarchy: dict, destino: Path) -> None:
    """Responsabilidade: Gerar o arquivo TypeScript consumido pelo Frontend."""
    print(f"Escrevendo {destino}...")
    destino.parent.mkdir(parents=True, exist_ok=True)
    with open(destino, "w", encoding="utf-8") as f:
        f.write("export const TIPOLOGIAS_MEIO = ")
        json.dump(tipos, f, ensure_ascii=False, indent=2)
        f.write(";\n\nexport const HIERARQUIA_ATIVIDADES = ")
        json.dump(hierarchy, f, ensure_ascii=False, indent=2)
        f.write(";\n")


def aplicar_permissoes_linux(caminho: Path, is_dir: bool = True) -> None:
    """Responsabilidade: Aplicar chmod (2775/664) e chown (www-data) no Linux."""
    if platform.system() == "Windows":
        return

    modo = DIR_MODE if is_dir else FILE_MODE
    try:
        os.chmod(caminho, modo)
    except PermissionError:
        print(f"[AVISO] Sem permissão para alterar chmod em: {caminho}")

    try:
        shutil.chown(caminho, user=WEB_USER, group=WEB_GROUP)
    except (PermissionError, LookupError) as e:
        print(f"[AVISO] Não foi possível definir dono {WEB_USER}:{WEB_GROUP} em {caminho} ({e})")


def provisionar_estrutura_armazenamento(pasta_base: Path, pasta_arquivos: Path) -> None:
    """Responsabilidade: Criar diretórios físicos do GED e garantir permissões POSIX."""
    print(f"Provisionando armazenamento físico em: {pasta_base}")
    os.umask(0o002)

    for diretorio in (pasta_base, pasta_arquivos):
        diretorio.mkdir(parents=True, exist_ok=True)
        aplicar_permissoes_linux(diretorio, is_dir=True)

    # Ajusta permissões recursivamente caso já existam subpastas/arquivos
    if platform.system() != "Windows" and pasta_base.exists():
        for root, dirs, files in os.walk(pasta_base):
            root_path = Path(root)
            aplicar_permissoes_linux(root_path, is_dir=True)
            for d in dirs:
                aplicar_permissoes_linux(root_path / d, is_dir=True)
            for file in files:
                aplicar_permissoes_linux(root_path / file, is_dir=False)


def main() -> None:
    if Path(FILE_TIPOS).exists() and Path(FILE_FUNCOES).exists():
        tipos = extrair_tipologias(FILE_TIPOS)
        hierarchy = mapear_hierarquia_pcdm(FILE_FUNCOES)
        exportar_codigos_ts(tipos, hierarchy, OUTPUT_TS)
    else:
        print("[AVISO] Planilhas base não encontradas no diretório atual; pulando geração do codigos.ts.")

    provisionar_estrutura_armazenamento(PASTA_DADOS, PASTA_ARQUIVOS)
    print("Sucesso! Estrutura e permissões do GED configuradas.")


if __name__ == "__main__":
    main()
