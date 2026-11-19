import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  FileSpreadsheet,
  Heading1,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Palette,
  PanelBottom,
  PanelTop,
  Printer,
  Quote,
  Redo2,
  Scissors,
  Stamp,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import type { ConfigPaginaEditor } from "@/lib/editor-documentos-export";

interface BarraFerramentasEditorProps {
  cfgPagina: ConfigPaginaEditor;
  onChangeCfgPagina: (parcial: Partial<ConfigPaginaEditor>) => void;
  onComando: (cmd: string, valor?: string) => void;
  onAbrirModalTabela: () => void;
  onAbrirModalPlanilha: () => void;
  onAbrirModalImagem: () => void;
  onInserirLink: () => void;
  onInserirChecklist: () => void;
  onInserirQuebraPagina: () => void;
  onInserirCarimboProtocolo: () => void;
  onImprimirPdf: () => void;
}

const FONTES_DISPONIVEIS = [
  { valor: "Times New Roman", rotulo: "Times New Roman (ABNT)" },
  { valor: "Arial", rotulo: "Arial (Oficial)" },
  { valor: "Georgia", rotulo: "Georgia (Editorial)" },
  { valor: "Calibri", rotulo: "Calibri" },
  { valor: "Verdana", rotulo: "Verdana" },
  { valor: "Garamond", rotulo: "Garamond (Clássica)" },
  { valor: "Courier New", rotulo: "Courier New (Monoespaçada)" },
];

const TAMANHOS_FONTE = [
  { valor: "1", rotulo: "8 pt" },
  { valor: "2", rotulo: "10 pt" },
  { valor: "3", rotulo: "12 pt (Padrão)" },
  { valor: "4", rotulo: "14 pt" },
  { valor: "5", rotulo: "18 pt" },
  { valor: "6", rotulo: "24 pt" },
  { valor: "7", rotulo: "36 pt" },
];

