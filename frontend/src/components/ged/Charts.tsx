import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SIGLA_POR_NUCLEO, type Doc } from "./data";

const CORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const CORES_HEX_FALLBACK = [
  "#2563eb",
  "#059669",
  "#7c3aed",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
  "#db2777",
];

const tooltipStyle = {
  backgroundColor: "var(--popover, #ffffff)",
  border: "1px solid var(--border, #e2e8f0)",
  borderRadius: "10px",
  color: "var(--popover-foreground, #0f172a)",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
};

function abreviar(nome: string, max: number = 34) {
  return nome.length > max ? `${nome.slice(0, max)}…` : nome;
}

export function PizzaNucleos({ docs }: { docs: Doc[] }) {
  const total = docs.length;
  const mapa = new Map<string, number>();
  for (const d of docs) mapa.set(d.nucleo, (mapa.get(d.nucleo) ?? 0) + 1);
  const dados = [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, qtd]) => {
      const sigla = SIGLA_POR_NUCLEO[name];
      const sufixoSigla = sigla ? sigla.split("_").pop() : undefined;
      return {
        name: sufixoSigla ? `[${sufixoSigla}] ${abreviar(name, 26)}` : abreviar(name, 32),
        nomeCompleto: name,
        qtd,
        value: total ? Math.round((qtd / total) * 100) : 0,
      };
    });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Fundo / Produtor Arquivístico (NOBRADE)
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            Distribuição por Núcleo de Pesquisa
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Participação percentual e volume de itens documentais por núcleo produtor
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {mapa.size} núcleo(s) ativo(s)
        </span>
      </div>
      <div className="mt-4 h-72">
        {dados.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Sem dados para os filtros selecionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="qtd"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {dados.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={CORES[i % CORES.length] || CORES_HEX_FALLBACK[i % CORES_HEX_FALLBACK.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, _name: string, props: any) => [
                  `${v} doc(s) (${props?.payload?.value ?? 0}%)`,
                  props?.payload?.nomeCompleto || "Núcleo",
                ]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function BarrasAno({ docs }: { docs: Doc[] }) {
  const mapa = new Map<number, { total: number; fim: number; meio: number }>();
  for (const d of docs) {
    const atual = mapa.get(d.ano) ?? { total: 0, fim: 0, meio: 0 };
    atual.total += 1;
    const ehFim =
      d.tipoAtividade === "Atividade-Fim" ||
      (d.codigoClassificacao || "").startsWith("FIM.");
    if (ehFim) atual.fim += 1;
    else atual.meio += 1;
    mapa.set(d.ano, atual);
  }
  const dados = [...mapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ano, val]) => ({
      ano: String(ano),
      total: val.total,
      "Atividade-Fim": val.fim,
      "Atividade-Meio": val.meio,
    }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Datas-Limite & Produção Documental
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            Evolução Cronológica do Acervo (Ano)
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Série histórica de captura discriminada entre Atividade-Fim e Atividade-Meio
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {docs.length} doc(s)
        </span>
      </div>
      <div className="mt-4 h-72">
        {dados.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Sem dados para os filtros selecionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="ano"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="Atividade-Fim"
                stackId="a"
                fill="#7c3aed"
                radius={[0, 0, 0, 0]}
                barSize={44}
              />
              <Bar
                dataKey="Atividade-Meio"
                stackId="a"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
                barSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function BarrasTipologia({ docs }: { docs: Doc[] }) {
  const mapa = new Map<string, number>();
  for (const d of docs) {
    const chave = d.categoria || "Não Classificado";
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  const dados = [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([nome, total]) => ({ nome: abreviar(nome, 28), nomeCompleto: nome, total }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
            Espécies & Tipologias Documentais
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            Top Tipologias e Classes Recorrentes
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Classificações documentais com maior incidência no recorte atual
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {mapa.size} espécie(s)
        </span>
      </div>
      <div className="mt-4 h-72">
        {dados.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Sem dados para os filtros selecionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="nome"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={155}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                contentStyle={tooltipStyle}
                formatter={(v: number, _n: string, props: any) => [
                  `${v} documento(s)`,
                  props?.payload?.nomeCompleto || "Tipologia",
                ]}
              />
              <Bar dataKey="total" name="Documentos" radius={[0, 8, 8, 0]} barSize={26}>
                {dados.map((entry, i) => (
                  <Cell
                    key={entry.nome}
                    fill={CORES[i % CORES.length] || CORES_HEX_FALLBACK[i % CORES_HEX_FALLBACK.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface GraficoCicloVitalProps {
  faseCorrente: number;
  faseIntermediaria: number;
  aptosRecolhimento: number;
  aptosEliminacao: number;
  guardaPermanente: number;
  eliminacaoPrevista: number;
}

export function GraficoCicloVitalTtd({
  faseCorrente,
  faseIntermediaria,
  aptosRecolhimento,
  aptosEliminacao,
  guardaPermanente,
  eliminacaoPrevista,
}: GraficoCicloVitalProps) {
  const dadosFases = [
    {
      etapa: "1ª Idade (Corrente)",
      quantidade: faseCorrente,
      cor: "#2563eb",
      descricao: "Vigência administrativa/pesquisa ativa nos núcleos",
    },
    {
      etapa: "2ª Idade (Intermediária)",
      quantidade: faseIntermediaria,
      cor: "#d97706",
      descricao: "Aguardando cumprimento de prazo precaucional na TTD",
    },
    {
      etapa: "3ª Idade / Recolhimento",
      quantidade: aptosRecolhimento,
      cor: "#059669",
      descricao: "Valor histórico/probatório definitivo (RDC-Arq / AtoM)",
    },
    {
      etapa: "Apto a Eliminação",
      quantidade: aptosEliminacao,
      cor: "#dc2626",
      descricao: "Prazo vencido para descarte mediante Termo Oficial",
    },
  ];

  const totalDest = Math.max(1, guardaPermanente + eliminacaoPrevista);
  const pctPermanente = Math.round((guardaPermanente / totalDest) * 100);
  const pctEliminacao = 100 - pctPermanente;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Teoria das Três Idades & TTD (CONARQ)
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            Ciclo Vital dos Documentos & Destinação Prevista
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enquadramento normativo nas fases arquivísticas conforme Tabela de Temporalidade
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          {pctPermanente}% Guarda Permanente
        </span>
      </div>

      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dadosFases} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="etapa"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)" }}
              contentStyle={tooltipStyle}
              formatter={(v: number, _n: string, props: any) => [
                `${v} documento(s)`,
                props?.payload?.descricao || "Fase Arquivística",
              ]}
            />
            <Bar dataKey="quantidade" name="Documentos" radius={[8, 8, 0, 0]} barSize={46}>
              {dadosFases.map((entry) => (
                <Cell key={entry.etapa} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Barra Resumo de Destinação Final TTD */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Guarda Permanente (Recolhimento RDC-Arq):{" "}
            <strong className="text-slate-900">{guardaPermanente}</strong> ({pctPermanente}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Guarda Temporária / Eliminação TTD:{" "}
            <strong className="text-slate-900">{eliminacaoPrevista}</strong> ({pctEliminacao}%)
          </span>
        </div>
        <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="bg-emerald-600 transition-all duration-500"
            style={{ width: `${pctPermanente}%` }}
          />
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${pctEliminacao}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface GraficoFormatosPreservacaoProps {
  porFormato: Record<string, number>;
  originais: number;
  minutas: number;
  copias: number;
  ostensivos: number;
  restritosLgpd: number;
  sigilososLai: number;
}

export function GraficoGovernancaFormatos({
  porFormato,
  originais,
  minutas,
  copias,
  ostensivos,
  restritosLgpd,
  sigilososLai,
}: GraficoFormatosPreservacaoProps) {
  const formatosLista = [
    {
      sigla: "PDF / PDF-A",
      ext: "pdf",
      qtd: porFormato["pdf"] || 0,
      cor: "bg-red-500",
      padrao: "Padrão de Preservação Textual (ISO 19005)",
    },
    {
      sigla: "TIFF Matriz",
      ext: "tiff",
      qtd: porFormato["tiff"] || 0,
      cor: "bg-emerald-600",
      padrao: "Matriz Digital Sem Compressão (CONARQ)",
    },
    {
      sigla: "Planilha XLSX",
      ext: "xlsx",
      qtd: porFormato["xlsx"] || 0,
      cor: "bg-blue-600",
      padrao: "Dados Tabulares OpenXML (ISO/IEC 29500)",
    },
    {
      sigla: "Texto DOCX",
      ext: "docx",
      qtd: porFormato["docx"] || 0,
      cor: "bg-indigo-600",
      padrao: "Documento Textual Editável",
    },
  ];

  const totalFormatos = Math.max(
    1,
    formatosLista.reduce((acc, item) => acc + item.qtd, 0)
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            Diplomática, Acessibilidade Legal & Formatos de Preservação
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            Restrição de Acesso (LAI/LGPD) e Representação Digital
          </h3>
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-3">
        {/* Coluna 1: Formatos de Arquivo */}
        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            1. Componentes Digitais por Formato
          </h4>
          <div className="space-y-3">
            {formatosLista.map((f) => {
              const pct = Math.round((f.qtd / totalFormatos) * 100);
              return (
                <div key={f.ext} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{f.sigla}</span>
                    <span className="font-mono text-slate-600">
                      {f.qtd} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${f.cor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{f.padrao}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Status da Tradição Documental (Diplomática) */}
        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            2. Grau de Tradição Documental
          </h4>
          <p className="text-xs text-muted-foreground">
            Qualificação diplomática conforme metadado obrigatório de captura do e-ARQ Brasil:
          </p>
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-slate-900">Original Oficial</p>
                <p className="text-[11px] text-muted-foreground">
                  Primeiro exemplar completo e eficaz
                </p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-sm font-bold text-emerald-800">
                {originais}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-slate-900">Minuta / Rascunho</p>
                <p className="text-[11px] text-muted-foreground">
                  Versão preliminar passível de descarte
                </p>
              </div>
              <span className="rounded-md bg-amber-100 px-2.5 py-1 font-mono text-sm font-bold text-amber-800">
                {minutas}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-slate-900">Cópia de Referência</p>
                <p className="text-[11px] text-muted-foreground">
                  Reprodução para apoio à pesquisa
                </p>
              </div>
              <span className="rounded-md bg-blue-100 px-2.5 py-1 font-mono text-sm font-bold text-blue-800">
                {copias}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna 3: Classificação de Sigilo e Acesso (LAI & LGPD) */}
        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            3. Governança de Acesso (LAI & LGPD)
          </h4>
          <p className="text-xs text-muted-foreground">
            Controle de difusão pública para o portal AtoM e proteção de dados sensíveis:
          </p>
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-emerald-900">Ostensivo (Acesso Livre)</p>
                <p className="text-[11px] text-muted-foreground">
                  Apto à difusão pública no AtoM (DIP)
                </p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-sm font-bold text-emerald-800">
                {ostensivos}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-amber-900">Restrito — Pessoal (LGPD)</p>
                <p className="text-[11px] text-muted-foreground">
                  Lei nº 13.709/2018 (Art. 31 da LAI)
                </p>
              </div>
              <span className="rounded-md bg-amber-100 px-2.5 py-1 font-mono text-sm font-bold text-amber-800">
                {restritosLgpd}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-red-900">Sigiloso — Legal (LAI)</p>
                <p className="text-[11px] text-muted-foreground">
                  Lei nº 12.527/2011 (Acesso controlado)
                </p>
              </div>
              <span className="rounded-md bg-red-100 px-2.5 py-1 font-mono text-sm font-bold text-red-800">
                {sigilososLai}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
