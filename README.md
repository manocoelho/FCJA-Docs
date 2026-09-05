# 📄 FCJA Docs | Gestão Eletrônica de Documentos

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

Sistema de Gestão Eletrônica de Documentos (GED) desenvolvido com arquitetura **Web Desktop** para a Fundação Casa de José Américo (FCJA). O sistema unifica o armazenamento local seguro, visualização de arquivos e dashboards analíticos em uma interface de Sistema Operacional de navegador.

## ✨ Destaques e Funcionalidades

*   🖥️ **Interface Web Desktop:** Navegação fluida e modular via barra lateral.
*   📂 **Explorador Hierárquico:** Navegação imersiva baseada na estrutura física dos arquivos (`Núcleo > Ano > Tipologia`).
*   📊 **Dashboard Analítico:** Monitoramento de KPIs do acervo e leitura em tempo real do espaço físico do HD (SSD) do servidor.
*   ☁️ **Central de Upload:** Área de *drag-and-drop* com aplicação de metadados em lote e tabela de gerenciamento com filtros independentes.
*   👁️ **Visualizador Integrado:** Renderização nativa de PDFs e conversão virtual de planilhas Excel (`.xlsx`) direto no navegador.
*   ⚙️ **Integração OS:** Comunicação direta com o sistema operacional para abertura do Windows Explorer via interface web.
*   🔐 **Controle de Acesso:** Autenticação local segura via SQLite (Perfis Admin e Pesquisador).

## 🛠️ Tecnologias Utilizadas

**Frontend:**
*   React + TypeScript
*   Tailwind CSS + shadcn/ui (Estilização e Componentes)
*   TanStack Router (Roteamento)
*   Lucide React (Ícones)

**Backend:**
*   Python
*   FastAPI + Uvicorn
*   SQLite (Banco de Dados embutido)

## 🚀 Como Rodar o Projeto (Instalação Automática)

O projeto conta com scripts `.bat` para configuração e execução automática em ambientes Windows, sem necessidade de configuração manual complexa.

**Pré-requisitos:** 
Ter o [Python](https://www.python.org/) (com a opção *Add to PATH* marcada) e o [Node.js](https://nodejs.org/) instalados na máquina.

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/FCJA-Docs.git](https://github.com/seu-usuario/FCJA-Docs.git)
   ```
2. **Instale as dependências (Apenas na primeira vez):**
   * Dê um duplo clique no arquivo `instalar_dependencias.bat`. Ele identificará seu ambiente e instalará as bibliotecas do Python e do React automaticamente.
3. **Inicie o Servidor:**
   * Dê um duplo clique no arquivo `Iniciar_FCJA.bat`. O sistema ligará o backend, o frontend e abrirá o navegador automaticamente na tela de login.

## 🗂️ Estrutura de Diretórios

```text
FCJA-Docs/
├── backend/               # API em Python, FastAPI e regras de negócio
├── frontend/              # Interface React, componentes UI e páginas
├── instalar_dependencias.bat # Script de setup de ambiente
└── Iniciar_FCJA.bat       # Script de inicialização do sistema
```

---
*Desenvolvido por **Antonio Rocha Lima Filho** para a Fundação Casa de José Américo.*