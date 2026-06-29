import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError, setToken, setStoredUser, getToken, type AppRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | MassaLab" },
      { name: "description", content: "Faca login ou crie sua conta no MassaLab." },
    ],
  }),
  component: AuthPage,
});

const SIGNUP_ROLE_VALUES = ["cliente", "garcom", "cozinha"] as const;
type SignupRole = (typeof SIGNUP_ROLE_VALUES)[number];
const FUNCIONARIO_ROLES: SignupRole[] = ["garcom", "cozinha"];
const RESTAURANTE_ID = 1;

const signupClienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("E-mail invalido").max(255),
  senha: z.string().min(6, "Minimo 6 caracteres").max(72),
});

const signupFuncionarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("E-mail invalido").max(255),
  senha: z.string().min(6, "Minimo 6 caracteres").max(72),
  papel: z.enum(["garcom", "cozinha"]),
  codigo: z.string().trim().min(1, "Informe o codigo de autenticacao da empresa"),
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail invalido").max(255),
  senha: z.string().min(1, "Informe a senha").max(72),
});

function redirectByRole(role: AppRole, navigate: ReturnType<typeof useNavigate>) {
  if (role === "garcom") navigate({ to: "/garcom" });
  else if (role === "cozinha") navigate({ to: "/cozinha" });
  else navigate({ to: "/menu" });
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupRole, setSignupRole] = useState<SignupRole>("cliente");
  const [loginAsFuncionario, setLoginAsFuncionario] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (getToken()) navigate({ to: "/menu" });
  }, [navigate]);

  const handleForgot = async () => {
    const email = forgotEmail.trim();
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Informe um e-mail valido.");
      return;
    }
    setForgotLoading(true);
    try {
      await apiFetch("/auth/esqueci-senha", {
        method: "POST",
        auth: false,
        body: {
          email,
          tipo: loginAsFuncionario ? "funcionario" : "cliente",
        },
      });
      toast.success("Se o e-mail existir, enviaremos um link de recuperacao.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao solicitar recuperacao.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const isFuncionario = FUNCIONARIO_ROLES.includes(signupRole);

    if (isFuncionario) {
      const parsed = signupFuncionarioSchema.safeParse({
        nome: fd.get("fullName"),
        email: fd.get("email"),
        senha: fd.get("password"),
        papel: signupRole,
        codigo: fd.get("codigo"),
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      setLoading(true);
      try {
        await apiFetch(`/auth/funcionario/registro`, {
          method: "POST",
          auth: false,
          body: {
            restaurante_id: RESTAURANTE_ID,
            nome: parsed.data.nome,
            email: parsed.data.email,
            senha: parsed.data.senha,
            senha_confirmation: parsed.data.senha,
            papel: parsed.data.papel,
            codigo_cadastro_funcionario: parsed.data.codigo,
          },
        });
        toast.success("Conta criada! Faca login para continuar.");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Erro ao criar conta.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsed = signupClienteSchema.safeParse({
      nome: fd.get("fullName"),
      email: fd.get("email"),
      senha: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/auth/cliente/registro`, {
        method: "POST",
        auth: false,
        body: {
          restaurante_id: RESTAURANTE_ID,
          nome: parsed.data.nome,
          email: parsed.data.email,
          senha: parsed.data.senha,
          senha_confirmation: parsed.data.senha,
        },
      });
      toast.success("Conta criada! Faca login para continuar.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: fd.get("email"),
      senha: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      if (loginAsFuncionario) {
        const data = await apiFetch<{
          token: string;
          usuario: { id: number; nome: string; email: string; papel: AppRole; restaurante_id: number };
        }>(`/auth/funcionario/login`, {
          method: "POST",
          auth: false,
          body: {
            restaurante_id: RESTAURANTE_ID,
            email: parsed.data.email,
            senha: parsed.data.senha,
          },
        });
        setToken(data.token);
        setStoredUser({
          id: data.usuario.id,
          nome: data.usuario.nome,
          email: data.usuario.email,
          papel: data.usuario.papel,
          restauranteId: data.usuario.restaurante_id,
        });
        redirectByRole(data.usuario.papel, navigate);
      } else {
        const data = await apiFetch<{
          token: string;
          cliente: { id: number; nome: string; email: string; restaurante_id: number };
        }>(`/auth/cliente/login`, {
          method: "POST",
          auth: false,
          body: {
            restaurante_id: RESTAURANTE_ID,
            email: parsed.data.email,
            senha: parsed.data.senha,
          },
        });
        setToken(data.token);
        setStoredUser({
          id: data.cliente.id,
          nome: data.cliente.nome,
          email: data.cliente.email,
          papel: "cliente",
          restauranteId: data.cliente.restaurante_id,
        });
        navigate({ to: "/menu" });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Credenciais invalidas.");
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
          <Tabs defaultValue="login">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Voce e</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Cliente", "Funcionario"] as const).map((label) => {
                      const isFunc = label === "Funcionario";
                      const active = loginAsFuncionario === isFunc;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setLoginAsFuncionario(isFunc)}
                          className={`rounded-md border px-2 py-2 text-sm font-medium transition ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <button
                  type="button"
                  onClick={() => setForgotOpen((v) => !v)}
                  className="block w-full text-center text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
                {forgotOpen && (
                  <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
                    <Label htmlFor="forgot-email" className="text-sm">
                      Enviaremos um link de recuperacao para o{" "}
                      {loginAsFuncionario ? "funcionario" : "cliente"}
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={handleForgot}
                      disabled={forgotLoading}
                      className="w-full"
                      variant="secondary"
                    >
                      {forgotLoading ? "Enviando..." : "Enviar link"}
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIGNUP_ROLE_VALUES.map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setSignupRole(r)}
                        className={`rounded-md border px-2 py-2 text-sm font-medium capitalize transition ${
                          signupRole === r
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        {r === "garcom" ? "Garcom" : r === "cozinha" ? "Cozinha" : "Cliente"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input id="signup-name" name="fullName" type="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                {FUNCIONARIO_ROLES.includes(signupRole) && (
                  <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                    <Label htmlFor="signup-codigo">Codigo de Autenticacao da Empresa</Label>
                    <Input
                      id="signup-codigo"
                      name="codigo"
                      type="text"
                      required
                      placeholder="Peca este codigo ao gerente"
                    />
                    <p className="text-xs text-amber-700">
                      Esse codigo so e conhecido por quem trabalha no restaurante.
                    </p>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}