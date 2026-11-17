# Manual Oficial de Operação e Referência — SIGAD FCJA (v2.5)

**Sistema Informatizado de Gestão Arquivística de Documentos da Fundação Casa de José Américo (FCJA)**  
**Código CONARQ:** `BR-PBFCJA-RADC`

---

## Quadro Editável de Endereços de Acesso ao Servidor Local da FCJA

> **ATENÇÃO (CAMPO EDITÁVEL PARA IMPLANTAÇÃO LOCAL):**  
> Assim que o sistema for hospedado no servidor local da Fundação Casa de José Américo (via `Docker Compose`), atualize os campos abaixo (ou edite diretamente os campos interativos na Página 1 de `docs/manuais/GUIA_COMPLETO_SIGAD_FCJA.pdf`):
>
> - **1. Endereço Principal do SIGAD FCJA (URL / IP):** `http://[IP-DO-SERVIDOR-LOCAL]:8085`
> - **2. Endereço Alternativo / Ambiente Local:** `http://192.168.1.115 (ou http://localhost:8080)`
> - **3. Status Atual da Hospedagem / Servidor:** `Aguardando implantação local (Docker Compose)`
> - **4. Servidores RDC-Arq Integrados:** `AM: http://192.168.1.132 | SS: http://192.168.1.132:8000 | AtoM: http://192.168.1.110`

---

## 1. Perfis de Acesso (RBAC Atualizado)

| Perfil | Usuário Inicial | Senha | Telas e Funcionalidades Liberadas |
| :--- | :--- | :--- | :--- |
| **Pesquisador FCJA** (`pesquisador`) | `barbara`, `andre`, `pablo`, `josilene` | `1980` | Acesso exclusivo às telas **1. Dashboard Analítico** e **2. Explorador do Acervo** (navegação nas 4 visões arquivísticas, visualização de PDFs e Planilhas Multi-Abas, verificação de fixidade SHA-256 e exportação de Planilha CSV e Relatório PDF). |
| **Arquivista SIGAD** (`arquivista`) | `arquivista` | `1980` | Acesso a **6 telas**: Dashboard, Explorador, **Captura & Acervo**, **PCD, TTD & Dossiês**, **Conector Archivematica 1.18.0** e **Auditoria & Fixidade** (incluindo emissão de Termos de Eliminação). |
| **Administrador Geral** (`admin`) | `antonio` | `1980` | Acesso total às **7 telas**, incluindo **Gerenciar Acessos** (criação de usuários e gestão de perfis RBAC). |

---

## 2. Resumo das Telas e Novas Funcionalidades

1. **Dashboard Analítico:** Indicadores executivos, saúde de fixidade SHA-256 (PREMIS), ciclo vital arquivístico (Corrente, Intermediário, Guarda Permanente RDC-Arq) e gráficos interativos.
2. **Explorador Arquivístico do Acervo (4 Visões):** Navegação por *1. Núcleo Produtor (Fundo)*, *2. Plano de Classificação (PCD & TTD)*, *3. Dossiês & Processos* e *4. Ciclo Vital, OAIS & Sigilo*, com exportação direta de **Planilha CSV** e **Relatório PDF**.
3. **Visualizador Avançado de Planilhas Multi-Abas (`.xlsx` / `.csv`):** Navegação entre todas as abas/guias da planilha (barra superior e inferior com cores das abas), barra de fórmulas (`fx`), destaque de células calculadas (`Destacar fx`), cores originais de fundo/fonte e estatísticas automáticas (`Soma`, `Média`, `Mín`, `Máx`).
4. **Estação de Captura & Indexação Arquivística:** Indicadores em tempo real no topo, zona de depósito compactável, edição rápida de título na fila, metadados divididos em 3 blocos lógicos (*A. Cronologia & NOBRADE*, *B. Autoria, Status, LAI/LGPD & Dossiê*, *C. Classificação PCD & Atividade*) e **Busca Rápida Inteligente no PCD** por código ou assunto.
5. **PCD, TTD & Dossiês (3 Sub-Abas):**
   - *Sub-aba 1 (Dossiês & Processos):* Criação de pastas oficiais numeradas, juntada de documentos com vínculo orgânico e encerramento para recolhimento.
   - *Sub-aba 2 (Catálogo PCD & TTD):* Consulta e cadastro de classes de Atividade-Fim (FCJA) e Atividade-Meio (APEPB) com seus prazos de guarda.
   - *Sub-aba 3 (Avaliação Temporal & Recolhimento):* Triagem automática separando documentos de Guarda Permanente (Archivematica) e Guarda Temporária.
6. **Conector Archivematica 1.18.0 (`192.168.1.132`) & Storage Service (`:8000`):** Geração de pacotes `Standard Transfer` (`objects/`, `metadata/metadata.csv`, `metadata/rights.csv` com 18 colunas LAI, `metadata/premis.xml`), tabela FPR (1.639 formatos PRONOM), pipeline de 8 etapas, inspetor de CSV/XML em tela e descoberta automática de Transfer Source na porta `8000`.
7. **Auditoria & Fixidade e Gerenciar Acessos:** Varredura SHA-256 em lote, Trilha Imutável de Eventos, impressão de Termos de Eliminação e gestão de usuários.
