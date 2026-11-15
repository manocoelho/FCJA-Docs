import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLASSES_FIM_PADRAO,
  NUCLEOS,
  SIGLA_POR_NUCLEO,
  type Doc,
} from "@/components/ged/data";
import {
  buscarClassesPcd,
  buscarDossies,
  type ClassePcdItem,
  type DossieItem,
} from "@/lib/pcd-dossie-api";

export type ModoExploradorSigad = "nucleo" | "pcd" | "dossies" | "ciclo_vital";

export type OrdenacaoExplorador =
  | "protocolo"
  | "nome_asc"
  | "nome_desc"
  | "ano_desc"
  | "ano_asc"
  | "tamanho_desc"
  | "classe_pcd";

export type ModoVisualizacaoExplorador = "lista" | "grade";

export type RecorteCicloVital =
  | "TODOS"
  | "FASE_CORRENTE"
  | "FASE_INTERMEDIARIA"
  | "GUARDA_PERMANENTE"
  | "ELIMINACAO_PREVISTA"
  | "RECOLHIDOS_OAIS"
  | "ACESSO_OSTENSIVO"
  | "ACESSO_RESTRITO_LAI_LGPD";

export interface PassoBreadcrumbExplorador {
  id: string;
  rotulo: string;
  codigo?: string | undefined;
  ativo: boolean;
  onClick: () => void;
}

export interface ItemPastaExplorador {
  id: string;
  titulo: string;
  subtitulo: string;
  codigoBadge?: string | undefined;
  tipoPasta: "nucleo" | "ano" | "tipologia" | "classe_pcd" | "dossie" | "ciclo";
  statusBadge?: string | undefined;
  corTema: "blue" | "purple" | "emerald" | "amber" | "teal" | "slate";
  quantidadeDocs: number;
  tamanhoTotalBytes: number;
  guardaPermanenteCount: number;
  fixidadeOkCount: number;
  restritosCount: number;
  onAbrir: () => void;
}

function resumirDocsParaPasta(docs: Doc[]) {
  let tamanhoTotalBytes = 0;
  let guardaPermanenteCount = 0;
  let fixidadeOkCount = 0;
  let restritosCount = 0;

  for (const d of docs) {
    tamanhoTotalBytes += d.tamanho || 0;
    const ehFim =
      d.tipoAtividade === "Atividade-Fim" ||
      (d.codigoClassificacao || "").startsWith("FIM.");
    const guardaPerm =
      d.destinacaoPrevista === "GUARDA_PERMANENTE" || (!d.destinacaoPrevista && ehFim);
    if (guardaPerm) guardaPermanenteCount++;
    if (d.fixidadeVerificada !== false) fixidadeOkCount++;
    if (d.nivelAcesso === "RESTRITO_LGPD" || d.nivelAcesso === "SIGILOSO_LAI") {
      restritosCount++;
    }
  }

  return {
    quantidadeDocs: docs.length,
    tamanhoTotalBytes,
    guardaPermanenteCount,
    fixidadeOkCount,
    restritosCount,
  };
}

