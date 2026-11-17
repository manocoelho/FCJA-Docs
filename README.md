# 📄 SIGAD FCJA | Sistema Informatizado de Gestão Arquivística de Documentos

![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Ubuntu](https://img.shields.io/badge/Ubuntu_24.04_LTS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

Sistema **Informatizado de Gestão Arquivística de Documentos (SIGAD)** desenvolvido sob medida para a **Fundação Casa de José Américo (FCJA)** (`BR-PBFCJA-RADC`). Projetado sob o Princípio da Responsabilidade Única (SRP), em conformidade com as diretrizes do **CONARQ**, da norma **ISO 14721 (OAIS)** e da **Resolução CONARQ nº 51/2023 (RDC-Arq)**, operando de forma integrada ao **Archivematica 1.18.0 (`192.168.1.132`)**, ao **Storage Service (`:8000`)** e ao portal de difusão **AtoM (`192.168.1.110`)**.

---

## 🏛️ Ecossistema Arquivístico Digital da FCJA

O **SIGAD FCJA** atua como a porta de entrada e gestão do ciclo vital documental, integrado à cadeia de preservação e difusão da Fundação:

| Sistema | Papel Arquivístico | Endereço na Rede Local |
| :--- | :--- | :--- |
| **SIGAD FCJA** | Captura, Protocolo NUP, PCD/TTD, Dossiês, Fixidade SHA-256 e Conector SIP | `http://[IP-DO-SERVIDOR-LOCAL]:8085` *(ou `http://192.168.1.115`)* |
| **Archivematica 1.18.0** | Preservação digital sistêmica, validação FPR (1.639 PRONOM) e geração de pacotes AIP | `http://192.168.1.132` |
| **Storage Service** | Gerenciamento de áreas de Transfer Source (`purpose=TS`) e armazenamento AIP | `http://192.168.1.132:8000` |
| **AtoM** | Descrição arquivística multinível (`NOBRADE` / `ISAD(G)`) e difusão de pacotes DIP | `http://192.168.1.110` |

---

## ✨ Principais Funcionalidades (Versão 2.5)

* 🛡️ **Captura & Indexação Arquivística com Busca Rápida no PCD:**
  * Atribuição automática de **Número Único de Protocolo (`NUP`)** no padrão `FCJA.<SIGLA>.<ANO>.<SEQUENCIAL>`, cálculo em *stream* de **Fixidade Criptográfica SHA-256 (PREMIS)** e validação de *magic bytes*.
  * **Busca Rápida Inteligente no Plano de Classificação (PCD):** Pesquisa instantânea por código ou palavra-chave (ex.: `Despacho`, `Relatório`, `001.01.04`) que preenche automaticamente *1. Função*, *2. Subfunção*, *3. Atividade*, *4. Código PCD* e *5. Tipologia*.
  * Suporte completo a **Documentos Avulsos** (sem vinculação forçada) ou juntada imediata a **Dossiês Abertos**.
* 🧭 **Explorador Arquivístico Multinível (4 Visões) + Exportação PDF/CSV:**
  * Navegação estruturada por: **1. Núcleo Produtor (Fundo/Subfundo NOBRADE)**, **2. Plano de Classificação (PCD & TTD)**, **3. Dossiês & Processos (Unidades de Arquivamento)** e **4. Ciclo Vital, OAIS & Sigilo (LAI/LGPD)**.
  * **Painel Inspetor Lateral** com diagnóstico em tempo real e exportação imediata de **Planilha CSV** e **Relatório PDF Institucional Nativo**.
* 📊 **Visualizador Avançado de Planilhas Multi-Abas (`.xlsx` / `.csv`):**
  * Leitura completa de todas as abas/guias da planilha (barra superior e inferior com setas `<` `>` e cores originais das guias), **barra de fórmulas (`fx`)**, alternância **`Exibir =Fórmulas`** e **`Destacar fx`**, preservação das **cores originais de fundo e fonte das células** (RGB e temas Office) e estatísticas automáticas (`Contagem`, `Soma`, `Média`, `Mín`, `Máx`).
* 📁 **Gestão de Unidades de Arquivamento (Dossiês / Processos), PCD & TTD:**
  * Abertura, encerramento, reabertura e **exclusão segura de dossiês** (ao excluir um dossiê ou desvincular uma peça, os documentos retornam automaticamente ao status de *Documento Avulso* sem serem apagados do acervo).
  * Catálogo parametrizável de classes de **Atividade-Fim (FCJA — Guarda Permanente)** e **Atividade-Meio (APEPB)** com avaliação temporal automática.
* 📦 **Conector Automático Archivematica 1.18.0 (`:80`) & Storage Service (`:8000`):**
  * Montagem de pacotes na estrutura oficial **`Standard Transfer`** exigida pela API `POST /api/v2beta/package`:
    * `objects/`: Cópias binárias fiéis dos arquivos originais do acervo;
    * `metadata/metadata.csv`: UTF-8, `filename` (`objects/...`) na 1ª coluna, todos os **15 elementos Dublin Core**, datas em ISO 8601 (`YYYY-MM-DD`), `dc.type` no vocabulário controlado DCMI (`Text`, `Image`, `Dataset`, `Sound`, `MovingImage`), `dc.language = pt-BR`, qualificadores `dcterms.isPartOf` e `dcterms.accessRights`, além das colunas customizadas da FCJA (`classificacao`, `prazo_guarda`, `destinacao_prevista`);
    * `metadata/rights.csv`: As **18 colunas PREMIS Rights** na ordem oficial exigida por `POST /api/v2beta/validate/rights/` (mapeando a Lei nº 12.527/2011 — LAI);
    * `metadata/premis.xml` (PREMIS v3 XML), `mets_earq_manifest.xml` e `submissionDocumentation/`.
  * **Tabela FPR (1.639 Formatos PRONOM / Siegfried)**, **Rastreador de 8 Etapas**, **Descoberta Automática de Transfer Source (`GET /api/v2/location/?purpose=TS`)** e **Inspetor de CSV/XML** integrado na tela.
* 🔐 **Governança RBAC e Trilha de Auditoria Imutável:**
  * Autenticação JWT (`HS256`) e senhas com derivação criptográfica `PBKDF2-HMAC-SHA256` (600.000 iterações).
  * **Pesquisador (`pesquisador`):** Acesso focado ao *Dashboard Analítico* e ao *Explorador do Acervo*.
  * **Arquivista (`arquivista`):** Acesso operacional completo à captura, dossiês/TTD, conector Archivematica, auditoria de fixidade em lote e emissão de **Termos de Eliminação**.
  * **Administrador (`admin`):** Acesso total às 7 telas, incluindo **Gerenciar Acessos**.

---

## 🐳 Implantação no Servidor Local via Docker Compose (Recomendado)

O sistema conta com orquestração completa em [`docker-compose.yml`](./docker-compose.yml) composta por 4 containers isolados (`fcja_sigad_db` MySQL 8.0, `fcja_sigad_backend` FastAPI + Gunicorn/Uvicorn, `fcja_sigad_frontend` React 19 SSR e `fcja_sigad_gateway` Nginx na porta `8085`).

### Subir com 1 Comando
* **No Windows:** Dê duplo clique em [`scripts/windows/Iniciar_Docker_FCJA.bat`](./scripts/windows/Iniciar_Docker_FCJA.bat)
* **No Linux (Ubuntu Server):**
  ```bash
  chmod +x scripts/linux/iniciar_docker_fcja.sh
  ./scripts/linux/iniciar_docker_fcja.sh
  ```
* **Ou via terminal direto (Windows / Linux):**
  ```bash
  docker compose up -d --build
  ```

Após a inicialização, acesse no navegador:
* **Gateway Unificado (Produção Local):** `http://localhost:8085` *(ou `http://[IP-DO-SERVIDOR]:8085` na rede da Fundação)*
* **Frontend Direto:** `http://localhost:8080`
* **API Backend FastAPI (Swagger/OpenAPI):** `http://localhost:8000/docs`

---

## 💻 Execução em Ambiente Local (Sem Docker / Desenvolvimento)

* **No Windows:** Duplo clique em `scripts\windows\instalar_dependencias.bat` (primeira vez) e depois em `scripts\windows\Iniciar_FCJA.bat`.
* **No Linux:** `./scripts/linux/iniciar_fcja.sh`

---

## 📚 Manuais e Guias Oficiais Editáveis (`/docs/manuais`)

O repositório inclui a documentação oficial completa da **Versão 2.5** em múltiplos formatos (com **Quadro Editável de Endereços do Servidor Local** na Página 1):

* 📕 **Guia Oficial em PDF (com campos de formulário `AcroForm` editáveis):** [`docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.pdf`](./docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.pdf)
* 📘 **Guia Editável em Microsoft Word OpenXML (`.docx`):** [`docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.docx`](./docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.docx)
* 📘 **Guia Editável em Microsoft Word Compatível (`.doc`):** [`docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.doc`](./docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.doc)
* 🌐 **Gerador Interativo HTML (com barra de substituição automática de IP):** [`docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.html`](./docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.html)
* 📝 **Manual Rápido em Markdown:** [`docs/manuais/MANUAL_USO_PESQUISADORES.md`](./docs/manuais/MANUAL_USO_PESQUISADORES.md)

---

## 🗂️ Estrutura de Diretórios (Modularização SRP)

```text
FCJA-Docs/
├── docker-compose.yml        # Orquestração dos 4 containers (MySQL 8, Backend, Frontend e Nginx :8085)
├── .env.example              # Variáveis de ambiente de portas, banco e integração Archivematica 1.18.0
├── backend/                  # API Python 3.12 + FastAPI + SQLAlchemy 2.0 + OpenPyXL
│   ├── Dockerfile            # Imagem de produção do Backend (Gunicorn + Uvicorn Workers)
│   ├── core/                 # Segurança (PBKDF2-SHA256, JWT HS256) e Dependências RBAC
│   ├── models/               # Entidades: Documento, Componente, Evento, PCD/TTD, Dossiê, SIP, Usuário
│   ├── schemas/              # Pydantic Schemas tipados
│   ├── services/             # Serviços: Fixidade, Protocolo, Auditoria, TTD, Dossiês, SIP Builder, FPR 1.18, Planilha
│   ├── routers/              # Endpoints: auth, documentos, pcd_ttd, dossies, archivematica, auditoria, sistema
│   ├── database.py           # Conexão MySQL com fallback SQLite e auto-migração transparente
│   └── main.py               # Entrypoint FastAPI e configuração CORS LAN/Docker
├── frontend/                 # Aplicação Web React 19 + TypeScript + TanStack Start + Vite 8 + Tailwind CSS 4
│   ├── Dockerfile            # Imagem multi-stage de produção do Frontend
│   └── src/
│       ├── components/ged/   # Telas: Dashboard, Explorador, Upload, Gestão PCD/TTD, Archivematica, Auditoria, Planilha
│       ├── lib/              # Clientes de API, Parser OOXML Multi-Abas, Gerador PDF Nativo e Formatadores
│       ├── hooks/            # Hooks de Estado (useAcervoSigad, useDashboardSigad, useGestaoArquivistica, useArchivematicaSigad)
│       └── routes/index.tsx  # Shell principal e controle de rotas por perfil RBAC
├── deploy/                   # Configurações de Proxy Reverso e Systemd
│   ├── docker/nginx.conf     # Configuração do Gateway Nginx para o Docker Compose
│   ├── nginx/fcja-ged        # Configuração Nginx para instalação bare-metal no Ubuntu
│   └── systemd/              # Unidades fcja-ged-backend.service e fcja-ged-frontend.service
├── docs/                     # Manuais oficiais (.pdf, .docx, .doc, .html, .md) e referências arquivísticas
└── scripts/                  # Scripts de automação (Docker, Windows, Linux, Banco de Dados e Gerador Word)
```

---
*Desenvolvido para a **Fundação Casa de José Américo (FCJA)** — João Pessoa, Paraíba.*
