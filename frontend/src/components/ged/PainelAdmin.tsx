import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Users, Trash2, Edit, Lock, CheckCircle2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api";
import { obterHeadersAuth, rotuloPapelSigad } from "@/lib/auth";

interface UsuarioItem {
  login: string;
  nome: string;
  papel: string;
  senhaCriptografada?: boolean | undefined;
}

export function PainelAdmin() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);

  // Estados de Criação
  const [novoNome, setNovoNome] = useState("");
  const [novoLogin, setNovoLogin] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPapel, setNovoPapel] = useState("pesquisador");

  // Estados de Edição
  const [usuarioEditando, setUsuarioEditando] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editLogin, setEditLogin] = useState("");
  const [editSenha, setEditSenha] = useState("");
  const [editPapel, setEditPapel] = useState("pesquisador");

  const carregarUsuarios = () => {
    fetch(`${API_BASE_URL}/api/usuarios`, { headers: obterHeadersAuth() })
      .then((res) => res.json())
      .then((data) => setUsuarios(data))
      .catch(() => toast.error("Erro ao carregar usuários"));
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/usuarios`, {
      method: "POST",
      headers: obterHeadersAuth({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        nome: novoNome,
        login: novoLogin,
        senha: novaSenha,
        papel: novoPapel,
      }),
    });
    const data = await res.json();
    if (data.sucesso) {
      toast.success(data.mensagem);
      setNovoNome("");
      setNovoLogin("");
      setNovaSenha("");
      carregarUsuarios();
    } else {
      toast.error(data.erro || data.detail || "Erro ao cadastrar usuário");
    }
  };

  const mudarPapel = async (login: string, papel: string) => {
    const res = await fetch(`${API_BASE_URL}/api/usuarios/${login}`, {
      method: "PUT",
      headers: obterHeadersAuth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ papel }),
    });
    if (res.ok) {
      toast.success(`Perfil RBAC atualizado para ${rotuloPapelSigad(papel)}!`);
      carregarUsuarios();
    } else {
      toast.error("Não foi possível atualizar a permissão.");
    }
  };

  const removerUsuario = async (login: string) => {
    if (!confirm(`Tem certeza que deseja revogar o acesso de "${login}"?`)) return;
    await fetch(`${API_BASE_URL}/api/usuarios/${login}`, {
      method: "DELETE",
      headers: obterHeadersAuth(),
    });
    toast.success("Acesso revogado e registrado na auditoria.");
    carregarUsuarios();
  };

  const abrirEdicao = (u: UsuarioItem) => {
    setUsuarioEditando(u.login);
    setEditNome(u.nome);
    setEditLogin(u.login);
    setEditSenha("");
    setEditPapel(u.papel);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/usuarios/${usuarioEditando}/editar`, {
      method: "PUT",
      headers: obterHeadersAuth({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        nome: editNome,
        login: editLogin,
        senha: editSenha,
        papel: editPapel,
      }),
    });

    const data = await res.json();
    if (data.sucesso) {
      toast.success(data.mensagem);
      setUsuarioEditando(null);
      carregarUsuarios();
    } else {
      toast.error(data.erro || data.detail || "Erro ao editar usuário");
    }
  };

  function estiloSelectPapel(papel: string) {
    if (papel === "admin") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (papel === "arquivista") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-emerald-600/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
            Controle de Acesso & Segurança
          </span>
        </div>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-emerald-600" /> Gestão de Agentes e Perfis RBAC
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Credenciais protegidas com derivação PBKDF2-HMAC-SHA256 (600.000 iterações) e tokens JWT
          assinados.
        </p>
      </header>

      {/* Matriz de Governança RBAC do SIGAD */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
            Pesquisador FCJA
          </span>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Captura documentos do seu núcleo, edita metadados descritivos e descarta apenas
            rascunhos em status <strong>MINUTA</strong>. Bloqueado contra exclusão de documentos
            oficiais.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
          <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase text-blue-800">
            Arquivista SIGAD
          </span>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Audita fixidade PREMIS em lote, classifica documentos, autoriza eliminações oficiais
            mediante <strong>Termo de Eliminação</strong> e homologa recolhimentos ao Archivematica.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800">
            Administrador Geral
          </span>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Acesso integral à infraestrutura, gerenciamento de agentes/credenciais RBAC, auditoria
            completa e configuração de integração com o RDC-Arq.
          </p>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        {/* FORMULÁRIO DE NOVO USUÁRIO */}
        <div className="md:col-span-1 rounded-2xl border bg-white p-6 shadow-sm h-fit">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" /> Cadastrar Agente
          </h3>
          <form onSubmit={cadastrar} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input
                required
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Maria Clara Almeida"
              />
            </div>
            <div className="space-y-1">
              <Label>Identificador (Login)</Label>
              <Input
                required
                value={novoLogin}
                onChange={(e) => setNovoLogin(e.target.value)}
                placeholder="Ex: maria.almeida"
              />
            </div>
            <div className="space-y-1">
              <Label>Senha Inicial</Label>
              <Input
                required
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil Arquivístico (RBAC)</Label>
              <Select value={novoPapel} onValueChange={setNovoPapel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pesquisador">Pesquisador (Captura & Consulta)</SelectItem>
                  <SelectItem value="arquivista">
                    Arquivista SIGAD (Gestão, TTD & Termos)
                  </SelectItem>
                  <SelectItem value="admin">Administrador (Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2">
              Cadastrar Agente no SIGAD
            </Button>
          </form>
        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="md:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden h-fit">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr className="text-xs font-semibold text-slate-500 uppercase">
                <th className="px-6 py-4">Agente Credenciado</th>
                <th className="px-6 py-4">Criptografia de Senha</th>
                <th className="px-6 py-4">Perfil RBAC</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map((u) => (
                <tr key={u.login} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{u.nome}</p>
                    <p className="text-xs font-mono text-slate-500">@{u.login}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      <Lock className="h-3 w-3" />
                      PBKDF2-SHA256
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Select value={u.papel} onValueChange={(v) => mudarPapel(u.login, v)}>
                      <SelectTrigger
                        className={`h-8 w-44 text-xs font-semibold ${estiloSelectPapel(u.papel)}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pesquisador">Pesquisador</SelectItem>
                        <SelectItem value="arquivista">Arquivista SIGAD</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEdicao(u)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      title="Editar Agente"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerUsuario(u.login)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Revogar Acesso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!usuarioEditando} onOpenChange={(open) => !open && setUsuarioEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Agente do SIGAD</DialogTitle>
            <DialogDescription>
              Deixe a senha em branco para manter o hash PBKDF2-SHA256 atual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarEdicao} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input required value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Login</Label>
              <Input required value={editLogin} onChange={(e) => setEditLogin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nova Senha (Opcional)</Label>
              <Input
                type="password"
                placeholder="******"
                value={editSenha}
                onChange={(e) => setEditSenha(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil Arquivístico (RBAC)</Label>
              <Select value={editPapel} onValueChange={setEditPapel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pesquisador">Pesquisador (Captura & Consulta)</SelectItem>
                  <SelectItem value="arquivista">
                    Arquivista SIGAD (Gestão, TTD & Termos)
                  </SelectItem>
                  <SelectItem value="admin">Administrador (Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2 gap-2">
              <CheckCircle2 className="h-4 w-4" /> Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
