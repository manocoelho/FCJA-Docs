# Manual de Acesso e Operação: Sistema de Gestão Eletrônica de Documentos (FCJA Docs)

Este guia reúne os endereços de acesso, credenciais e instruções passo a passo de utilização do sistema **FCJA Docs (GED)**, implantado no servidor local da **Fundação Casa de José Américo (FCJA)**. O material foi estruturado para consulta diária da equipe de pesquisadores e referência de operação arquivística.

---

## 1. Identificação Institucional e Objetivo do Sistema

O **FCJA Docs** é o sistema oficial de **Gestão Eletrônica de Documentos (GED)** da Fundação, responsável pela organização, classificação arquivística (padrão PCDM/APEPB), guarda segura no servidor e acompanhamento estatístico da produção documental dos núcleos de pesquisa.

* **Instituição:** Fundação Casa de José Américo (FCJA)
* **Projeto Vinculado:** Repositório Arquivístico Digital Confiável da produção do Projeto Preservação e Difusão do Acervo da FCJA (`BR-PBFCJA-RADC` — padrão CONARQ)
* **Formatos Suportados:** `PDF`, `DOCX` (Word), `XLSX` / `CSV` (Excel) e `TIFF` (Imagens de preservação), com limite de até **25 MB por arquivo**.

---

## 2. Ecossistema Digital da Fundação (Como os sistemas trabalham juntos)

O ambiente digital da FCJA opera em etapas complementares dentro da rede interna da Fundação:

* **FCJA Docs — GED (`192.168.1.115`):** Porta de entrada da produção documental e administrativa dos núcleos de pesquisa. Realiza o cadastro em lote, aplica o código de classificação do Plano de Classificação de Documentos (PCDM), organiza as pastas automaticamente no servidor por **Núcleo > Ano > Tipologia** e gera relatórios em tempo real.
* **Archivematica (`192.168.1.132`):** Sistema de preservação digital sistêmica que processa pacotes de guarda permanente (AIP).
* **Storage Service (`192.168.1.132:8000`):** Painel auxiliar de gerenciamento de espaço e áreas de transferência do Archivematica.
* **AtoM (`192.168.1.110`):** Portal de descrição arquivística e difusão para consulta aos pacotes processados (DIP).

---

## 3. Acesso Diário pelo Navegador (Uso da Equipe)

Para acessar o **FCJA Docs**, basta abrir qualquer navegador de internet (Google Chrome, Brave, Microsoft Edge ou Firefox) em um computador ou notebook conectado à **rede interna da Fundação** e digitar na barra de endereços:

* **Endereço Principal:** `http://192.168.1.115`
* **Endereço Alternativo (Contingência):** `http://192.168.1.110:8085`

### 3.1. Quadro Geral dos Sistemas na Rede da Fundação

| Sistema | Função no Acervo | Endereço no Navegador |
| :--- | :--- | :--- |
| **FCJA Docs (GED)** | Gestão eletrônica de documentos, upload e classificação PCDM | `http://192.168.1.115` |
| **Archivematica** | Preservação digital (pacotes AIP) | `http://192.168.1.132` |
| **Storage Service** | Gestão de espaço do Archivematica | `http://192.168.1.132:8000` |
| **AtoM** | Catalogação e difusão (pacotes DIP) | `http://192.168.1.110` |

### 3.2. Credenciais Individuais do FCJA Docs

| Pesquisador(a) | Usuário (Login) | Senha Inicial | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| **Antonio** | `antonio` | `1980` | Administrador (Total) |
| **Bárbara** | `barbara` | `1980` | Pesquisador |
| **André** | `andre` | `1980` | Pesquisador |
| **Pablo** | `pablo` | `1980` | Pesquisador |
| **Josilene** | `josilene` | `1980` | Pesquisador |

> **Nota:** Novos pesquisadores podem ser cadastrados ou ter suas senhas alteradas a qualquer momento pelo Administrador na aba **Gerenciar Acessos** dentro do próprio sistema.

---

## 4. Guia Passo a Passo de Uso do Sistema

Ao entrar no sistema, você verá o menu lateral esquerdo dividido nas seções abaixo:

