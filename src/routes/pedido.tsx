import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/pedido")({
  head: () => ({
    meta: [
      { title: "Resumo do pedido | MassaLab" },
      { name: "description", content: "Revise e confirme seu pedido no MassaLab." },
    ],
  }),
  component: OrderSummaryPage,
});

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

type ApiItem = { id: number; nome: string; preco: string };
type OrderState = { tableNumber: string; cart: CartLine[] };

function OrderSummaryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderState | null>(null);
  const [apiItems, setApiItems] = useState<ApiItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("massalab.order");
      if (raw) {
        const parsed = JSON.parse(raw) as OrderState;
        setOrder(parsed);
        if (user) {
          apiFetch<{ itens: ApiItem[] }>(`/restaurante/${user.restauranteId}/cardapio`)
            .then((data) => setApiItems(data.itens))
            .catch(() => {});
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, [user]);

  // Monta a lista de linhas com nome e preço resolvidos
  const linhas = (order?.cart ?? []).map((line) => {
    if (line.tipo === "item") {
      const found = apiItems.find((i) => i.id === line.itemId);
      const preco = parseFloat(found?.preco ?? "0");
      return {
        id: line.id,
        nome: found?.nome ?? "Item",
        qty: line.quantidade,
        preco,
        subtotal: preco * line.quantidade,
        detalhe: null as string | null,
      };
    }
    return {
      id: line.id,
      nome: line.massaNome,
      qty: line.quantidade,
      preco: line.precoUnitario,
      subtotal: line.precoUnitario * line.quantidade,
      detalhe: [
        line.molhoNome ? `Molho: ${line.molhoNome}` : null,
        line.ingredientesNomes.length > 0 ? `Ingredientes: ${line.ingredientesNomes.join(", ")}` : null,
      ].filter(Boolean).join(" · "),
    };
  });

  const total = linhas.reduce((s, l) => s + l.subtotal, 0);
  const count = linhas.reduce((s, l) => s + l.qty, 0);

  const handleEdit = () => navigate({ to: "/menu" });

  const handleDelete = () => {
    sessionStorage.removeItem("massalab.order");
    toast.success("Pedido excluido.");
    navigate({ to: "/menu" });
  };

  const handleConfirm = async () => {
    if (!order || count === 0) { toast.error("Pedido vazio."); return; }
    if (!user) { toast.error("Faca login para confirmar o pedido."); return; }

    setSubmitting(true);
    try {
      const mesasData = await apiFetch<{ mesas: { id: number; numero: number }[] }>(
        `/restaurante/${user.restauranteId}/mesas`
      );
      const mesa = mesasData.mesas.find((m) => m.numero === parseInt(order.tableNumber, 10));

      // Monta o array de itens no formato que o Laravel espera
      const itens = order.cart.map((line) => {
        if (line.tipo === "item") {
          return { item_id: line.itemId, quantidade: line.quantidade };
        }
        // monte_massa
        return {
          item_id: line.massaId,
          quantidade: line.quantidade,
          customizacoes: {
            molho_id: line.molhoId ?? undefined,
            ingredientes: line.ingredientes,
          },
        };
      });

      const data = await apiFetch<{ pedido: { id: number; codigo_fila: number } }>(
        `/restaurante/${user.restauranteId}/pedidos`,
        {
          method: "POST",
          body: {
            modalidade: mesa ? "mesa" : "retirada",
            mesa_id: mesa?.id ?? null,
            itens,
          },
        }
      );

      sessionStorage.setItem(
        "massalab.confirmed",
        JSON.stringify({
          tableNumber: order.tableNumber,
          eta: 25 + Math.min(20, count * 2),
          orderId: data.pedido.id,
          codigoFila: data.pedido.codigo_fila,
        })
      );
      sessionStorage.removeItem("massalab.order");
      navigate({ to: "/pedido-confirmado" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  if (!order || count === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-elegant)]">
          <h1 className="text-2xl font-bold text-foreground">Nenhum pedido em aberto</h1>
          <p className="mt-2 text-sm text-muted-foreground">Volte ao cardapio e selecione seus itens.</p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/menu" })} style={{ background: "var(--gradient-primary)" }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Ir para o cardapio
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary pb-32">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-primary">Resumo do <span className="text-foreground">pedido</span></h1>
            <Badge variant="secondary" className="mt-1">Mesa {order.tableNumber}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-6">
        <ul className="space-y-3">
          {linhas.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{l.nome}</h3>
                {l.detalhe && <p className="mt-1 text-xs text-muted-foreground">{l.detalhe}</p>}
                <p className="mt-2 text-sm text-muted-foreground">{l.qty} × R$ {l.preco.toFixed(2)}</p>
              </div>
              <span className="whitespace-nowrap font-bold text-primary">R$ {l.subtotal.toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <span className="text-sm text-muted-foreground">{count} item(ns)</span>
          <span className="text-2xl font-bold text-foreground">R$ {total.toFixed(2)}</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="outline" size="lg" onClick={handleEdit} className="h-12">
            <Pencil className="mr-2 h-4 w-4" /> Editar pedido
          </Button>
          <Button variant="destructive" size="lg" onClick={handleDelete} className="h-12">
            <Trash2 className="mr-2 h-4 w-4" /> Excluir pedido
          </Button>
        </div>

        <div className="mt-8">
          <Button size="lg" onClick={handleConfirm} disabled={submitting} className="h-14 w-full text-base" style={{ background: "var(--gradient-primary)" }}>
            <CheckCircle2 className="mr-2 h-5 w-5" /> {submitting ? "Enviando..." : "Confirmar pedido"}
          </Button>
        </div>
      </section>
    </main>
  );
}