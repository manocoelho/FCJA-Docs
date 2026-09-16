import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Users, Trash2, Edit } from "lucide-react";

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

export function PainelAdmin() {
  const [usuarios, setUsuarios] = useState<{login: string, nome: string, papel: string}[]>([]);
  
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
    fetch("http://localhost:8000/api/usuarios")
      .then(res => res.json())
      .then(data => setUsuarios(data))
      .catch(() => toast.error("Erro ao carregar usuários"));
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("http://localhost:8000/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome, login: novoLogin, senha: novaSenha, papel: novoPapel })
    });
    const data = await res.json();
    if (data.sucesso) {
      toast.success(data.mensagem);
      setNovoNome(""); setNovoLogin(""); setNovaSenha("");
      carregarUsuarios();
    } else {
      toast.error(data.erro);
    }
  };

  const mudarPapel = async (login: string, novoPapel: string) => {
    await fetch(`http://localhost:8000/api/usuarios/${login}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ papel: novoPapel })
    });
    toast.success("Permissão atualizada!");
    carregarUsuarios();
  };

  const removerUsuario = async (login: string) => {
    if(!confirm(`Tem certeza que deseja remover o acesso de "${login}"?`)) return;
    await fetch(`http://localhost:8000/api/usuarios/${login}`, { method: "DELETE" });
    toast.success("Usuário removido do sistema.");
    carregarUsuarios();
  };

  const abrirEdicao = (u: any) => {
    setUsuarioEditando(u.login);
    setEditNome(u.nome);
    setEditLogin(u.login);
    setEditSenha("");
    setEditPapel(u.papel);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:8000/api/usuarios/${usuarioEditando}/editar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: editNome,
        login: editLogin,
        senha: editSenha,
        papel: editPapel
      })
    });
    
    const data = await res.json();
    if (data.sucesso) {
      toast.success(data.mensagem);
      if (usuarioEditando === sessionStorage.getItem("fcja_user") && editLogin !== usuarioEditando) {
        sessionStorage.setItem("fcja_user", editLogin);
        toast.info("Seu login foi atualizado. Use-o na próxima vez.");
      }
      setUsuarioEditando(null);
      carregarUsuarios();
    } else {
      toast.error(data.erro);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <header className="mb-8 border-b border-border pb-6">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-emerald-600" /> Painel do Administrador
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Adicione novos membros da equipe e gerencie seus níveis de acesso.</p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {/* FORMULÁRIO DE NOVO USUÁRIO */}
        <div className="md:col-span-1 rounded-2xl border bg-white p-6 shadow-sm h-fit">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Users className="h-5 w-5" /> Novo Usuário</h3>
          <form onSubmit={cadastrar} className="space-y-4">
            <div className="space-y-1"><Label>Nome Completo</Label><Input required value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: João Silva" /></div>
            <div className="space-y-1"><Label>Nome de Usuário (Login)</Label><Input required value={novoLogin} onChange={e => setNovoLogin(e.target.value)} placeholder="Ex: joao.silva" /></div>
            <div className="space-y-1"><Label>Senha</Label><Input required type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} /></div>
            <div className="space-y-1"><Label>Nível de Acesso</Label>
              <Select value={novoPapel} onValueChange={setNovoPapel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pesquisador">Pesquisador (Comum)</SelectItem>
                  <SelectItem value="admin">Administrador (Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2">Cadastrar Membro</Button>
          </form>
        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="md:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden h-fit">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr className="text-xs font-semibold text-slate-500 uppercase">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Nível de Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map(u => (
                <tr key={u.login} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{u.nome}</p>
                    <p className="text-xs text-slate-500">@{u.login}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Select value={u.papel} onValueChange={(v) => mudarPapel(u.login, v)}>
                      <SelectTrigger className={`h-8 w-36 text-xs font-semibold ${u.papel === 'admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pesquisador">Pesquisador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Editar Usuário">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removerUsuario(u.login)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Revogar Acesso">
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
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Deixe a senha em branco se desejar manter a atual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarEdicao} className="space-y-4 py-4">
            <div className="space-y-1"><Label>Nome Completo</Label><Input required value={editNome} onChange={e => setEditNome(e.target.value)} /></div>
            <div className="space-y-1"><Label>Login</Label><Input required value={editLogin} onChange={e => setEditLogin(e.target.value)} /></div>
            <div className="space-y-1"><Label>Nova Senha (Opcional)</Label><Input type="password" placeholder="******" value={editSenha} onChange={e => setEditSenha(e.target.value)} /></div>
            <div className="space-y-1"><Label>Nível de Acesso</Label>
              <Select value={editPapel} onValueChange={setEditPapel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pesquisador">Pesquisador (Comum)</SelectItem>
                  <SelectItem value="admin">Administrador (Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}