### 4.1. Dashboard Analítico (Visão Geral)
* Exibe quatro indicadores principais em tempo real:
  1. **Total no Acervo:** Quantidade total de documentos cadastrados no servidor.
  2. **Tamanho do Acervo:** Volume ocupado pelos arquivos enviados.
  3. **Espaço Utilizado:** Uso total do disco do servidor.
  4. **Espaço Livre:** Capacidade disponível no servidor para novos envios.
* Apresenta gráficos interativos de distribuição por **Núcleo de Pesquisa**, **Volume por Ano** e **Tipologias Documentais**.
* No botão **Filtros Avançados** (canto superior direito), é possível filtrar os gráficos por pasta/código PCDM, tipologia, núcleo e período de anos.

### 4.2. Explorador de Arquivos (Navegação em Pastas)
* Funciona como o explorador de pastas do computador, refletindo a organização física no servidor da Fundação:
  * **Nível 1 (Coluna Esquerda):** Clique no **Núcleo de Pesquisa** desejado (ou em *Armazenamento no Servidor* para ver todos).
  * **Nível 2 (Painel Direito):** Dê um **duplo clique** na pasta do **Ano** (ex: `2026`).
  * **Nível 3:** Dê um **duplo clique** na pasta da **Tipologia** (ex: `Relatório`, `Ofício`, `Planilha`).
  * **Nível 4 (Documento):** Dê um **duplo clique** sobre o arquivo para abri-lo imediatamente no visualizador integrado da tela.

### 4.3. Central de Upload (Como Cadastrar Documentos)
Esta é a tela principal de trabalho para envio e classificação de documentos:

* **Passo 1 — Selecionar ou Arrastar os Arquivos:**
  * Arraste um ou vários arquivos do seu computador para a área tracejada (ou clique em **Selecionar arquivos no PC**).
* **Passo 2 — Preencher a Classificação Arquivística (Metadados):**
  1. **Data do Documento:** Informe a data de referência (o sistema extrai o ano automaticamente).
  2. **Núcleo de Pesquisa:** Escolha o núcleo responsável (a **Sigla CONARQ** correspondente é preenchida automaticamente no campo ao lado).
  3. **Tipo de Atividade:** Selecione **Atividade-Meio** (ou *Atividade-Fim*).
  4. **Código de Classificação (PCDM):** Navegue pelos seletores encadeados: **Função > Subfunção > Atividade > Código/Assunto**.
  5. **Tipologia Documental:** Selecione a espécie/tipologia documental na lista padronizada (o sistema já sugere automaticamente a tipologia compatível com o código escolhido).
* **Passo 3 — Aplicar e Salvar no Servidor:**
  * Caso queira renomear um arquivo antes do envio, basta editar o nome diretamente na lista de arquivos pendentes.
  * Clique em **Aplicar aos marcados** (caso esteja configurando múltiplos arquivos de uma vez) e, em seguida, clique no botão azul **Salvar no Banco**.

### 4.4. Gerenciamento do Acervo (Busca, Visualização, Edição e Exportação)
Logo abaixo da área de upload encontra-se a tabela **Gerenciamento do Acervo**:
* **Busca Rápida:** Digite qualquer termo na caixa de busca (ID, código PCDM, nome do arquivo ou tipologia).
* **Filtrar Tabela:** Filtra os documentos listados por pasta PCDM, tipologia, núcleo ou intervalo de anos.
* **Exportar:** Gera e baixa automaticamente uma planilha Excel (`.xlsx`) com o inventário completo dos documentos listados na tabela.
* **Ações por Documento (Ícones à direita de cada linha):**
  * **Lápis (Editar):** Permite corrigir o nome, a tipologia, o ano ou o núcleo do documento (o sistema move o arquivo automaticamente para a nova pasta correspondente no servidor).
  * **Olho (Visualizar):** Abre arquivos **PDF** e planilhas **Excel (`.xlsx`)** diretamente na tela do navegador, sem precisar baixar.
  * **Seta (Download):** Baixa uma cópia do arquivo original para o seu computador.
  * **Lixeira (Excluir):** Remove o documento do banco de dados e apaga o arquivo físico do servidor (também é possível excluir vários itens marcando as caixas de seleção à esquerda).

