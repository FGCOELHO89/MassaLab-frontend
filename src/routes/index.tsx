import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-pasta.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MassaLab — Cozinha italiana autoral" },
      { name: "description", content: "Massas frescas, pizzas artesanais e o sabor da Itália. Acesse o cardápio digital do MassaLab." },
      { property: "og:title", content: "MassaLab — Cozinha italiana autoral" },
      { property: "og:description", content: "Massas frescas, pizzas artesanais e o sabor da Itália." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link to="/" className="text-2xl font-bold tracking-tight text-primary-foreground">
          Massa<span className="text-accent">Lab</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Entrar
            </Button>
          </Link>
          <Link to="/menu">
            <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              Ver cardápio
            </Button>
          </Link>
        </nav>
      </header>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <img
          src={heroImg}
          alt="Prato de massa italiana sobre fundo vermelho"
          width={1536}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-primary-foreground">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Trattoria · Desde 1998
          </p>
          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Sabor italiano,<br />feito à mão.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/85">
            Massas frescas, pizzas em forno a lenha e vinhos selecionados.
            Faça seu pedido direto da mesa.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/menu">
              <Button
                size="lg"
                className="h-12 px-8 text-base shadow-[var(--shadow-elegant)]"
                style={{ background: "var(--gradient-primary)" }}
              >
                Acessar cardápio
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-primary-foreground/40 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
