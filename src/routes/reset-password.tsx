import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha | MassaLab" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState("cliente");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") ?? "";
    const e = params.get("email") ?? "";
    const tp = params.get("tipo") ?? "cliente";
    if (!t || !e) {
      toast.error("Link invalido ou incompleto.");
      navigate({ to: "/auth" });
      return;
    }
    setToken(t);
    setEmail(decodeURIComponent(e));
    setTipo(tp);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const senha = fd.get("senha") as string;
    const confirmacao = fd.get("confirmacao") as string;
    if (senha.length < 6) {
      toast.error("Minimo 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas nao conferem.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/redefinir-senha", {
        method: "POST",
        auth: false,
        body: { email, tipo, token, senha, senha_confirmation: confirmacao },
      });
      setPronto(true);
      toast.success("Senha redefinida com sucesso!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center text-3xl font-bold tracking-tight text-primary">
          Massa<span className="text-foreground">Lab</span>
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <h2 className="mb-4 text-xl font-bold text-foreground">Redefinir senha</h2>
          {pronto ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Senha atualizada. Faca login com a nova senha.</p>
              <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Ir para o login</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">Redefindo senha para: <strong>{email}</strong></p>
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input id="senha" name="senha" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirmar nova senha</Label>
                <Input id="confirmacao" name="confirmacao" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
              <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:text-primary">Voltar para o login</Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}