export function BarraFerramentasEditor({
  cfgPagina,
  onChangeCfgPagina,
  onComando,
  onAbrirModalTabela,
  onAbrirModalPlanilha,
  onAbrirModalImagem,
  onInserirLink,
  onInserirChecklist,
  onInserirQuebraPagina,
  onInserirCarimboProtocolo,
  onImprimirPdf,
}: BarraFerramentasEditorProps) {
  function prevFoco(e: React.MouseEvent) {
    e.preventDefault();
  }

  const btnCls =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-200/80 hover:text-slate-950 active:bg-slate-300";

  return (
    <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur-md space-y-2">
      {/* LINHA 1 DA RIBBON: Tipografia, Formatação de Texto, Alinhamento e Listas */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 pb-2">
        {/* Desfazer / Refazer / Imprimir */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("undo")}
            className={btnCls}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("redo")}
            className={btnCls}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onImprimirPdf}
            className={btnCls}
            title="Imprimir ou Salvar como PDF A4"
          >
            <Printer className="h-4 w-4 text-blue-600" />
          </button>
        </div>

        {/* Estilo do Bloco (Parágrafo / Títulos) */}
        <div className="flex items-center gap-1.5 px-1.5 border-r border-slate-200">
          <select
            aria-label="Estilo de parágrafo"
            defaultValue="P"
            onChange={(e) => onComando("formatBlock", e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none"
          >
            <option value="P">Texto Normal</option>
            <option value="H1">Título 1 (Principal)</option>
            <option value="H2">Título 2 (Seção)</option>
            <option value="H3">Título 3 (Subseção)</option>
            <option value="BLOCKQUOTE">Citação Longa (ABNT)</option>
          </select>

          {/* Família da Fonte */}
          <select
            aria-label="Fonte"
            defaultValue="Times New Roman"
            onChange={(e) => onComando("fontName", e.target.value)}
            className="h-8 max-w-[165px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none"
          >
            {FONTES_DISPONIVEIS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </select>

          {/* Tamanho da Fonte */}
          <select
            aria-label="Tamanho da fonte"
            defaultValue="3"
            onChange={(e) => onComando("fontSize", e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none"
          >
            {TAMANHOS_FONTE.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </div>

        {/* Negrito, Itálico, Sublinhado, Tachado, Sub/Sobrescrito */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("bold")}
            className={btnCls}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("italic")}
            className={btnCls}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("underline")}
            className={btnCls}
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("strikeThrough")}
            className={btnCls}
            title="Tachado"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("subscript")}
            className={btnCls}
            title="Subscrito"
          >
            <Subscript className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("superscript")}
            className={btnCls}
            title="Sobrescrito"
          >
            <Superscript className="h-4 w-4" />
          </button>

          {/* Cor do Texto */}
          <label
            className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-700 hover:bg-slate-200/80"
            title="Cor da Fonte"
          >
            <Palette className="h-4 w-4 text-blue-600" />
            <input
              type="color"
              defaultValue="#0f172a"
              onChange={(e) => onComando("foreColor", e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          {/* Marca-Texto / Realce */}
          <label
            className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-700 hover:bg-slate-200/80"
            title="Cor de Realce (Marca-Texto)"
          >
            <Highlighter className="h-4 w-4 text-amber-500" />
            <input
              type="color"
              defaultValue="#fef08a"
              onChange={(e) => onComando("hiliteColor", e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("removeFormat")}
            className={btnCls}
            title="Limpar Formatação"
          >
            <Eraser className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Alinhamento e Recuo */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("justifyLeft")}
            className={btnCls}
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("justifyCenter")}
            className={btnCls}
            title="Centralizar"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("justifyRight")}
            className={btnCls}
            title="Alinhar à Direita"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("justifyFull")}
            className={btnCls}
            title="Justificar Texto (ABNT)"
          >
            <AlignJustify className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("outdent")}
            className={btnCls}
            title="Diminuir Recuo"
          >
            <IndentDecrease className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("indent")}
            className={btnCls}
            title="Aumentar Recuo"
          >
            <IndentIncrease className="h-4 w-4" />
          </button>
        </div>

        {/* Listas e Títulos Rápidos */}
        <div className="flex items-center gap-0.5 pl-1">
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("insertUnorderedList")}
            className={btnCls}
            title="Lista com Marcadores"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("insertOrderedList")}
            className={btnCls}
            title="Lista Numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onInserirChecklist}
            className={btnCls}
            title="Inserir Item de Verificação (Checklist)"
          >
            <ListChecks className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("formatBlock", "H1")}
            className={btnCls}
            title="Título 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("formatBlock", "H2")}
            className={btnCls}
            title="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("formatBlock", "BLOCKQUOTE")}
            className={btnCls}
            title="Citação Direta"
          >
            <Quote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* LINHA 2 DA RIBBON: Inserção de Tabelas, Planilhas, Imagens, Cabeçalho/Rodapé e Layout A4 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Botões de Inserção Rica */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onAbrirModalTabela}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
          >
            <Table2 className="h-3.5 w-3.5 text-blue-600" />
            Inserir Tabela
          </button>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onAbrirModalPlanilha}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Planilha Calculada (.xlsx)
          </button>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onAbrirModalImagem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1.5 font-semibold text-purple-800 hover:bg-purple-100 transition-colors"
          >
            <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
            Inserir Imagem + Legenda
          </button>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onInserirLink}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Link2 className="h-3.5 w-3.5 text-slate-500" />
            Link
          </button>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={() => onComando("insertHorizontalRule")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Inserir Linha Divisória Horizontal"
          >
            <Minus className="h-3.5 w-3.5 text-slate-500" />
            Divisor
          </button>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onInserirQuebraPagina}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Inserir Quebra de Página A4"
          >
            <Scissors className="h-3.5 w-3.5 text-slate-500" />
            Quebra de Página
          </button>

          <button
            type="button"
            onMouseDown={prevFoco}
            onClick={onInserirCarimboProtocolo}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Inserir Carimbo Institucional com Data/Hora"
          >
            <Stamp className="h-3.5 w-3.5 text-blue-600" />
            Carimbo FCJA
          </button>
        </div>

        {/* Controles de Cabeçalho, Rodapé e Página A4 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChangeCfgPagina({ mostrarCabecalho: !cfgPagina.mostrarCabecalho })
            }
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-semibold transition-colors ${
              cfgPagina.mostrarCabecalho
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
            title="Ativar/Desativar Cabeçalho da Página"
          >
            <PanelTop className="h-3.5 w-3.5" />
            Cabeçalho
          </button>

          <button
            type="button"
            onClick={() =>
              onChangeCfgPagina({ mostrarRodape: !cfgPagina.mostrarRodape })
            }
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-semibold transition-colors ${
              cfgPagina.mostrarRodape
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
            title="Ativar/Desativar Rodapé da Página"
          >
            <PanelBottom className="h-3.5 w-3.5" />
            Rodapé
          </button>

          <select
            aria-label="Espaçamento entre linhas"
            value={cfgPagina.espacamentoLinhas}
            onChange={(e) =>
              onChangeCfgPagina({
                espacamentoLinhas: e.target.value as ConfigPaginaEditor["espacamentoLinhas"],
              })
            }
            className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-700"
            title="Espaçamento entre linhas"
          >
            <option value="1.0">Espaço 1.0</option>
            <option value="1.15">Espaço 1.15</option>
            <option value="1.5">Espaço 1.5 (ABNT)</option>
            <option value="2.0">Espaço 2.0</option>
          </select>

          <select
            aria-label="Margens da folha A4"
            value={cfgPagina.margem}
            onChange={(e) =>
              onChangeCfgPagina({
                margem: e.target.value as ConfigPaginaEditor["margem"],
              })
            }
            className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-700"
            title="Margens da folha A4"
          >
            <option value="abnt">Margem ABNT (3/2cm)</option>
            <option value="normal">Margem Normal (2.5cm)</option>
            <option value="estreita">Margem Estreita (1.27cm)</option>
            <option value="larga">Margem Larga</option>
          </select>

          <select
            aria-label="Orientação da folha"
            value={cfgPagina.orientacao}
            onChange={(e) =>
              onChangeCfgPagina({
                orientacao: e.target.value as ConfigPaginaEditor["orientacao"],
              })
            }
            className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-700"
          >
            <option value="retrato">A4 Retrato</option>
            <option value="paisagem">A4 Paisagem</option>
          </select>

          <select
            aria-label="Zoom da folha"
            value={String(cfgPagina.zoom)}
            onChange={(e) => onChangeCfgPagina({ zoom: Number(e.target.value) })}
            className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-700"
          >
            <option value="85">85%</option>
            <option value="100">100%</option>
            <option value="115">115%</option>
            <option value="125">125%</option>
          </select>
        </div>
      </div>
    </div>
  );
}
