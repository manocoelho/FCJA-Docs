export type Doc = {
  id: string;
  nome: string;
  ext: "pdf" | "xlsx" | "docx";
  categoria: string;
  ano: number;
  nucleo: string;
  upload: string;
  url?: string;
};

export const TIPOS = ["Planilhas", "Relatórios", "Notas Fiscais", "Formulários", "Currículos"];
export const NUCLEOS = [
  "Todos",
  "Manuscritos de José Américo de Almeida: identificação e descrição de documentos", //[cite: 2]
  "O modernismo na Paraiba a revista Era Nova e a Novela Reflexões de uma cabra", //[cite: 2]
  "A Paraíba e seus problemas: permanências e transformações", //[cite: 2]
  "Partituras de uma história pela democracia: as conexões artísticas e politicas entre José Siqueira e José Américo de Almeida", //[cite: 2]
  "Acervo audiovisual da FCJA: imagem e memória", //[cite: 2]
  "Os Modernismos na Paraiba e o Circuito de Comunicação da Revista Era Nova (1921-1926)", //[cite: 2]
  "De A Paraíba e seus problemas à A Bagaceira: Itinerários literários de José Américo de Almeida", //[cite: 2]
  "Maestro José Siqueira: Memórias da Música para o futuro", //[cite: 2]
  "1930 A caminho do centenário: convergências bibliográficas e fontes digitais (BR 1930)", //[cite: 2]
  "Modernização digital do acervo da Fundação Casa de José Américo: estruturando a preservação e o acesso", //[cite: 2]
  "Imprensa e cultura na Paraíba: os circuitos de comunicação das revistas Ilustração e Manaira (1930-1940)", //[cite: 2]
  "Por uma cartografia dos lugares de consciência na Paraíba: trajetos do patrimônio cultural por meio da memória das violações de direitos humanos e da resistência", //[cite: 2]
  "Repositório Arquivistico Digital Confiável da produção do Projeto Preservação e Difusão do Acervo da FCJA", //[cite: 2]
  "Mapeamento do Patrimonio Arqueológico da Paraiba", //[cite: 2]
  "Entre Termos e Conceitos: Uma Pesquisa Documental sobre Educação Patrimonial", //[cite: 2]
  "Sustentabilidade e Diversidade: Pesquisa ação na Mata da Falésia de Cabo Branco" //[cite: 2]
];
export const ANOS = [2022, 2023, 2024, 2025, 2026, 2027];

export const TIPO_POR_CATEGORIA: Record<string, string> = {
  Relatório: "Relatórios",
  Planilha: "Planilhas",
  "Nota Fiscal": "Notas Fiscais",
  Formulário: "Formulários",
  Currículo: "Currículos",
};

export const CATEGORIA_POR_TIPO: Record<string, string> = {
  Relatórios: "Relatório",
  Planilhas: "Planilha",
  "Notas Fiscais": "Nota Fiscal",
  Formulários: "Formulário",
  Currículos: "Currículo",
};

export const DOCUMENTOS: Doc[] = [
  {
    id: "1",
    nome: "Relatorio_Impacto_Financeiro.pdf",
    ext: "pdf",
    categoria: "Relatório",
    ano: 2024,
    nucleo: NUCLEOS[3]!,
    upload: "12/03/2024",
  },
  {
    id: "2",
    nome: "Relatorio_Anual_Operacoes.pdf",
    ext: "pdf",
    categoria: "Relatório",
    ano: 2025,
    nucleo: NUCLEOS[5]!,
    upload: "28/01/2025",
  },
  {
    id: "3",
    nome: "Planilha_Orcamento_Consolidado.xlsx",
    ext: "xlsx",
    categoria: "Planilha",
    ano: 2025,
    nucleo: NUCLEOS[10]!,
    upload: "09/05/2025",
  },
  {
    id: "4",
    nome: "Relatorio_Clima_Organizacional.pdf",
    ext: "pdf",
    categoria: "Relatório",
    ano: 2026,
    nucleo: NUCLEOS[13]!,
    upload: "11/08/2026",
  },
  {
    id: "5",
    nome: "Curriculo_Ana_Beatriz_Moreira.docx",
    ext: "docx",
    categoria: "Currículo",
    ano: 2026,
    nucleo: NUCLEOS[1]!,
    upload: "11/08/2026",
  },
  {
    id: "6",
    nome: "NF_1042_Servicos_Manutencao.pdf",
    ext: "pdf",
    categoria: "Nota Fiscal",
    ano: 2024,
    nucleo: NUCLEOS[14]!,
    upload: "02/09/2024",
  },
  {
    id: "7",
    nome: "Formulario_Admissao_Colaborador.docx",
    ext: "docx",
    categoria: "Formulário",
    ano: 2025,
    nucleo: NUCLEOS[9]!,
    upload: "17/06/2025",
  },
  {
    id: "8",
    nome: "Relatorio_Prestacao_Contas_Diretoria.pdf",
    ext: "pdf",
    categoria: "Relatório",
    ano: 2026,
    nucleo: NUCLEOS[4]!,
    upload: "03/02/2026",
  },
];

export const DISTRIBUICAO_NUCLEO = [
  { name: "Manuscritos J. A. de Almeida", value: 32 },
  { name: "Era Nova / Modernismos", value: 26 },
  { name: "Acervo audiovisual", value: 24 },
  { name: "Patrimônio Arqueológico", value: 18 },
];

export const VOLUME_ANO = [
  { ano: "2024", total: 320 },
  { ano: "2025", total: 480 },
  { ano: "2026", total: 440 },
];