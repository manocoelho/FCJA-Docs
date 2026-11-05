# 📄 FCJA Docs | Sistema de Gestão Eletrônica de Documentos (GED)

![Ubuntu](https://img.shields.io/badge/Ubuntu_24.04_LTS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

Sistema de **Gestão Eletrônica de Documentos (GED)** desenvolvido sob medida para a **Fundação Casa de José Américo (FCJA)**. Projetado sob o Princípio da Responsabilidade Única (SRP) e alinhado às diretrizes arquivísticas do **CONARQ / PCDM (Plano de Classificação de Documentos da Paraíba)**, o sistema centraliza o armazenamento no servidor local da Fundação, a classificação arquivística em lote, a visualização nativa de documentos e os indicadores analíticos em tempo real.

---

## 🏛️ Ecossistema Arquivístico Digital da FCJA

O **FCJA Docs** atua de forma integrada ao ecossistema de preservação e difusão da Fundação na rede interna (`192.168.1.X`):

| Sistema | Papel Arquivístico | Endereço na Rede Local |
| :--- | :--- | :--- |
| **FCJA Docs (GED)** | Gestão documental corrente/intermediária e classificação PCDM | `http://192.168.1.115` *(ou `:8085`)* |
| **Archivematica** | Preservação digital sistêmica e geração de pacotes AIP | `http://192.168.1.132` |
| **Storage Service** | Gerenciamento de áreas de transferência e armazenamento | `http://192.168.1.132:8000` |
| **AtoM** | Difusão, descrição arquivística e acesso aos pacotes DIP | `http://192.168.1.110` |

---

## ✨ Destaques e Funcionalidades

* 🖥️ **Interface Web Desktop:** Navegação fluida e modular via barra lateral (`Dashboard Analítico`, `Explorador de Arquivos`, `Central de Upload` e `Gerenciar Acessos`).
* 🗂️ **Classificação Arquivística Guiada (PCDM/APEPB):** Seletor hierárquico completo (*Função > Subfunção > Atividade > Código de Classificação*) integrado às 186 tipologias documentais de atividade-meio e aos 16 Núcleos de Pesquisa da FCJA.
* 📂 **Explorador do Acervo no Servidor:** Navegação estruturada em árvore (`Armazenamento no Servidor > Núcleo > Ano > Tipologia`) com abertura por duplo clique.
* 📊 **Dashboard Analítico em Tempo Real:** Gráficos por Núcleo, Ano e Tipologia, além de monitoramento ao vivo do espaço total, utilizado e livre no disco do servidor Linux.
* ☁️ **Central de Upload em Lote:** Área *drag-and-drop* para arquivos `PDF`, `DOCX`, `XLSX`, `CSV` e `TIFF` (até 25 MB por arquivo), com aplicação de metadados em lote e exportação de inventário em Excel.
* 👁️ **Visualizador Nativo:** Leitura direta de PDFs e renderização tabular de planilhas `.xlsx`/`.xls` no próprio navegador, sem necessidade de download prévio.
* 🔐 **Controle de Acesso Baseado em Papéis:** Perfis de **Pesquisador** e **Administrador** persistidos em banco **MySQL** via **SQLAlchemy**.

---

## 🛠️ Arquitetura e Tecnologias

### Frontend (`/frontend`)
* **React 19 + TypeScript** com **Vite 8** e runtime **Bun**
* **TanStack Router / Start** + **Tailwind CSS 4** + **shadcn/ui**
* **Recharts** (Visualização analítica de dados) + **SheetJS (`xlsx`)**

### Backend (`/backend`)
* **Python 3.12 + FastAPI** servido em produção por **Gunicorn + Uvicorn Workers**
* **SQLAlchemy 2.0 + PyMySQL** conectado ao **MySQL 8.0** (`utf8mb4`) com fallback automático para SQLite em desenvolvimento local
* **Pandas + OpenPyXL + LXML** para processamento de planilhas e extração da árvore PCDM

### Infraestrutura DevOps (`/deploy`)
* **Ubuntu Server 24.04 LTS**
* **Systemd Daemons:** `fcja-ged-backend.service` e `fcja-ged-frontend.service` (inicialização automática no boot e *auto-restart*)
* **Nginx Reverse Proxy:** Exposição limpa na porta `80` (`192.168.1.115`) com suporte a uploads de até 50 MB
* **Armazenamento Seguro POSIX:** Diretório `/var/lib/fcja_dados/arquivos` com bit **SetGID (`chmod 2775`)** e grupo `www-data`

---

## 🚀 Implantação no Servidor Ubuntu 24.04 LTS (Produção)

### 1. Instalação Completa Automatizada (Fases 1 a 5)
No terminal do servidor Ubuntu:

```bash
sudo mkdir -p /opt/fcja-docs
sudo chown -R $USER:$USER /opt/fcja-docs
git clone https://github.com/manocoelho/FCJA-Docs.git /opt/fcja-docs

cd /opt/fcja-docs
chmod +x *.sh gerar_pastas.py
./implantar_ubuntu.sh
```

O orquestrador `implantar_ubuntu.sh` executa automaticamente:
1. [`instalar_dependencias.sh`](./instalar_dependencias.sh): Instala pacotes base via `apt`, sobe e provisiona o banco MySQL (`fcja_ged` / `ged_admin`) via [`setup_mysql.sql`](./setup_mysql.sql), cria o `.venv` do Python e instala pacotes do Frontend com `bun install`.
2. [`instalar_servicos.sh`](./instalar_servicos.sh): Compila a build de produção do Frontend, provisiona `/var/lib/fcja_dados` com permissões `2775` via [`gerar_pastas.py`](./gerar_pastas.py) e registra/inicia os serviços `fcja-ged-backend` e `fcja-ged-frontend` no Systemd.
3. [`configurar_nginx.sh`](./configurar_nginx.sh): Ativa o IP dedicado `192.168.1.115` via Netplan e configura o Proxy Reverso Nginx na porta `80`.

### 2. Comandos de Manutenção e Atualização no Servidor
Para atualizar o sistema no servidor após um novo `git push`:

```bash
cd /opt/fcja-docs && git pull origin main && (cd frontend && /usr/local/bin/bun run build) && sudo systemctl restart fcja-ged-backend fcja-ged-frontend
```

Para consultar status e logs dos serviços:
```bash
sudo systemctl status fcja-ged-backend fcja-ged-frontend
sudo journalctl -u fcja-ged-backend -u fcja-ged-frontend -f
```

---

## 💻 Execução em Ambiente Local (Desenvolvimento)

* **No Linux:** `./iniciar_fcja.sh`
* **No Windows:** Duplo clique em `instalar_dependencias.bat` (primeira vez) e depois em `Iniciar_FCJA.bat`.

---

## 🗂️ Estrutura de Diretórios

```text
FCJA-Docs/
├── backend/                  # API Python/FastAPI, modelos SQLAlchemy e rotas modulares
│   ├── routers/              # Módulos SRP: auth.py, documentos.py, sistema.py
│   ├── database.py           # Engine SQLAlchemy (MySQL + fallback SQLite)
│   ├── main.py               # Entrypoint FastAPI e configuração CORS LAN
│   ├── requirements.txt      # Dependências Python do Backend
│   └── .env.example          # Modelo de variáveis de ambiente
├── frontend/                 # Aplicação React/TypeScript/Vite
│   └── src/
│       ├── components/ged/   # Módulos do GED (Dashboard, Explorador, Upload, Login, Admin)
│       ├── lib/api.ts        # Cliente dinâmico de resolução de IP/Proxy
│       └── routes/index.tsx  # Layout principal Web Desktop
├── deploy/
│   ├── nginx/fcja-ged        # Configuração do Proxy Reverso Nginx (Porta 80)
│   └── systemd/              # Unidades fcja-ged-backend.service e fcja-ged-frontend.service
├── gerar_pastas.py           # Extrator PCDM e provisionador de diretórios POSIX (2775)
├── setup_mysql.sql           # Provisionamento do banco fcja_ged e usuário ged_admin
├── instalar_dependencias.sh  # Instalador automatizado Ubuntu (apt, MySQL, venv, Bun)
├── instalar_servicos.sh      # Instalador de serviços Systemd e build de produção
├── configurar_nginx.sh       # Configurador de IP secundário (Netplan) e Nginx
├── implantar_ubuntu.sh       # Orquestrador completo de implantação Linux
└── MANUAL_USO_PESQUISADORES.md # Guia de acesso e operação para a equipe da FCJA
```

---
*Desenvolvido por **Antonio Rocha Lima Filho** para a **Fundação Casa de José Américo (FCJA)**.*