### 4.5. Gerenciar Acessos (Exclusivo para Administradores)
* Permite cadastrar novos membros da equipe informando **Nome Completo**, **Login**, **Senha** e **Nível de Acesso** (*Pesquisador* ou *Administrador*).
* Permite alterar o nível de permissão, editar dados cadastrais/senhas ou revogar o acesso de usuários.

---

## 5. Tabela de Siglas Padronizadas por Núcleo de Pesquisa

O sistema vincula automaticamente cada documento enviado à sua respectiva sigla institucional:

| Núcleo de Pesquisa | Sigla Automática no Sistema |
| :--- | :--- |
| Manuscritos de José Américo de Almeida: identificação e descrição de documentos | `BR_PB_FCJA_GEDA_GOP_PPMD_NMJAA` |
| O modernismo na Paraíba a revista Era Nova e a Novela Reflexões de uma cabra | `BR_PB_FCJA_GEDA_GOP_PPMD_NRENN` |
| A Paraíba e seus problemas: permanências e transformações | `BR_PB_FCJA_GEDA_GOP_PPMD_NPBP` |
| Partituras de uma história pela democracia: conexões entre José Siqueira e José Américo | `BR_PB_FCJA_GEDA_GOP_PPMD_NJSJAA` |
| Acervo audiovisual da FCJA: imagem e memória | `BR_PB_FCJA_GEDA_GOP_PPMD_NAFCJA` |
| Os Modernismos na Paraíba e o Circuito de Comunicação da Revista Era Nova (1921-1926) | `BR_PB_FCJA_GEDA_GOP_PPMD_NMREN` |
| De A Paraíba e seus problemas à A Bagaceira: Itinerários literários de José Américo | `BR_PB_FCJA_GEDA_GOP_PPMD_NPBPB` |
| Maestro José Siqueira: Memórias da Música para o futuro | `BR_PB_FCJA_GEDA_GOP_PPMD_NMJS` |
| 1930 A caminho do centenário: convergências bibliográficas e fontes digitais (BR 1930) | `BR_PB_FCJA_GEDA_GOP_PPMD_NBR1930` |
| Modernização digital do acervo da FCJA: estruturando a preservação e o acesso | `BR_PB_FCJA_GEDA_GOP_PPMD_NMD` |
| Imprensa e cultura na Paraíba: revistas Ilustração e Manaíra (1930-1940) | `BR_PB_FCJA_GEDA_GOP_PPMD_NRIM` |
| Por uma cartografia dos lugares de consciência na Paraíba: memória e resistência | `BR_PB_FCJA_GEDA_GOP_PPMD_NCMR` |
| Repositório Arquivístico Digital Confiável (Projeto Preservação e Difusão FCJA) | `BR_PB_FCJA_GEDA_GOP_PPMD_NRDCARQ` |
| Mapeamento do Patrimônio Arqueológico da Paraíba | `BR_PB_FCJA_GEDA_GOP_PPMD_NMAPB` |
| Entre Termos e Conceitos: Pesquisa Documental sobre Educação Patrimonial | `BR_PB_FCJA_GEDA_GOP_PPMD_NEP` |
| Sustentabilidade e Diversidade: Pesquisa-ação na Mata da Falésia de Cabo Branco | `BR_PB_FCJA_GEDA_GOP_PPMD_NMFCB` |

---

## 6. Solução Rápida de Problemas Comuns

* **Arquivo recusado no Upload:**
  * Verifique se o arquivo está em um dos formatos aceitos (`PDF`, `DOCX`, `XLSX`, `CSV` ou `TIFF`) e se possui menos de **25 MB**.
* **Página não carrega (`http://192.168.1.115`):**
  * Confirme se o seu computador ou notebook está conectado ao Wi-Fi ou cabo da **mesma rede interna da Fundação** e se o servidor principal encontra-se ligado. Caso necessário, teste também pelo endereço alternativo `http://192.168.1.110:8085`.
* **Esqueci minha senha ou preciso de novo usuário:**
  * Solicite ao Administrador do sistema (`antonio`) a redefinição imediata através do menu **Gerenciar Acessos**.
