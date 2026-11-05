import { useState, useEffect } from "react";
import { AlertTriangle, FileWarning, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@/components/ged/data";
import { MOTIVOS_ELIMINACAO_OPCOES } from "@/lib/sigad-api";
import { podeEliminarDocumentoOficial, rotuloPapelSigad } from "@/lib/auth";

interface ModalEliminacaoControladaProps {
  alvos: Doc[];
  aberto: boolean;
  usuarioPapel?: string | null | undefined;
  onFechar: () => void;
  onConfirmar: (motivoEliminacao: string, justificativa: string) => Promise<void>;
}

export function ModalEliminacaoControlada({
  alvos,
  aberto,
  usuarioPapel,
  onFechar,
  onConfirmar,
}: ModalEliminacaoControladaProps) {
  const temDocumentoOficial = alvos.some(
    (d) => (d.statusDocumento || "ORIGINAL").toUpperCase() !== "MINUTA"
  );
  const temPermissaoOficial = podeEliminarDocumentoOficial(usuarioPapel);
  const bloqueadoPorRbac = temDocumentoOficial && !temPermissaoOficial;

  const [motivo, setMotivo] = useState<string>(
    temDocumentoOficial ? "CUMPRIMENTO_PRAZO_TTD" : "DESCARTE_MINUTA_RASCUNHO"
  );
  const [justificativa, setJustificativa] = useState<string>("");
  const [processando, setProcessando] = useState<boolean>(false);

  useEffect(() => {
    if (aberto) {
      setMotivo(
        temDocumentoOficial ? "CUMPRIMENTO_PRAZO_TTD" : "DESCARTE_MINUTA_RASCUNHO"
      );
      setJustificativa("");
    }
  }, [aberto, temDocumentoOficial]);

  async function submeterEliminacao() {
    if (bloqueadoPorRbac) return;

    const justLimpa = justificativa.trim();
    if (temDocumentoOficial && justLimpa.length < 10) {
      toast.error("Justificativa obrigatória (e-ARQ Brasil v2)", {
        description:
          "Informe ao menos 10 caracteres de fundamentação técnica para emitir o Termo de Eliminação.",
      });
      return;
    }

    setProcessando(true);
    try {
      await onConfirmar(
        motivo,
        justLimpa || "Descarte de minuta em espaço de trabalho."
      );
      onFechar();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                bloqueadoPorRbac
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {bloqueadoPorRbac ? (
                <>
                  <ShieldAlert className="h-3.5 w-3.5" /> Bloqueio de Imutabilidade (RBAC)
                </>
              ) : (
                <>
                  <FileWarning className="h-3.5 w-3.5" /> Governança de Eliminação e-ARQ v2
                </>
              )}
            </span>
          </div>
          <DialogTitle className="mt-1">
            {bloqueadoPorRbac
              ? "Exclusão Bloqueada — Documento Oficial Capturado"
              : `Emitir Termo de Eliminação (${alvos.length} documento${
                  alvos.length > 1 ? "s" : ""
                })`}
          </DialogTitle>
          <DialogDescription>
            {bloqueadoPorRbac
              ? "Segundo o e-ARQ Brasil v2 (Cap. 2 e Cap. 3.2), documentos oficiais capturados são imutáveis no espaço geral e não podem ser apagados por pesquisadores."
              : "A eliminação de documentos no SIGAD requer fundamentação normativa e gera automaticamente um Termo de Eliminação perpétuo na Trilha de Auditoria."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Lista de Documentos Alvo */}
          <div className="rounded-xl border border-border bg-slate-50 p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
              Documento(s) selecionado(s):
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
              {alvos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-800">
                    {d.numeroProtocolo ? `[${d.numeroProtocolo}] ` : ""}
                    {d.nome}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      (d.statusDocumento || "ORIGINAL") === "MINUTA"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {d.statusDocumento || "ORIGINAL"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {bloqueadoPorRbac ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-sm text-red-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                Permissão insuficiente para o perfil &ldquo;{rotuloPapelSigad(usuarioPapel)}&rdquo;
              </p>
              <p>
                Pesquisadores possuem permissão apenas para descartar rascunhos com status{" "}
                <strong>MINUTA</strong>. Para eliminar documentos oficiais (
                <strong>ORIGINAL</strong> ou <strong>CÓPIA</strong>), solicite a avaliação de um{" "}
                <strong>Arquivista SIGAD</strong> ou <strong>Administrador</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Motivo Normativo da Eliminação (CONARQ / e-ARQ v2)</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_ELIMINACAO_OPCOES.map((op) => (
                      <SelectItem key={op.valor} value={op.valor}>
                        {op.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="justificativa-termo">
                  Justificativa Técnica / Fundamentação para o Termo de Eliminação{" "}
                  {temDocumentoOficial && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="justificativa-termo"
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder={
                    temDocumentoOficial
                      ? "Descreva o motivo técnico ou referência ao Edital/TTD para constar no Termo de Eliminação (mínimo 10 caracteres)..."
                      : "Opcional para descarte de minuta/rascunho..."
                  }
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={processando}>
            {bloqueadoPorRbac ? "Entendido" : "Cancelar"}
          </Button>
          {!bloqueadoPorRbac && (
            <Button
              variant="destructive"
              onClick={submeterEliminacao}
              disabled={processando}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {processando
                ? "Emitindo Termo e Eliminando..."
                : "Confirmar e Emitir Termo de Eliminação"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
