import { useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type VarianteConfirmacaoSigad = "primaria" | "sucesso" | "atencao" | "perigo";

export interface DadosConfirmacaoSigad {
  titulo: string;
  descricao: string;
  categoriaNormativa?: string | undefined;
  detalhesAlvo?: string[] | undefined;
  variante?: VarianteConfirmacaoSigad | undefined;
  rotuloConfirmar?: string | undefined;
  rotuloCancelar?: string | undefined;
  onConfirmar: () => Promise<unknown> | unknown;
}

interface ModalConfirmacaoAcaoSigadProps {
  dados: DadosConfirmacaoSigad | null;
  processando?: boolean | undefined;
  onFechar: () => void;
  onConfirmar: () => void;
}

export function ModalConfirmacaoAcaoSigad({
  dados,
  processando = false,
  onFechar,
  onConfirmar,
}: ModalConfirmacaoAcaoSigadProps) {
  if (!dados) return null;

  const variante = dados.variante || "primaria";

  const configVisual = {
    primaria: {
      badgeCls: "bg-blue-100 text-blue-800 border-blue-200",
      boxCls: "border-blue-200 bg-blue-50/60 text-blue-950",
      btnCls: "bg-blue-600 text-white hover:bg-blue-700",
      icone: <HelpCircle className="h-5 w-5 text-blue-600 shrink-0" />,
      badgePadrao: "Confirmação de Operação Arquivística · SIGAD FCJA",
    },
    sucesso: {
      badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-200",
      boxCls: "border-emerald-200 bg-emerald-50/60 text-emerald-950",
      btnCls: "bg-emerald-600 text-white hover:bg-emerald-700",
      icone: <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />,
      badgePadrao: "Captura & Preservação Digital · Trilha de Auditoria",
    },
    atencao: {
      badgeCls: "bg-amber-100 text-amber-900 border-amber-200",
      boxCls: "border-amber-200 bg-amber-50/70 text-amber-950",
      btnCls: "bg-amber-600 text-white hover:bg-amber-700",
      icone: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
      badgePadrao: "Alerta de Governança & Alteração de Estado",
    },
    perigo: {
      badgeCls: "bg-red-100 text-red-800 border-red-200",
      boxCls: "border-red-200 bg-red-50/70 text-red-950",
      btnCls: "bg-red-600 text-white hover:bg-red-700",
      icone: <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />,
      badgePadrao: "Ação Crítica / Irreversível · Registro na Trilha Imutável",
    },
  }[variante];

  return (
    <AlertDialog open={dados !== null} onOpenChange={(open) => !open && !processando && onFechar()}>
      <AlertDialogContent className="sm:max-w-lg rounded-2xl border-slate-200 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${configVisual.badgeCls}`}
            >
              {configVisual.icone}
              {dados.categoriaNormativa || configVisual.badgePadrao}
            </span>
          </div>
          <AlertDialogTitle className="mt-2 text-lg font-bold text-slate-900 leading-snug">
            {dados.titulo}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
            {dados.descricao}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {dados.detalhesAlvo && dados.detalhesAlvo.length > 0 && (
          <div className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${configVisual.boxCls}`}>
            <p className="font-bold uppercase tracking-wider text-[10px] opacity-80">
              Resumo da Operação a Ser Auditada:
            </p>
            <ul className="space-y-1">
              {dados.detalhesAlvo.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-snug">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-75" />
                  <span className="font-medium break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter className="pt-2 gap-2">
          <AlertDialogCancel onClick={onFechar} disabled={processando}>
            {dados.rotuloCancelar || "Cancelar"}
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={onConfirmar}
            disabled={processando}
            className={`gap-2 ${configVisual.btnCls}`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {processando
              ? "Processando e Auditando..."
              : dados.rotuloConfirmar || "Sim, Prosseguir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook utilitário (SRP) para gerenciar o ciclo de vida dos alertas de confirmação
 * em qualquer tela do SIGAD.
 */
export function useConfirmacaoSigad() {
  const [confirmacaoAtiva, setConfirmacaoAtiva] = useState<DadosConfirmacaoSigad | null>(null);
  const [processando, setProcessando] = useState(false);

  const solicitarConfirmacao = useCallback((dados: DadosConfirmacaoSigad) => {
    setConfirmacaoAtiva(dados);
  }, []);

  const fecharConfirmacao = useCallback(() => {
    if (processando) return;
    setConfirmacaoAtiva(null);
  }, [processando]);

  const executarConfirmacao = useCallback(async () => {
    if (!confirmacaoAtiva) return;
    setProcessando(true);
    try {
      await confirmacaoAtiva.onConfirmar();
      setConfirmacaoAtiva(null);
    } finally {
      setProcessando(false);
    }
  }, [confirmacaoAtiva]);

  return {
    confirmacaoAtiva,
    processandoConfirmacao: processando,
    solicitarConfirmacao,
    fecharConfirmacao,
    executarConfirmacao,
  };
}