export function useExploradorSigad(acervo: Doc[]) {
  // 1. Modo principal de navegação arquivística
  const [modoNavegacao, setModoNavegacao] = useState<ModoExploradorSigad>("nucleo");

  // 2. Estados de caminho por perspectiva
  // 2.1 Perspectiva: Fundo / Núcleo Produtor (Núcleo -> Ano -> Tipologia)
  const [pastaNucleo, setPastaNucleo] = useState<string>("Todos");
  const [subPastaAno, setSubPastaAno] = useState<number | null>(null);
  const [subPastaTipo, setSubPastaTipo] = useState<string | null>(null);

  // 2.2 Perspectiva: Plano de Classificação (Escopo Atividade -> Classe PCD)
  const [escopoAtividadePcd, setEscopoAtividadePcd] = useState<
    "TODAS" | "Atividade-Fim" | "Atividade-Meio"
  >("TODAS");
  const [classePcdSelecionada, setClassePcdSelecionada] = useState<string | null>(null);

  // 2.3 Perspectiva: Unidades de Arquivamento (Filtro Status -> Dossiê/Processo ou Avulsos)
  const [filtroStatusDossie, setFiltroStatusDossie] = useState<
    "TODOS" | "ABERTO" | "ENCERRADO" | "RECOLHIDO_ARCHIVEMATICA" | "AVULSOS"
  >("TODOS");
  const [dossieSelecionadoCodigo, setDossieSelecionadoCodigo] = useState<string | null>(
    null
  );

  // 2.4 Perspectiva: Ciclo Vital, Preservação & Sigilo
  const [recorteCiclo, setRecorteCiclo] = useState<RecorteCicloVital>("TODOS");

  // 3. Estados de Busca, Filtros Rápidos, Ordenação e Exibição
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [escopoBuscaGlobal, setEscopoBuscaGlobal] = useState<boolean>(true);
  const [achatarSubpastas, setAchatarSubpastas] = useState<boolean>(false);
  const [filtroFaseRapido, setFiltroFaseRapido] = useState<string>("TODAS");
  const [filtroAcessoRapido, setFiltroAcessoRapido] = useState<string>("TODOS");
  const [filtroExtensaoRapido, setFiltroExtensaoRapido] = useState<string>("TODAS");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoExplorador>("protocolo");
  const [modoVisualizacao, setModoVisualizacao] =
    useState<ModoVisualizacaoExplorador>("lista");

  // 4. Item selecionado para o Painel Lateral de Inspeção Diplomática
  const [docSelecionadoId, setDocSelecionadoId] = useState<string | null>(null);
  const [painelInspecaoAberto, setPainelInspecaoAberto] = useState<boolean>(true);

  // 5. Dados sincronizados da API (Classes PCD/TTD e Dossiês/Processos)
  const [classesPcdApi, setClassesPcdApi] = useState<ClassePcdItem[]>([]);
  const [dossiesApi, setDossiesApi] = useState<DossieItem[]>([]);
  const [sincronizandoContexto, setSincronizandoContexto] = useState<boolean>(false);

  const sincronizarEstruturaSigad = useCallback(async () => {
    setSincronizandoContexto(true);
    try {
      const [resClasses, resDossies] = await Promise.allSettled([
        buscarClassesPcd("TODAS"),
        buscarDossies(),
      ]);
      if (resClasses.status === "fulfilled") {
        setClassesPcdApi(resClasses.value);
      }
      if (resDossies.status === "fulfilled") {
        setDossiesApi(resDossies.value);
      }
    } finally {
      setSincronizandoContexto(false);
    }
  }, []);

  useEffect(() => {
    sincronizarEstruturaSigad();
  }, [sincronizarEstruturaSigad, acervo.length]);

  // Consolida todas as classes PCD (API + Padrão FIM + Códigos presentes nos documentos do acervo)
  const classesPcdConsolidadas = useMemo<ClassePcdItem[]>(() => {
    const mapa = new Map<string, ClassePcdItem>();

    for (const c of CLASSES_FIM_PADRAO) {
      mapa.set(c.codigo, {
        id: c.codigo,
        codigo: c.codigo,
        titulo: c.titulo,
        tipoAtividade: "Atividade-Fim",
        funcao: c.funcao,
        subfuncao: "",
        atividade: c.titulo,
        prazoCorrenteAnos: c.prazoCorrenteAnos,
        eventoCorrente: "Cumprimento da finalidade de pesquisa",
        prazoIntermediariaAnos: c.prazoIntermediariaAnos,
        eventoIntermediaria: "Recolhimento imediato ao RDC-Arq",
        destinacaoFinal: c.destinacaoFinal,
        observacoesTtd: "Classe padrão de Atividade-Fim da FCJA",
        ativa: true,
        criadoEm: "",
      });
    }

    for (const c of classesPcdApi) {
      mapa.set(c.codigo, c);
    }

    for (const d of acervo) {
      const cod = d.codigoClassificacao || "000.00.00.000";
      if (!mapa.has(cod)) {
        const ehFim =
          d.tipoAtividade === "Atividade-Fim" || cod.startsWith("FIM.");
        mapa.set(cod, {
          id: cod,
          codigo: cod,
          titulo:
            d.descricaoCodigo ||
            (cod === "000.00.00.000"
              ? "Documentos sem Classe PCD Atribuída (Classificação Pendente)"
              : `Classe Documental ${cod}`),
          tipoAtividade: ehFim ? "Atividade-Fim" : "Atividade-Meio",
          funcao: ehFim
            ? "FUNÇÃO FIM — PESQUISA, MEMÓRIA E PATRIMÔNIO"
            : "FUNÇÃO MEIO — GESTÃO ADMINISTRATIVA E INSTITUCIONAL",
          subfuncao: "",
          atividade: d.descricaoCodigo || d.categoria,
          prazoCorrenteAnos: d.prazoCorrenteAnos ?? 2,
          eventoCorrente: "Vigência administrativa ou científica",
          prazoIntermediariaAnos: d.prazoIntermediariaAnos ?? (ehFim ? 0 : 3),
          eventoIntermediaria: "Avaliação pela CPAD",
          destinacaoFinal:
            d.destinacaoPrevista || (ehFim ? "GUARDA_PERMANENTE" : "ELIMINACAO"),
          observacoesTtd: "Extraído automaticamente dos documentos capturados no acervo",
          ativa: true,
          criadoEm: d.upload,
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [classesPcdApi, acervo]);

  // Consolida todos os Dossiês/Processos (API + códigos de dossiê referenciados nos documentos)
  const dossiesConsolidados = useMemo<DossieItem[]>(() => {
    const mapa = new Map<string, DossieItem>();

    for (const ds of dossiesApi) {
      mapa.set(ds.codigoDossie, ds);
    }

    for (const d of acervo) {
      if (d.codigoDossie && !mapa.has(d.codigoDossie)) {
        const docsDoDossie = acervo.filter((x) => x.codigoDossie === d.codigoDossie);
        const tamanhoTotal = docsDoDossie.reduce((acc, x) => acc + (x.tamanho || 0), 0);
        mapa.set(d.codigoDossie, {
          id: String(d.dossieId || d.codigoDossie),
          codigoDossie: d.codigoDossie,
          titulo: `Unidade de Arquivamento ${d.codigoDossie}`,
          tipoUnidade: "DOSSIE",
          nucleo: d.nucleo,
          siglaNucleo: d.sigla || SIGLA_POR_NUCLEO[d.nucleo] || "BR_PB_FCJA",
          codigoClassificacao: d.codigoClassificacao || "FIM.100.01.001",
          descricaoCodigo: d.descricaoCodigo || d.categoria,
          destinacaoPrevista: d.destinacaoPrevista || "GUARDA_PERMANENTE",
          faseAtual: d.faseArquivistica || "CORRENTE",
          statusDossie: d.pacoteSipId ? "RECOLHIDO_ARCHIVEMATICA" : "ABERTO",
          volumeAtual: 1,
          dataAbertura: d.upload,
          dataEncerramento: "",
          responsavelAbertura: d.usuarioCaptura || "arquivista",
          descricao: `Agrupamento orgânico vinculado ao núcleo ${d.nucleo}`,
          totalDocumentos: docsDoDossie.length,
          tamanhoTotalBytes: tamanhoTotal,
          documentos: docsDoDossie.map((x) => ({
            id: x.id,
            numeroProtocolo: x.numeroProtocolo || `ID-${x.id}`,
            nome: x.nome,
            categoria: x.categoria,
            ano: x.ano,
            hashSha256: x.hashSha256 || "",
          })),
        });
      }
    }

    return Array.from(mapa.values());
  }, [dossiesApi, acervo]);

  // Troca de perspectiva limpa subníveis
  const alterarModoNavegacao = useCallback((novoModo: ModoExploradorSigad) => {
    setModoNavegacao(novoModo);
    setDocSelecionadoId(null);
  }, []);

  // Subir um nível na árvore atual
  const subirNivel = useCallback(() => {
    setDocSelecionadoId(null);
    if (modoNavegacao === "nucleo") {
      if (subPastaTipo) {
        setSubPastaTipo(null);
      } else if (subPastaAno) {
        setSubPastaAno(null);
      } else if (pastaNucleo !== "Todos") {
        setPastaNucleo("Todos");
      }
      return;
    }
    if (modoNavegacao === "pcd") {
      if (classePcdSelecionada) {
        setClassePcdSelecionada(null);
      } else if (escopoAtividadePcd !== "TODAS") {
        setEscopoAtividadePcd("TODAS");
      }
      return;
    }
    if (modoNavegacao === "dossies") {
      if (dossieSelecionadoCodigo) {
        setDossieSelecionadoCodigo(null);
      } else if (filtroStatusDossie !== "TODOS") {
        setFiltroStatusDossie("TODOS");
      }
      return;
    }
    if (modoNavegacao === "ciclo_vital") {
      if (recorteCiclo !== "TODOS") {
        setRecorteCiclo("TODOS");
      }
    }
  }, [
    modoNavegacao,
    subPastaTipo,
    subPastaAno,
    pastaNucleo,
    classePcdSelecionada,
    escopoAtividadePcd,
    dossieSelecionadoCodigo,
    filtroStatusDossie,
    recorteCiclo,
  ]);

  // Navegar diretamente para um Dossiê específico (ex: a partir do Painel de Inspeção)
  const abrirDossieNoExplorador = useCallback((codigoDossie: string) => {
    setModoNavegacao("dossies");
    setFiltroStatusDossie("TODOS");
    setDossieSelecionadoCodigo(codigoDossie);
    setDocSelecionadoId(null);
  }, []);

  // Navegar diretamente para uma Classe PCD específica
  const abrirClassePcdNoExplorador = useCallback((codigoClasse: string) => {
    setModoNavegacao("pcd");
    setEscopoAtividadePcd("TODAS");
    setClassePcdSelecionada(codigoClasse);
    setDocSelecionadoId(null);
  }, []);

  // Filtro base de documentos pelo caminho estrutural selecionado na perspectiva ativa
  const documentosEscopoEstrutural = useMemo<Doc[]>(() => {
    if (termoBusca.trim() && escopoBuscaGlobal) {
      return acervo;
    }

    if (modoNavegacao === "nucleo") {
      return acervo.filter((d) => {
        if (pastaNucleo !== "Todos" && d.nucleo !== pastaNucleo) return false;
        if (subPastaAno !== null && d.ano !== subPastaAno) return false;
        if (subPastaTipo !== null && d.categoria !== subPastaTipo) return false;
        return true;
      });
    }

    if (modoNavegacao === "pcd") {
      return acervo.filter((d) => {
        const cod = d.codigoClassificacao || "000.00.00.000";
        const ehFim = d.tipoAtividade === "Atividade-Fim" || cod.startsWith("FIM.");
        const ativDoc = ehFim ? "Atividade-Fim" : "Atividade-Meio";
        if (escopoAtividadePcd !== "TODAS" && ativDoc !== escopoAtividadePcd) {
          return false;
        }
        if (classePcdSelecionada && cod !== classePcdSelecionada) {
          return false;
        }
        return true;
      });
    }

    if (modoNavegacao === "dossies") {
      if (dossieSelecionadoCodigo === "__AVULSOS__") {
        return acervo.filter((d) => !d.codigoDossie && !d.dossieId);
      }
      if (dossieSelecionadoCodigo) {
        const dsObj = dossiesConsolidados.find(
          (ds) => ds.codigoDossie === dossieSelecionadoCodigo
        );
        const idsNoDossie = new Set((dsObj?.documentos || []).map((x) => String(x.id)));
        return acervo.filter(
          (d) =>
            d.codigoDossie === dossieSelecionadoCodigo ||
            idsNoDossie.has(String(d.id)) ||
            (dsObj && String(d.dossieId) === String(dsObj.id))
        );
      }
      if (filtroStatusDossie === "AVULSOS") {
        return acervo.filter((d) => !d.codigoDossie && !d.dossieId);
      }
      if (filtroStatusDossie !== "TODOS") {
        const codigosStatus = new Set(
          dossiesConsolidados
            .filter((ds) => ds.statusDossie === filtroStatusDossie)
            .map((ds) => ds.codigoDossie)
        );
        return acervo.filter(
          (d) => d.codigoDossie && codigosStatus.has(d.codigoDossie)
        );
      }
      return acervo;
    }

    // modoNavegacao === "ciclo_vital"
    return acervo.filter((d) => {
      const ehFim =
        d.tipoAtividade === "Atividade-Fim" ||
        (d.codigoClassificacao || "").startsWith("FIM.");
      const guardaPerm =
        d.destinacaoPrevista === "GUARDA_PERMANENTE" || (!d.destinacaoPrevista && ehFim);

      switch (recorteCiclo) {
        case "FASE_CORRENTE":
          return (d.faseArquivistica || "CORRENTE") === "CORRENTE";
        case "FASE_INTERMEDIARIA":
          return d.faseArquivistica === "INTERMEDIARIA";
        case "GUARDA_PERMANENTE":
          return guardaPerm;
        case "ELIMINACAO_PREVISTA":
          return !guardaPerm;
        case "RECOLHIDOS_OAIS":
          return Boolean(d.pacoteSipId || d.aipUuidArchivematica);
        case "ACESSO_OSTENSIVO":
          return (d.nivelAcesso || "OSTENSIVO") === "OSTENSIVO";
        case "ACESSO_RESTRITO_LAI_LGPD":
          return (
            d.nivelAcesso === "RESTRITO_LGPD" || d.nivelAcesso === "SIGILOSO_LAI"
          );
        case "TODOS":
        default:
          return true;
      }
    });
  }, [
    acervo,
    termoBusca,
    escopoBuscaGlobal,
    modoNavegacao,
    pastaNucleo,
    subPastaAno,
    subPastaTipo,
    escopoAtividadePcd,
    classePcdSelecionada,
    dossieSelecionadoCodigo,
    filtroStatusDossie,
    dossiesConsolidados,
    recorteCiclo,
  ]);

  // Aplicação da busca textual + filtros rápidos + ordenação
  const documentosFiltrados = useMemo<Doc[]>(() => {
    const q = termoBusca.trim().toLowerCase();

    const filtrados = documentosEscopoEstrutural.filter((d) => {
      if (filtroFaseRapido !== "TODAS") {
        const faseDoc = d.faseArquivistica || "CORRENTE";
        if (faseDoc !== filtroFaseRapido) return false;
      }

      if (filtroAcessoRapido !== "TODOS") {
        const acessoDoc = d.nivelAcesso || "OSTENSIVO";
        if (acessoDoc !== filtroAcessoRapido) return false;
      }

      if (filtroExtensaoRapido !== "TODAS") {
        if (d.ext.toLowerCase() !== filtroExtensaoRapido.toLowerCase()) return false;
      }

      if (!q) return true;

      const camposBusca = [
        d.nome,
        d.numeroProtocolo,
        d.autor,
        d.codigoClassificacao,
        d.descricaoCodigo,
        d.codigoDossie,
        d.nucleo,
        d.sigla,
        d.categoria,
        d.hashSha256,
        String(d.ano),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return camposBusca.includes(q);
    });

    return [...filtrados].sort((a, b) => {
      switch (ordenacao) {
        case "nome_asc":
          return a.nome.localeCompare(b.nome, "pt-BR");
        case "nome_desc":
          return b.nome.localeCompare(a.nome, "pt-BR");
        case "ano_desc":
          return b.ano - a.ano || a.nome.localeCompare(b.nome, "pt-BR");
        case "ano_asc":
          return a.ano - b.ano || a.nome.localeCompare(b.nome, "pt-BR");
        case "tamanho_desc":
          return (b.tamanho || 0) - (a.tamanho || 0);
        case "classe_pcd":
          return (a.codigoClassificacao || "").localeCompare(
            b.codigoClassificacao || "",
            "pt-BR"
          );
        case "protocolo":
        default:
          return (b.numeroProtocolo || b.id).localeCompare(
            a.numeroProtocolo || a.id,
            "pt-BR"
          );
      }
    });
  }, [
    documentosEscopoEstrutural,
    termoBusca,
    filtroFaseRapido,
    filtroAcessoRapido,
    filtroExtensaoRapido,
    ordenacao,
  ]);

  // Construção das Pastas Visíveis no Nível Atual (quando não está em busca textual nem achatado)
  const pastasVisiveis = useMemo<ItemPastaExplorador[]>(() => {
    if (termoBusca.trim() || achatarSubpastas) {
      return [];
    }

    // 1. MODO NÚCLEO PRODUTOR
    if (modoNavegacao === "nucleo") {
      // Nível 0: Todos os Núcleos -> Mostrar pastas dos Núcleos que possuem documentos (ou todos)
      if (pastaNucleo === "Todos") {
        const nucleosLista = NUCLEOS.filter((n) => n !== "Todos");
        return nucleosLista
          .map((nucleo): ItemPastaExplorador => {
            const docsNucleo = documentosFiltrados.filter((d) => d.nucleo === nucleo);
            const resumo = resumirDocsParaPasta(docsNucleo);
            const sigla = SIGLA_POR_NUCLEO[nucleo] || "BR_PB_FCJA";
            return {
              id: `nucleo-${nucleo}`,
              titulo: nucleo,
              subtitulo: `Fundo / Núcleo de Pesquisa · ${sigla}`,
              codigoBadge: sigla.split("_").pop() || "FCJA",
              tipoPasta: "nucleo",
              statusBadge:
                resumo.quantidadeDocs > 0
                  ? `${resumo.quantidadeDocs} doc(s)`
                  : "Vazio",
              corTema: resumo.quantidadeDocs > 0 ? "blue" : "slate",
              ...resumo,
              onAbrir: () => {
                setPastaNucleo(nucleo);
                setSubPastaAno(null);
                setSubPastaTipo(null);
                setDocSelecionadoId(null);
              },
            };
          })
          .sort((a, b) => b.quantidadeDocs - a.quantidadeDocs);
      }

      // Nível 1: Dentro de um Núcleo -> Mostrar pastas de Anos
      if (pastaNucleo !== "Todos" && subPastaAno === null) {
        const anosUnicos = Array.from(
          new Set(documentosFiltrados.map((d) => d.ano))
        ).sort((a, b) => b - a);

        return anosUnicos.map((ano): ItemPastaExplorador => {
          const docsAno = documentosFiltrados.filter((d) => d.ano === ano);
          const resumo = resumirDocsParaPasta(docsAno);
          const tiposCount = new Set(docsAno.map((d) => d.categoria)).size;
          return {
            id: `ano-${ano}`,
            titulo: `Exercício / Ano de Produção ${ano}`,
            subtitulo: `${tiposCount} tipologia(s) documental(is) em ${pastaNucleo}`,
            codigoBadge: String(ano),
            tipoPasta: "ano",
            statusBadge: `${resumo.quantidadeDocs} doc(s)`,
            corTema: "blue",
            ...resumo,
            onAbrir: () => {
              setSubPastaAno(ano);
              setSubPastaTipo(null);
              setDocSelecionadoId(null);
            },
          };
        });
      }

      // Nível 2: Dentro de Núcleo + Ano -> Mostrar pastas de Tipologia / Espécie
      if (pastaNucleo !== "Todos" && subPastaAno !== null && subPastaTipo === null) {
        const tiposUnicos = Array.from(
          new Set(documentosFiltrados.map((d) => d.categoria))
        ).sort();

        return tiposUnicos.map((tipo): ItemPastaExplorador => {
          const docsTipo = documentosFiltrados.filter((d) => d.categoria === tipo);
          const resumo = resumirDocsParaPasta(docsTipo);
          return {
            id: `tipo-${tipo}`,
            titulo: tipo,
            subtitulo: `Série / Espécie Documental (${subPastaAno})`,
            codigoBadge: tipo.toUpperCase().slice(0, 10),
            tipoPasta: "tipologia",
            statusBadge: `${resumo.quantidadeDocs} doc(s)`,
            corTema: "purple",
            ...resumo,
            onAbrir: () => {
              setSubPastaTipo(tipo);
              setDocSelecionadoId(null);
            },
          };
        });
      }

      return [];
    }

    // 2. MODO PLANO DE CLASSIFICAÇÃO (PCD & TTD)
    if (modoNavegacao === "pcd") {
      if (!classePcdSelecionada) {
        const classesFiltradas = classesPcdConsolidadas.filter((c) => {
          if (escopoAtividadePcd === "TODAS") return true;
          return c.tipoAtividade === escopoAtividadePcd;
        });

        return classesFiltradas
          .map((classe): ItemPastaExplorador => {
            const docsClasse = documentosFiltrados.filter(
              (d) => (d.codigoClassificacao || "000.00.00.000") === classe.codigo
            );
            const resumo = resumirDocsParaPasta(docsClasse);
            const ehPerm = classe.destinacaoFinal === "GUARDA_PERMANENTE";
            return {
              id: `pcd-${classe.codigo}`,
              titulo: classe.titulo,
              subtitulo: `${classe.funcao} · Corrente: ${classe.prazoCorrenteAnos}a | Interm.: ${classe.prazoIntermediariaAnos}a`,
              codigoBadge: classe.codigo,
              tipoPasta: "classe_pcd",
              statusBadge: ehPerm ? "Guarda Permanente" : "Eliminação TTD",
              corTema: ehPerm ? "purple" : "amber",
              ...resumo,
              onAbrir: () => {
                setClassePcdSelecionada(classe.codigo);
                setDocSelecionadoId(null);
              },
            };
          })
          .sort((a, b) => b.quantidadeDocs - a.quantidadeDocs || a.id.localeCompare(b.id));
      }

      return [];
    }

    // 3. MODO UNIDADES DE ARQUIVAMENTO (DOSSIÊS & PROCESSOS)
    if (modoNavegacao === "dossies") {
      if (!dossieSelecionadoCodigo && filtroStatusDossie !== "AVULSOS") {
        const listaDossies = dossiesConsolidados.filter((ds) => {
          if (filtroStatusDossie === "TODOS") return true;
          return ds.statusDossie === filtroStatusDossie;
        });

        const pastasDossies: ItemPastaExplorador[] = listaDossies.map((ds) => {
          const idsNoDossie = new Set((ds.documentos || []).map((x) => String(x.id)));
          const docsDossie = acervo.filter(
            (d) =>
              d.codigoDossie === ds.codigoDossie ||
              idsNoDossie.has(String(d.id)) ||
              String(d.dossieId) === String(ds.id)
          );
          const resumo = resumirDocsParaPasta(docsDossie);
          const qtdReal = Math.max(resumo.quantidadeDocs, ds.totalDocumentos || 0);
          const bytesReais = Math.max(
            resumo.tamanhoTotalBytes,
            ds.tamanhoTotalBytes || 0
          );

          return {
            id: `dossie-${ds.codigoDossie}`,
            titulo: ds.titulo,
            subtitulo: `${ds.nucleo} · Classe PCD ${ds.codigoClassificacao} · Vol. ${ds.volumeAtual || 1}`,
            codigoBadge: ds.codigoDossie,
            tipoPasta: "dossie",
            statusBadge: ds.statusDossie,
            corTema:
              ds.statusDossie === "RECOLHIDO_ARCHIVEMATICA"
                ? "teal"
                : ds.statusDossie === "ABERTO"
                  ? "emerald"
                  : "slate",
            quantidadeDocs: qtdReal,
            tamanhoTotalBytes: bytesReais,
            guardaPermanenteCount: resumo.guardaPermanenteCount,
            fixidadeOkCount: resumo.fixidadeOkCount,
            restritosCount: resumo.restritosCount,
            onAbrir: () => {
              setDossieSelecionadoCodigo(ds.codigoDossie);
              setDocSelecionadoId(null);
            },
          };
        });

        // Adiciona pasta virtual para Documentos Avulsos (Sem Juntada) quando em TODOS
        if (filtroStatusDossie === "TODOS") {
          const docsAvulsos = acervo.filter((d) => !d.codigoDossie && !d.dossieId);
          const resumoAvulsos = resumirDocsParaPasta(docsAvulsos);
          pastasDossies.push({
            id: "dossie-avulsos",
            titulo: "Documentos Avulsos (Aguardando Juntada em Dossiê/Processo)",
            subtitulo:
              "Peças capturadas no SIGAD que ainda não foram vinculadas a uma Unidade de Arquivamento",
            codigoBadge: "AVULSOS",
            tipoPasta: "dossie",
            statusBadge: "Sem Dossiê",
            corTema: "amber",
            ...resumoAvulsos,
            onAbrir: () => {
              setDossieSelecionadoCodigo("__AVULSOS__");
              setDocSelecionadoId(null);
            },
          });
        }

        return pastasDossies;
      }

      return [];
    }

    // 4. MODO CICLO VITAL & PRESERVAÇÃO
    if (modoNavegacao === "ciclo_vital" && recorteCiclo === "TODOS") {
      const definicoes: Array<{
        recorte: RecorteCicloVital;
        codigo: string;
        titulo: string;
        subtitulo: string;
        statusBadge: string;
        cor: ItemPastaExplorador["corTema"];
        predicado: (d: Doc) => boolean;
      }> = [
        {
          recorte: "FASE_CORRENTE",
          codigo: "1ª IDADE · CORRENTE",
          titulo: "Arquivo Corrente (Uso Administrativo e Científico Vigente)",
          subtitulo: "Documentos em tramitação ou consulta frequente nos núcleos da FCJA",
          statusBadge: "Fase Corrente",
          cor: "blue",
          predicado: (d) => (d.faseArquivistica || "CORRENTE") === "CORRENTE",
        },
        {
          recorte: "FASE_INTERMEDIARIA",
          codigo: "2ª IDADE · INTERMEDIÁRIA",
          titulo: "Arquivo Intermediário (Cumprindo Prazo Precaucional TTD)",
          subtitulo: "Documentos aguardando destinação final (recolhimento ou eliminação)",
          statusBadge: "Fase Intermediária",
          cor: "amber",
          predicado: (d) => d.faseArquivistica === "INTERMEDIARIA",
        },
        {
          recorte: "GUARDA_PERMANENTE",
          codigo: "3ª IDADE · PERMANENTE",
          titulo: "Patrimônio Documental de Guarda Permanente (Valor Histórico)",
          subtitulo: "Documentos de Atividade-Fim e memória institucional inalienável",
          statusBadge: "Guarda Permanente",
          cor: "purple",
          predicado: (d) => {
            const ehFim =
              d.tipoAtividade === "Atividade-Fim" ||
              (d.codigoClassificacao || "").startsWith("FIM.");
            return (
              d.destinacaoPrevista === "GUARDA_PERMANENTE" ||
              (!d.destinacaoPrevista && ehFim)
            );
          },
        },
        {
          recorte: "RECOLHIDOS_OAIS",
          codigo: "OAIS · RDC-ARQ",
          titulo: "Pacotes SIP / AIP Recolhidos ao Archivematica",
          subtitulo: "Documentos já empacotados em BagIt RFC 8493 para preservação de longo prazo",
          statusBadge: "RDC-Arq OAIS",
          cor: "teal",
          predicado: (d) => Boolean(d.pacoteSipId || d.aipUuidArchivematica),
        },
        {
          recorte: "ELIMINACAO_PREVISTA",
          codigo: "TTD · GUARDA TEMPORÁRIA",
          titulo: "Documentos de Guarda Temporária (Passíveis de Eliminação Futura)",
          subtitulo: "Atividades-Meio sujeitas a Termo de Eliminação após cumprimento da TTD",
          statusBadge: "Guarda Temporária",
          cor: "slate",
          predicado: (d) => {
            const ehFim =
              d.tipoAtividade === "Atividade-Fim" ||
              (d.codigoClassificacao || "").startsWith("FIM.");
            const guardaPerm =
              d.destinacaoPrevista === "GUARDA_PERMANENTE" ||
              (!d.destinacaoPrevista && ehFim);
            return !guardaPerm;
          },
        },
        {
          recorte: "ACESSO_RESTRITO_LAI_LGPD",
          codigo: "SIGILO · LAI & LGPD",
          titulo: "Acervo com Restrição de Acesso (Dados Pessoais LGPD ou Sigilo LAI)",
          subtitulo: "Documentos protegidos por hipótese legal de restrição de acesso",
          statusBadge: "Acesso Restrito",
          cor: "amber",
          predicado: (d) =>
            d.nivelAcesso === "RESTRITO_LGPD" || d.nivelAcesso === "SIGILOSO_LAI",
        },
      ];

      return definicoes.map((def): ItemPastaExplorador => {
        const docsRecorte = documentosFiltrados.filter(def.predicado);
        const resumo = resumirDocsParaPasta(docsRecorte);
        return {
          id: `ciclo-${def.recorte}`,
          titulo: def.titulo,
          subtitulo: def.subtitulo,
          codigoBadge: def.codigo,
          tipoPasta: "ciclo",
          statusBadge: def.statusBadge,
          corTema: def.cor,
          ...resumo,
          onAbrir: () => {
            setRecorteCiclo(def.recorte);
            setDocSelecionadoId(null);
          },
        };
      });
    }

    return [];
  }, [
    termoBusca,
    achatarSubpastas,
    modoNavegacao,
    pastaNucleo,
    subPastaAno,
    subPastaTipo,
    documentosFiltrados,
    classesPcdSelecionadaCheck(classePcdSelecionada),
    classesPcdConsolidadas,
    escopoAtividadePcd,
    dossieSelecionadoCodigo,
    filtroStatusDossie,
    dossiesConsolidados,
    acervo,
    recorteCiclo,
  ]);

  // Determina se os itens documentais individuais devem ser listados no nível atual
  const exibirDocumentosNoNivelAtual = useMemo<boolean>(() => {
    if (termoBusca.trim() || achatarSubpastas) return true;
    if (modoNavegacao === "nucleo") {
      return subPastaAno !== null && subPastaTipo !== null;
    }
    if (modoNavegacao === "pcd") {
      return classePcdSelecionada !== null;
    }
    if (modoNavegacao === "dossies") {
      return dossieSelecionadoCodigo !== null || filtroStatusDossie === "AVULSOS";
    }
    if (modoNavegacao === "ciclo_vital") {
      return recorteCiclo !== "TODOS";
    }
    return true;
  }, [
    termoBusca,
    achatarSubpastas,
    modoNavegacao,
    subPastaAno,
    subPastaTipo,
    classePcdSelecionada,
    dossieSelecionadoCodigo,
    filtroStatusDossie,
    recorteCiclo,
  ]);

  const documentosVisiveis = useMemo<Doc[]>(() => {
    if (!exibirDocumentosNoNivelAtual) return [];
    return documentosFiltrados;
  }, [exibirDocumentosNoNivelAtual, documentosFiltrados]);

  // Breadcrumbs interativos multinível
  const breadcrumbs = useMemo<PassoBreadcrumbExplorador[]>(() => {
    const passos: PassoBreadcrumbExplorador[] = [];

    if (modoNavegacao === "nucleo") {
      passos.push({
        id: "raiz-nucleo",
        rotulo: "Fundos & Núcleos Produtores",
        codigo: "NOBRADE",
        ativo: pastaNucleo === "Todos",
        onClick: () => {
          setPastaNucleo("Todos");
          setSubPastaAno(null);
          setSubPastaTipo(null);
          setDocSelecionadoId(null);
        },
      });

      if (pastaNucleo !== "Todos") {
        const sigla = SIGLA_POR_NUCLEO[pastaNucleo]?.split("_").pop() || "NÚCLEO";
        passos.push({
          id: `bc-nucleo-${pastaNucleo}`,
          rotulo: pastaNucleo,
          codigo: sigla,
          ativo: subPastaAno === null,
          onClick: () => {
            setSubPastaAno(null);
            setSubPastaTipo(null);
            setDocSelecionadoId(null);
          },
        });
      }

      if (subPastaAno !== null) {
        passos.push({
          id: `bc-ano-${subPastaAno}`,
          rotulo: `Ano ${subPastaAno}`,
          ativo: subPastaTipo === null,
          onClick: () => {
            setSubPastaTipo(null);
            setDocSelecionadoId(null);
          },
        });
      }

      if (subPastaTipo !== null) {
        passos.push({
          id: `bc-tipo-${subPastaTipo}`,
          rotulo: subPastaTipo,
          ativo: true,
          onClick: () => {},
        });
      }
      return passos;
    }

    if (modoNavegacao === "pcd") {
      passos.push({
        id: "raiz-pcd",
        rotulo: "Plano de Classificação (PCD & TTD)",
        codigo: "PCD",
        ativo: escopoAtividadePcd === "TODAS" && !classePcdSelecionada,
        onClick: () => {
          setEscopoAtividadePcd("TODAS");
          setClassePcdSelecionada(null);
          setDocSelecionadoId(null);
        },
      });

      if (escopoAtividadePcd !== "TODAS") {
        passos.push({
          id: `bc-escopo-${escopoAtividadePcd}`,
          rotulo: escopoAtividadePcd,
          ativo: !classePcdSelecionada,
          onClick: () => {
            setClassePcdSelecionada(null);
            setDocSelecionadoId(null);
          },
        });
      }

      if (classePcdSelecionada) {
        const clObj = classesPcdConsolidadas.find(
          (c) => c.codigo === classePcdSelecionada
        );
        passos.push({
          id: `bc-classe-${classePcdSelecionada}`,
          rotulo: clObj ? clObj.titulo : classePcdSelecionada,
          codigo: classePcdSelecionada,
          ativo: true,
          onClick: () => {},
        });
      }
      return passos;
    }

    if (modoNavegacao === "dossies") {
      passos.push({
        id: "raiz-dossies",
        rotulo: "Unidades de Arquivamento (Dossiês & Processos)",
        codigo: "ORGÂNICO",
        ativo: filtroStatusDossie === "TODOS" && !dossieSelecionadoCodigo,
        onClick: () => {
          setFiltroStatusDossie("TODOS");
          setDossieSelecionadoCodigo(null);
          setDocSelecionadoId(null);
        },
      });

      if (filtroStatusDossie !== "TODOS") {
        passos.push({
          id: `bc-status-${filtroStatusDossie}`,
          rotulo:
            filtroStatusDossie === "AVULSOS"
              ? "Documentos Avulsos"
              : `Status: ${filtroStatusDossie}`,
          ativo: !dossieSelecionadoCodigo,
          onClick: () => {
            setDossieSelecionadoCodigo(null);
            setDocSelecionadoId(null);
          },
        });
      }

      if (dossieSelecionadoCodigo) {
        const dsObj = dossiesConsolidados.find(
          (d) => d.codigoDossie === dossieSelecionadoCodigo
        );
        passos.push({
          id: `bc-dossie-${dossieSelecionadoCodigo}`,
          rotulo:
            dossieSelecionadoCodigo === "__AVULSOS__"
              ? "Documentos Avulsos (Sem Juntada)"
              : dsObj
                ? dsObj.titulo
                : dossieSelecionadoCodigo,
          codigo:
            dossieSelecionadoCodigo === "__AVULSOS__"
              ? "AVULSOS"
              : dossieSelecionadoCodigo,
          ativo: true,
          onClick: () => {},
        });
      }
      return passos;
    }

    // modoNavegacao === "ciclo_vital"
    passos.push({
      id: "raiz-ciclo",
      rotulo: "Ciclo Vital, Preservação & Sigilo",
      codigo: "TTD / OAIS",
      ativo: recorteCiclo === "TODOS",
      onClick: () => {
        setRecorteCiclo("TODOS");
        setDocSelecionadoId(null);
      },
    });

    if (recorteCiclo !== "TODOS") {
      const mapaRotulo: Record<RecorteCicloVital, string> = {
        TODOS: "Todos",
        FASE_CORRENTE: "1ª Idade: Arquivo Corrente",
        FASE_INTERMEDIARIA: "2ª Idade: Arquivo Intermediário",
        GUARDA_PERMANENTE: "3ª Idade: Guarda Permanente",
        ELIMINACAO_PREVISTA: "Guarda Temporária (Eliminação TTD)",
        RECOLHIDOS_OAIS: "Pacotes SIP / AIP (RDC-Arq)",
        ACESSO_OSTENSIVO: "Acesso Ostensivo (Público)",
        ACESSO_RESTRITO_LAI_LGPD: "Acesso Restrito / Sigiloso (LGPD & LAI)",
      };
      passos.push({
        id: `bc-recorte-${recorteCiclo}`,
        rotulo: mapaRotulo[recorteCiclo],
        ativo: true,
        onClick: () => {},
      });
    }

    return passos;
  }, [
    modoNavegacao,
    pastaNucleo,
    subPastaAno,
    subPastaTipo,
    escopoAtividadePcd,
    classePcdSelecionada,
    classesPcdConsolidadas,
    filtroStatusDossie,
    dossieSelecionadoCodigo,
    dossiesConsolidados,
    recorteCiclo,
  ]);

  // Objeto do documento atualmente selecionado para o Painel de Inspeção
  const docSelecionado = useMemo<Doc | null>(() => {
    if (!docSelecionadoId) return null;
    return acervo.find((d) => d.id === docSelecionadoId) || null;
  }, [acervo, docSelecionadoId]);

  // Contexto de Classe PCD ou Dossiê atualmente aberto
  const classePcdAtual = useMemo<ClassePcdItem | null>(() => {
    const codigoAlvo =
      classePcdSelecionada || docSelecionado?.codigoClassificacao || null;
    if (!codigoAlvo) return null;
    return classesPcdConsolidadas.find((c) => c.codigo === codigoAlvo) || null;
  }, [classePcdSelecionada, docSelecionado, classesPcdConsolidadas]);

  const dossieAtual = useMemo<DossieItem | null>(() => {
    const codigoAlvo =
      (dossieSelecionadoCodigo && dossieSelecionadoCodigo !== "__AVULSOS__"
        ? dossieSelecionadoCodigo
        : null) ||
      docSelecionado?.codigoDossie ||
      null;
    if (!codigoAlvo) return null;
    return dossiesConsolidados.find((ds) => ds.codigoDossie === codigoAlvo) || null;
  }, [dossieSelecionadoCodigo, docSelecionado, dossiesConsolidados]);

  // Resumo estatístico do escopo atual
  const resumoEscopoAtual = useMemo(() => {
    const base = resumirDocsParaPasta(documentosFiltrados);
    let recolhidosOais = 0;
    const porExtensao: Record<string, number> = {
      pdf: 0,
      tiff: 0,
      xlsx: 0,
      docx: 0,
    };

    for (const d of documentosFiltrados) {
      if (d.pacoteSipId || d.aipUuidArchivematica) recolhidosOais++;
      const extKey = (d.ext || "pdf").toLowerCase();
      porExtensao[extKey] = (porExtensao[extKey] ?? 0) + 1;
    }

    return {
      ...base,
      totalPastas: pastasVisiveis.length,
      recolhidosOais,
      porExtensao,
      taxaFixidade:
        base.quantidadeDocs > 0
          ? Math.round((base.fixidadeOkCount / base.quantidadeDocs) * 100)
          : 100,
    };
  }, [documentosFiltrados, pastasVisiveis.length]);

  const podeSubirNivel = breadcrumbs.length > 1;

  const limparFiltrosRapidos = useCallback(() => {
    setTermoBusca("");
    setFiltroFaseRapido("TODAS");
    setFiltroAcessoRapido("TODOS");
    setFiltroExtensaoRapido("TODAS");
  }, []);

  const possuiFiltrosRapidosAtivos =
    Boolean(termoBusca.trim()) ||
    filtroFaseRapido !== "TODAS" ||
    filtroAcessoRapido !== "TODOS" ||
    filtroExtensaoRapido !== "TODAS";

  return {
    // Perspectiva e Caminho
    modoNavegacao,
    alterarModoNavegacao,
    pastaNucleo,
    setPastaNucleo,
    subPastaAno,
    setSubPastaAno,
    subPastaTipo,
    setSubPastaTipo,
    escopoAtividadePcd,
    setEscopoAtividadePcd,
    classePcdSelecionada,
    setClassePcdSelecionada,
    filtroStatusDossie,
    setFiltroStatusDossie,
    dossieSelecionadoCodigo,
    setDossieSelecionadoCodigo,
    recorteCiclo,
    setRecorteCiclo,
    subirNivel,
    podeSubirNivel,
    breadcrumbs,
    abrirDossieNoExplorador,
    abrirClassePcdNoExplorador,

    // Busca, Filtros e Ordenação
    termoBusca,
    setTermoBusca,
    escopoBuscaGlobal,
    setEscopoBuscaGlobal,
    achatarSubpastas,
    setAchatarSubpastas,
    filtroFaseRapido,
    setFiltroFaseRapido,
    filtroAcessoRapido,
    setFiltroAcessoRapido,
    filtroExtensaoRapido,
    setFiltroExtensaoRapido,
    ordenacao,
    setOrdenacao,
    modoVisualizacao,
    setModoVisualizacao,
    limparFiltrosRapidos,
    possuiFiltrosRapidosAtivos,

    // Dados Computados para Renderização
    pastasVisiveis,
    documentosVisiveis,
    documentosFiltrados,
    exibirDocumentosNoNivelAtual,
    resumoEscopoAtual,
    classesPcdConsolidadas,
    dossiesConsolidados,
    sincronizandoContexto,
    sincronizarEstruturaSigad,

    // Inspeção Lateral
    docSelecionado,
    docSelecionadoId,
    setDocSelecionadoId,
    painelInspecaoAberto,
    setPainelInspecaoAberto,
    classePcdAtual,
    dossieAtual,
  };
}

function classesPcdSelecionadaCheck(val: string | null) {
  return val;
}
