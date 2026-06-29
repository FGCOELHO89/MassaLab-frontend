import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, clearToken, ApiError } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, BellRing, CheckCheck, ChefHat, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/garcom")({
  head: () => ({ meta: [{ title: "Painel do garcom | MassaLab" }] }),
  component: WaiterPage,
});

type OrderItem = {
  id: number;
  nome: string;
  quantidade: number;
  preco: string;
  subtotal: number;
  status: string;
  observacoes: string | null;
};

type Order = {
  id: number;
  codigo_fila: number;
  modalidade: string;
  status: string;
  mesa: { id: number; numero: number } | null;
  observacoes: string | null;
  criado_em: string;
  itens: OrderItem[];
  total: number;
};

const STATUS_COLOR: Record<string, string> = {
  aberto: "bg-amber-500",
  em_preparo: "bg-blue-500",
  pronto: "bg-green-600",
  entregue: "bg-muted-foreground",
  cancelado: "bg-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "recebido",
  em_preparo: "em preparo",
  pronto: "pronto",
  entregue: "entregue",
  cancelado: "cancelado",
};

function WaiterPage() {
  const { role, loading } = useRole();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const restauranteIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    try {
      const data = await apiFetch<{ pedidos: Order[] }>(`/restaurante/${restauranteId}/pedidos`);
      setOrders(data.pedidos);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!role) {
      navigate({ to: "/auth" });
      return;
    }
    if (role !== "garcom") {
      toast.error("Acesso restrito a garcons.");
      navigate({ to: "/" });
      return;
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (loading || role !== "garcom") return;
    const raw = localStorage.getItem("massalab.user");
    if (!raw) return;
    try {
      const user = JSON.parse(raw) as { restauranteId: number };
      restauranteIdRef.current = user.restauranteId;
    } catch {
      return;
    }

    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, role, fetchOrders]);

  const marcarEntregue = async (id: number) => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/pedidos/${id}/status`, {
        method: "PATCH",
        body: { status: "entregue" },
      });
      toast.success("Pedido marcado como entregue!");
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar pedido.");
    }
  };

  const cancelarPedido = async (id: number) => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    if (!window.confirm("Cancelar este pedido?")) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/pedidos/${id}/status`, {
        method: "PATCH",
        body: { status: "cancelado" },
      });
      toast.success("Pedido cancelado.");
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar pedido.");
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  return (
    <main className="min-h-screen bg-secondary pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold text-primary">
              Massa<span className="text-foreground">Lab</span>
            </Link>
            <Badge variant="secondary">Garcom</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchOrders}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-4 text-2xl font-bold text-foreground">Pedidos ativos ({orders.length})</h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            Nenhum pedido ativo no momento.
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">
                      {o.mesa ? `Mesa ${o.mesa.numero}` : "Retirada"}
                    </Badge>
                    <Badge className={`${STATUS_COLOR[o.status] ?? "bg-muted"} text-white`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Pedido #{o.codigo_fila}</span>
                </div>

                <ul className="mt-3 space-y-1 text-sm">
                  {o.itens.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>
                        {it.quantidade}x {it.nome}
                        {it.observacoes && (
                          <span className="text-xs text-muted-foreground"> ({it.observacoes})</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">R$ {it.subtotal.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">R$ {Number(o.total).toFixed(2)}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {o.status === "pronto" && (
                    <Button
                      size="sm"
                      className="col-span-2 bg-green-600 hover:bg-green-700"
                      onClick={() => marcarEntregue(o.id)}
                    >
                      <CheckCheck className="mr-1 h-4 w-4" /> Marcar entregue
                    </Button>
                  )}
                  {(o.status === "aberto" || o.status === "em_preparo") && (
                    <Badge variant="outline" className="col-span-2 justify-center py-2">
                      <ChefHat className="mr-1 h-4 w-4" /> Aguardando a cozinha
                    </Badge>
                  )}
                  {o.status !== "entregue" && o.status !== "cancelado" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="col-span-2"
                      onClick={() => cancelarPedido(o.id)}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}