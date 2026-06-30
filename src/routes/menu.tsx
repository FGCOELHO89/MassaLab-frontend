import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/hooks/use-role";
import { apiFetch, clearToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Plus, Minus, UtensilsCrossed, ChefHat } from "lucide-react";
import { MonteMassaModal, type MonteMassaResult } from "@/components/MonteMassaModal";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Cardapio | MassaLab" },
      { name: "description", content: "Cardapio digital do MassaLab - peca direto da sua mesa." },
    ],
  }),
  component: MenuPage,
});

type ApiItem = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string;
  categoria: { nome: string } | null;
  disponivel: boolean;
  tipo?: string;
};

type CartLine =
  | { id: string; tipo: "item"; itemId: number; quantidade: number }
  | {
      id: string;
      tipo: "monte_massa";
      massaId: number;
      massaNome: string;
      molhoId: number | null;
      molhoNome: string | null;
      ingredientes: { ingrediente_id: number; quantidade: number }[];
      ingredientesNomes: string[];
      precoUnitario: number;
      quantidade: number;
    };

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function MenuPage() {
  const { user, role, loading } = useRole();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState<string>("");
  const [tableConfirmed, setTableConfirmed] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [monteMassaOpen, setMonteMassaOpen] = useState(false);

  // Busca cardapio real do Laravel
  useEffect(() => {
    if (!user) return;
    apiFetch<{ itens: ApiItem[] }>(`/restaurante/${user.restauranteId}/cardapio`)
      .then((data) => {
        // Itens do tipo monte_massa nao aparecem como cards individuais no
        // cardapio comum - eles sao escolhidos dentro do modal proprio.
        const allItems = data.itens.filter((i) => i.disponivel && i.tipo !== "monte_massa" && i.categoria?.nome !== "Molhos");
        const catMap = new Map<string, ApiItem[]>();
        for (const item of allItems) {
          const cat = item.categoria?.nome ?? "Outros";
          if (!catMap.has(cat)) catMap.set(cat, []);
          catMap.get(cat)!.push(item);
        }
        setItems(allItems);
        const cats = Array.from(catMap.keys());
        setCategories(cats);
        if (cats.length > 0) setActiveCat(cats[0]);
      })
      .catch(() => toast.error("Erro ao carregar o cardapio."))
      .finally(() => setLoadingMenu(false));
  }, [user]);

  // Restaura carrinho/mesa ao voltar do resumo
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("massalab.order");
      if (raw) {
        const data = JSON.parse(raw) as { tableNumber?: string; cart?: CartLine[] };
        if (data.tableNumber) {
          setTableNumber(data.tableNumber);
          setTableConfirmed(true);
        }
        if (data.cart) setCart(data.cart);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (role === "garcom") navigate({ to: "/garcom" });
    else if (role === "cozinha") navigate({ to: "/cozinha" });
  }, [loading, user, role, navigate]);

  const totals = useMemo(() => {
    const linhas = cart.map((line) => {
      if (line.tipo === "item") {
        const item = items.find((m) => m.id === line.itemId);
        if (!item) return null;
        const preco = parseFloat(item.preco);
        return { line, nome: item.nome, preco, subtotal: preco * line.quantidade };
      }
      return {
        line,
        nome: line.massaNome,
        preco: line.precoUnitario,
        subtotal: line.precoUnitario * line.quantidade,
      };
    }).filter(Boolean) as { line: CartLine; nome: string; preco: number; subtotal: number }[];

    const total = linhas.reduce((s, l) => s + l.subtotal, 0);
    const count = linhas.reduce((s, l) => s + l.line.quantidade, 0);
    return { linhas, total, count };
  }, [cart, items]);

  const filtered = items.filter((m) => m.categoria?.nome === activeCat);

  const add = (itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.tipo === "item" && l.itemId === itemId);
      if (existing && existing.tipo === "item") {
        return prev.map((l) => (l.id === existing.id ? { ...l, quantidade: l.quantidade + 1 } : l));
      }
      return [...prev, { id: gerarId(), tipo: "item", itemId, quantidade: 1 }];
    });
  };

  const sub = (itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.tipo === "item" && l.itemId === itemId);
      if (!existing) return prev;
      if (existing.quantidade <= 1) return prev.filter((l) => l.id !== existing.id);
      return prev.map((l) => (l.id === existing.id ? { ...l, quantidade: l.quantidade - 1 } : l));
    });
  };

  const quantidadeDoItem = (itemId: number) => {
    const line = cart.find((l) => l.tipo === "item" && l.itemId === itemId);
    return line?.quantidade ?? 0;
  };

  const handleMonteMassaConfirm = (result: MonteMassaResult) => {
    setCart((prev) => [
      ...prev,
      {
        id: gerarId(),
        tipo: "monte_massa",
        massaId: result.massaId,
        massaNome: result.massaNome,
        molhoId: result.molhoId,
        molhoNome: result.molhoNome,
        ingredientes: result.ingredientes,
        ingredientesNomes: result.ingredientesNomes,
        precoUnitario: result.precoTotal,
        quantidade: 1,
      },
    ]);
    setMonteMassaOpen(false);
    toast.success("Massa montada adicionada ao carrinho!");
  };

  const removerLinha = (id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  };

  const handleConfirmTable = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(tableNumber, 10);
    if (!n || n < 1 || n > 200) {
      toast.error("Informe um numero de mesa valido (1-200).");
      return;
    }
    setTableConfirmed(true);
  };

  const handlePlaceOrder = () => {
    if (totals.count === 0) {
      toast.error("Adicione itens ao pedido.");
      return;
    }
    sessionStorage.setItem("massalab.order", JSON.stringify({ tableNumber, cart }));
    navigate({ to: "/pedido" });
  };

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/auth" });
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  if (!tableConfirmed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <form
          onSubmit={handleConfirmTable}
          className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]"
        >
          <div className="mb-6 flex items-center justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <UtensilsCrossed className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-center text-2xl font-bold text-foreground">Bem-vindo ao MassaLab</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Informe o numero da sua mesa para comecar.
          </p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="table">Numero da mesa</Label>
            <Input
              id="table"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ex: 12"
              required
            />
          </div>
          <Button type="submit" className="mt-6 w-full" style={{ background: "var(--gradient-primary)" }}>
            Ver cardapio
          </Button>
          <Button variant="ghost" className="mt-3 w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary pb-32">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-xl font-bold text-primary">
              Massa<span className="text-foreground">Lab</span>
            </Link>
            <Badge variant="secondary" className="ml-3">Mesa {tableNumber}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
          <button
            onClick={() => setActiveCat("__monte_massa__")}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeCat === "__monte_massa__"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            Monte sua Massa
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCat === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        {activeCat === "__monte_massa__" ? (
          <div>
            <h2 className="mb-4 text-2xl font-bold text-foreground">Monte sua Massa</h2>
            <button
              onClick={() => setMonteMassaOpen(true)}
              className="flex w-full flex-col items-start gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-card p-6 text-left transition hover:border-primary hover:shadow-[var(--shadow-elegant)] md:max-w-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ChefHat className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Crie sua combinacao</h3>
              <p className="text-sm text-muted-foreground">
                Escolha a massa, o molho e os ingredientes que voce quiser.
              </p>
              <span className="mt-2 font-bold text-primary">Toque para montar</span>
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-2xl font-bold text-foreground">{activeCat}</h2>
            {loadingMenu ? (
              <p className="text-muted-foreground">Carregando cardapio...</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {filtered.map((item) => (
                  <MenuRow
                    key={item.id}
                    item={item}
                    qty={quantidadeDoItem(item.id)}
                    onAdd={() => add(item.id)}
                    onSub={() => sub(item.id)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {totals.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <ul className="mb-2 max-h-32 space-y-1 overflow-y-auto text-sm">
              {totals.linhas.map(({ line, nome, subtotal }) => (
                <li key={line.id} className="flex items-center justify-between gap-2 text-foreground">
                  <span className="truncate">
                    {line.quantidade}x {nome}
                    {line.tipo === "monte_massa" && (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        ({line.molhoNome ?? "sem molho"})
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    R$ {subtotal.toFixed(2)}
                    <button
                      onClick={() => removerLinha(line.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      remover
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Mesa {tableNumber} - {totals.count} item(ns)</p>
                <p className="text-xl font-bold text-foreground">R$ {totals.total.toFixed(2)}</p>
              </div>
              <Button
                size="lg"
                onClick={handlePlaceOrder}
                className="h-12 px-6"
                style={{ background: "var(--gradient-primary)" }}
              >
                Finalizar pedido
              </Button>
            </div>
          </div>
        </div>
      )}

      {user && (
        <MonteMassaModal
          open={monteMassaOpen}
          onClose={() => setMonteMassaOpen(false)}
          restauranteId={user.restauranteId}
          onConfirm={handleMonteMassaConfirm}
        />
      )}
    </main>
  );
}

function MenuRow({
  item,
  qty,
  onAdd,
  onSub,
}: {
  item: ApiItem;
  qty: number;
  onAdd: () => void;
  onSub: () => void;
}) {
  const price = parseFloat(item.preco);
  return (
    <li className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground">{item.nome}</h3>
          <span className="whitespace-nowrap font-bold text-primary">R$ {price.toFixed(2)}</span>
        </div>
        {item.descricao && <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        {qty > 0 && (
          <>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={onSub}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-6 text-center font-semibold text-foreground">{qty}</span>
          </>
        )}
        <Button size="icon" className="h-9 w-9" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}