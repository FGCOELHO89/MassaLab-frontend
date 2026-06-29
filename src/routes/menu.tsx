import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/hooks/use-role";
import { apiFetch, clearToken, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Plus, Minus, UtensilsCrossed, MapPin } from "lucide-react";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Cardápio | MassaLab" },
      { name: "description", content: "Cardápio digital do MassaLab – peça direto da sua mesa." },
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
};

function MenuPage() {
  const { user, role, loading } = useRole();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState<string>("");
  const [tableConfirmed, setTableConfirmed] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [items, setItems] = useState<ApiItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Busca cardápio real do Laravel
  useEffect(() => {
    if (!user) return;
    apiFetch<{ itens: ApiItem[] }>(
      `/restaurante/${user.restauranteId}/cardapio`
    ).then((data) => {
      const allItems = data.itens.filter((i) => i.disponivel);
      // Agrupa por categoria
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
    }).catch(() => {
      toast.error("Erro ao carregar o cardápio.");
    }).finally(() => setLoadingMenu(false));
  }, [user]);

  // Restaura carrinho/mesa ao voltar do resumo
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("massalab.order");
      if (raw) {
        const data = JSON.parse(raw) as { tableNumber?: string; cart?: Record<number, number> };
        if (data.tableNumber) { setTableNumber(data.tableNumber); setTableConfirmed(true); }
        if (data.cart) setCart(data.cart);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (role === "garcom") navigate({ to: "/garcom" });
    else if (role === "cozinha") navigate({ to: "/cozinha" });
  }, [loading, user, role, navigate]);

  const totals = useMemo(() => {
    const cartItems = Object.entries(cart).map(([id, qty]) => {
      const item = items.find((m) => m.id === Number(id));
      if (!item) return null;
      const price = parseFloat(item.preco);
      return { item, qty, subtotal: price * qty };
    }).filter(Boolean) as { item: ApiItem; qty: number; subtotal: number }[];
    const total = cartItems.reduce((s, i) => s + i.subtotal, 0);
    const count = cartItems.reduce((s, i) => s + i.qty, 0);
    return { cartItems, total, count };
  }, [cart, items]);

  const filtered = items.filter((m) => m.categoria?.nome === activeCat);

  const add = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: number) => setCart((c) => {
    const next = { ...c };
    if (!next[id]) return c;
    next[id] -= 1;
    if (next[id] <= 0) delete next[id];
    return next;
  });

  const handleConfirmTable = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(tableNumber, 10);
    if (!n || n < 1 || n > 200) { toast.error("Informe um número de mesa válido (1-200)."); return; }
    setTableConfirmed(true);
  };

  const handlePlaceOrder = () => {
    if (totals.count === 0) { toast.error("Adicione itens ao pedido."); return; }
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
        <form onSubmit={handleConfirmTable} className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <UtensilsCrossed className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-center text-2xl font-bold text-foreground">Bem-vindo ao MassaLab</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Informe o número da sua mesa para começar.</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="table">Número da mesa</Label>
            <Input id="table" type="number" inputMode="numeric" min={1} max={200} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Ex: 12" required />
          </div>
          <Button type="submit" className="mt-6 w-full" style={{ background: "var(--gradient-primary)" }}>Ver cardápio</Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary pb-32">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-xl font-bold text-primary">Massa<span className="text-foreground">Lab</span></Link>
            <Badge variant="secondary" className="ml-3">Mesa {tableNumber}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="mb-4 text-2xl font-bold text-foreground">{activeCat}</h2>
        {loadingMenu ? (
          <p className="text-muted-foreground">Carregando cardápio...</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {filtered.map((item) => (
              <MenuRow key={item.id} item={item} qty={cart[item.id] ?? 0} onAdd={() => add(item.id)} onSub={() => sub(item.id)} />
            ))}
          </ul>
        )}
      </section>

      {totals.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Mesa {tableNumber} · {totals.count} item(ns)</p>
              <p className="text-xl font-bold text-foreground">R$ {totals.total.toFixed(2)}</p>
            </div>
            <Button size="lg" onClick={handlePlaceOrder} className="h-12 px-6" style={{ background: "var(--gradient-primary)" }}>
              Finalizar pedido
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function MenuRow({ item, qty, onAdd, onSub }: { item: ApiItem; qty: number; onAdd: () => void; onSub: () => void }) {
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
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={onSub}><Minus className="h-4 w-4" /></Button>
            <span className="min-w-6 text-center font-semibold text-foreground">{qty}</span>
          </>
        )}
        <Button size="icon" className="h-9 w-9" onClick={onAdd}><Plus className="h-4 w-4" /></Button>
      </div>
    </li>
  );
}