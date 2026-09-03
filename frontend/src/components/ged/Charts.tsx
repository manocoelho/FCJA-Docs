import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Doc } from "./data";

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

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

function abreviar(nome: string) {
  return nome.length > 34 ? `${nome.slice(0, 34)}…` : nome;
}

export function PizzaNucleos({ docs }: { docs: Doc[] }) {
  const total = docs.length;
  const mapa = new Map<string, number>();
  for (const d of docs) mapa.set(d.nucleo, (mapa.get(d.nucleo) ?? 0) + 1);
  const dados = [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, qtd]) => ({
      name: abreviar(name),
      value: total ? Math.round((qtd / total) * 100) : 0,
    }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold">Documentos por Núcleo</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Distribuição percentual dos documentos filtrados
      </p>
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
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={98}
              paddingAngle={3}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {dados.map((entry, i) => (
                <Cell key={entry.name} fill={CORES[i % CORES.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function BarrasAno({ docs }: { docs: Doc[] }) {
  const mapa = new Map<number, number>();
  for (const d of docs) mapa.set(d.ano, (mapa.get(d.ano) ?? 0) + 1);
  const dados = [...mapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ano, total]) => ({ ano: String(ano), total }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold">Volume de Documentos por Ano</h3>
      <p className="mt-1 text-xs text-muted-foreground">Resultado dos filtros aplicados</p>
      <div className="mt-4 h-72">
        {dados.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Sem dados para os filtros selecionados.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            <Bar dataKey="total" name="Documentos" radius={[8, 8, 0, 0]} barSize={54}>
              {dados.map((entry, i) => (
                <Cell key={entry.ano} fill={CORES[i % CORES.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}