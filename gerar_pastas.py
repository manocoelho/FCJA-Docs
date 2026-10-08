import pandas as pd
import json

file_funcoes = "APEPB_PCDM - FUNÇÃO 1 2 3 4 5 6 7 - CORES.xlsx"
file_tipos = "Tipos Atividades Meio.xlsx"

print("Extraindo as 186 Tipologias...")
df_tipos = pd.read_excel(file_tipos, sheet_name='Tipos documentais')
tipos = df_tipos['Tipo documental'].dropna().unique().tolist()

print("Mapeando a Hierarquia de Pastas...")
xls_funcoes = pd.ExcelFile(file_funcoes)
hierarchy = {}

for sheet in xls_funcoes.sheet_names:
    if "FUNÇÃO" not in sheet: continue
    df = pd.read_excel(file_funcoes, sheet_name=sheet)
    
    current_funcao, current_subfuncao, current_atividade_full = None, None, None
    
    for index, row in df.iterrows():
        col0 = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        col1 = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
        col2 = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
        
        if col0.startswith("FUNÇÃO"):
            current_funcao = col0; hierarchy[current_funcao] = {}
            current_subfuncao, current_atividade_full = None, None
            continue
            
        if col0.startswith("SUBFUNÇÃO"):
            current_subfuncao = col0
            if current_funcao: hierarchy[current_funcao][current_subfuncao] = {}
            current_atividade_full = None
            continue
            
        if col0 and col0[0].isdigit() and col0.count('.') == 2 and not col1.startswith("SUBFUNÇÃO"):
            current_atividade_code = col0
            current_atividade_name = "Sem descrição"
            # Captura o nome na linha seguinte
            if index + 1 < len(df):
                next_col0 = str(df.iloc[index+1, 0]).strip() if pd.notna(df.iloc[index+1, 0]) else ""
                if next_col0 and not next_col0.startswith("FUNÇÃO") and not next_col0.startswith("SUBFUNÇÃO") and not next_col0[0].isdigit():
                    current_atividade_name = next_col0
            
            current_atividade_full = f"{current_atividade_code} - {current_atividade_name}"
            if current_funcao and current_subfuncao:
                hierarchy[current_funcao][current_subfuncao][current_atividade_full] = []
        
        if col1 and col1[0].isdigit():
            if current_funcao and current_subfuncao and current_atividade_full:
                hierarchy[current_funcao][current_subfuncao][current_atividade_full].append({
                    "codigo": col1, "descricao": col2
                })

print("Escrevendo frontend/src/components/ged/codigos.ts...")
with open("frontend/src/components/ged/codigos.ts", "w", encoding="utf-8") as f:
    f.write('export const TIPOLOGIAS_MEIO = ')
    json.dump(tipos, f, ensure_ascii=False, indent=2)
    f.write(';\n\nexport const HIERARQUIA_ATIVIDADES = ')
    json.dump(hierarchy, f, ensure_ascii=False, indent=2)
    f.write(';\n')

print("Sucesso! Árvore gerada.")