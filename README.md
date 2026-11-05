# 📄 FCJA Docs | Sistema de Gestão Eletrônica de Documentos (SIGAD / e-ARQ Brasil v2)

![Ubuntu](https://img.shields.io/badge/Ubuntu_24.04_LTS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

Sistema **Informatizado de Gestão Arquivística de Documentos (SIGAD)** desenvolvido sob medida para a **Fundação Casa de José Américo (FCJA)**. Projetado sob o Princípio da Responsabilidade Única (SRP), em total conformidade com as diretrizes do **e-ARQ Brasil v2 (CONARQ, 2022)**, **PCDM/TTD (Atividade-Fim e Atividade-Meio)** e integrado ao ecossistema de preservação digital de longo prazo (**Archivematica / RDC-Arq**) e difusão (**AtoM**).

---

## 🏛️ Ecossistema Arquivístico Digital da FCJA

O **FCJA Docs** atua de forma integrada ao ecossistema de preservação e difusão da Fundação na rede interna (`192.168.1.X`):

| Sistema | Papel Arquivístico | Endereço na Rede Local |
| :--- | :--- | :--- |
| **FCJA Docs (SIGAD)** | Gestão arquivística, protocolo, temporalidade TTD, dossiês e conector SIP | `http://192.168.1.115` *(ou `:8085`)* |
| **Archivematica** | Preservação digital sistêmica e geração de pacotes AIP (OAIS) | `http://192.168.1.132` |
| **Storage Service** | Gerenciamento de áreas de transferência e armazenamento | `http://192.168.1.132:8000` |
| **AtoM** | Difusão, descrição arquivística e acesso aos pacotes DIP | `http://192.168.1.110` |

---

## ✨ Destaques e Funcionalidades do SIGAD

* 🛡️ **Conformidade e-ARQ Brasil v2 (CONARQ, 2022):** Número Único de Protocolo (NUP), metadados diplomáticos obrigatórios, níveis de acesso LAI/LGPD e trilha de auditoria imutável (*append-only*).
* 🔒 **Fixidade Criptográfica SHA-256 (PREMIS v3):** Cálculo e verificação em tempo real da integridade de cada componente digital.
* 🗂️ **Plano de Classificação (PCD) & Tabela de Temporalidade (TTD):** Suporte a Atividade-Meio (APEPB) e Atividade-Fim da FCJA (Pesquisa Histórica, Curadoria e Difusão Cultural) com cálculo automatizado do ciclo vital (`CORRENTE`, `INTERMEDIARIA`, `APTO_RECOLHIMENTO`, `APTO_ELIMINACAO`).
* 📁 **Unidades de Arquivamento (Dossiês / Processos & Juntada):** Preservação da relação orgânica entre documentos arquivísticos com código padronizado `FCJA-DOS-AAAA-NNNN`.
* 📦 **Conector Automático OAIS → Archivematica:** Montagem de pacotes **BagIt (RFC 8493)** com `metadata.csv` (Dublin Core + e-ARQ), manifesto XML `METS` e eventos `PREMIS` sem retrabalho de digitação.
* 🔐 **Segurança e RBAC:** Autenticação via JWT (`HS256`) e senhas com hashing seguro PBKDF2-HMAC-SHA256 para perfis de Pesquisador, Arquivista e Administrador.
* 📜 **Termo de Eliminação Controlada:** Geração e impressão oficial de Termo de Eliminação e Edital de Ciência conforme o art. 9º da Lei 8.159/1991.

---

## 🛠️ Arquitetura e Tecnologias

### Frontend (`/frontend`)
* **React 19 + TypeScript** com **Vite 8** e runtime **Bun**
* **TanStack Router / Start** + **Tailwind CSS 4** + **shadcn/ui**
* **Recharts** (Visualização analítica de dados) + **SheetJS (`xlsx`)**

### Backend (`/backend`)
* **Python 3.12 + FastAPI** servido em produção por **Gunicorn + Uvicorn Workers**
* **SQLAlchemy 2.0 + PyMySQL** conectado ao **MySQL 8.0** (`utf8mb4`) com fallback automático para SQLite em desenvolvimento local
* **Módulos Isolados (SRP):** `/core`, `/models`, `/schemas`, `/services`, `/routers`

### Infraestrutura DevOps (`/deploy`)
* **Ubuntu Server 24.04 LTS**
* **Systemd Daemons:** `fcja-ged-backend.service` e `fcja-ged-frontend.service` (inicialização automática no boot e *auto-restart*)
* **Nginx Reverse Proxy:** Exposição limpa na porta `80` (`192.168.1.115`) com suporte a uploads de até 50 MB
* **Armazenamento Seguro POSIX:** Diretório `/var/lib/fcja_dados/arquivos` com bit **SetGID (`chmod 2775`)** e grupo `www-data`

---

## 🚀 Implantação no Servidor Ubuntu 24.04 LTS (Produção)

### 1. Instalação Completa Automatizada
No terminal do servidor Ubuntu:

```bash
sudo mkdir -p /opt/fcja-docs
sudo chown -R $USER:$USER /opt/fcja-docs
git clone https://github.com/manocoelho/FCJA-Docs.git /opt/fcja-docs

cd /opt/fcja-docs
chmod +x scripts/linux/*.sh
./scripts/linux/implantar_ubuntu.sh
```

O orquestrador `scripts/linux/implantar_ubuntu.sh` executa automaticamente:
1. [`scripts/linux/instalar_dependencias.sh`](./scripts/linux/instalar_dependencias.sh): Instala pacotes base via `apt`, provisiona o banco MySQL (`fcja_ged` / `ged_admin`) via [`scripts/database/setup_mysql.sql`](./scripts/database/setup_mysql.sql), cria o `.venv` do Python e instala pacotes do Frontend com `bun install`.
2. [`scripts/linux/instalar_servicos.sh`](./scripts/linux/instalar_servicos.sh): Compila a build de produção do Frontend, provisiona `/var/lib/fcja_dados` com permissões `2775` via [`scripts/linux/gerar_pastas.py`](./scripts/linux/gerar_pastas.py) e registra/inicia os serviços `fcja-ged-backend` e `fcja-ged-frontend` no Systemd.
3. [`scripts/linux/configurar_nginx.sh`](./scripts/linux/configurar_nginx.sh): Ativa o IP dedicado `192.168.1.115` via Netplan e configura o Proxy Reverso Nginx na porta `80`.

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

* **No Linux:** `./scripts/linux/iniciar_fcja.sh`
* **No Windows:** Duplo clique em `scripts\windows\instalar_dependencias.bat` (primeira vez) e depois em `scripts\windows\Iniciar_FCJA.bat`.

---

## 🗂️ Estrutura de Diretórios Organizada

```text
FCJA-Docs/
├── backend/                  # API Python/FastAPI, modelos SQLAlchemy e rotas modulares
│   ├── core/                 # Segurança (PBKDF2, JWT HS256) e Dependências RBAC
│   ├── models/               # Entidades: Documento, Componente, Evento, PCD/TTD, Dossiê, SIP, Usuário
│   ├── schemas/              # Pydantic Schemas tipados
│   ├── services/             # Regras de Negócio: Fixidade, Protocolo, Auditoria, TTD, Dossiês, SIP Builder
│   ├── routers/              # Endpoints: auth, documentos, pcd_ttd, dossies, archivematica, auditoria, sistema
│   ├── database.py           # Conexão MySQL com fallback SQLite e auto-migração
│   ├── main.py               # Entrypoint FastAPI e configuração CORS LAN
│   └── requirements.txt      # Dependências Python do Backend
├── frontend/                 # Aplicação React/TypeScript/Vite/Bun
│   └── src/
│       ├── components/ged/   # Módulos: Dashboard, Explorador, Upload, Gestão PCD/TTD, Archivematica, Auditoria
│       ├── lib/              # Clientes de API e Formatadores (api, auth, sigad-api, pcd-dossie-api, archivematica-api)
│       ├── hooks/            # Hooks de Estado (useAcervoSigad, useGestaoArquivistica, useArchivematicaSigad)
│       └── routes/index.tsx  # Layout principal Web Desktop do SIGAD FCJA
├── deploy/                   # Configurações de infraestrutura
│   ├── nginx/fcja-ged        # Configuração do Proxy Reverso Nginx (Porta 80)
│   └── systemd/              # Unidades fcja-ged-backend.service e fcja-ged-frontend.service
├── docs/                     # Manuais, guias e referências arquivísticas
│   ├── manuais/              # MANUAL_USO_PESQUISADORES.md e LEIA-ME.txt
│   └── referencias/          # Planilhas base de PCDM APEPB e Tipologias Documentais (.xlsx)
├── scripts/                  # Scripts operacionais e de automação
│   ├── linux/                # implantar_ubuntu.sh, instalar_dependencias.sh, instalar_servicos.sh, iniciar_fcja.sh, gerar_pastas.py, etc.
│   ├── windows/              # Iniciar_FCJA.bat e instalar_dependencias.bat
│   └── database/             # Scripts SQL de provisionamento (setup_mysql.sql)
└── README.md                 # Documentação técnica geral do repositório
```

---
*Desenvolvido para a **Fundação Casa de José Américo (FCJA)**.*
