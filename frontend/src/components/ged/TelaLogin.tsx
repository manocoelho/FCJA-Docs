import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TelaLoginProps {
  onLoginSuccess: (nome: string, papel: string) => void;
}

export function TelaLogin({ onLoginSuccess }: TelaLoginProps) {
  const [loginInput, setLoginInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErroLogin("");
    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginInput, senha: senhaInput }),
      });
      const data = await res.json();
      
      if (data.sucesso) {
        sessionStorage.setItem("fcja_user", data.nome);
        sessionStorage.setItem("fcja_role", data.papel);
        // Avisa a tela principal quem acabou de entrar!
        onLoginSuccess(data.nome, data.papel);
        toast.success(`Bem-vindo(a), ${data.nome}!`);
      } else {
        setErroLogin("Credenciais inválidas. Tente novamente.");
      }
    } catch (err) {
      setErroLogin("Erro ao conectar com o servidor.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-primary text-white shadow-xl shadow-primary/20">
            <Library className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">FCJA Docs</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Acervo Digital
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input value={loginInput} onChange={e => setLoginInput(e.target.value)} placeholder="Ex: admin" required />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="relative">
              <Input 
                type={mostrarSenha ? "text" : "password"} 
                value={senhaInput} 
                onChange={e => setSenhaInput(e.target.value)} 
                required 
              />
              <button 
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {erroLogin && <p className="mt-4 text-sm text-destructive text-center">{erroLogin}</p>}

        <Button type="submit" className="mt-6 w-full">Entrar no Sistema</Button>
      </form>
    </div>
  );
}