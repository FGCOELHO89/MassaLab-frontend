import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, clearToken } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, ChefHat, CheckCircle2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/cozinha")({
  head: () => ({ meta: [{ title: "Cozinha | MassaLab" }] }),
  component: KitchenPage,
});

type KdsItem = {
  id: number;
  nome: string;
  quantidade: number;
  status: string;
  observacoes: string | null;
};

type KdsOrder = {
  id: number;
  codigo_fila: number;
  modalidade: string;
  status: string;
  mesa: string;
  minutos_espera: number;
  alerta_atraso: boolean;
  observacoes: string | null;
  itens: KdsItem[];
};

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "aberto", label: "Novos pedidos", color: "border-amber-500" },
  { key: "em_preparo", label: "Em preparo", color: "border-blue-500" },
];

function KitchenPage() {
  const { role, loading } = useRole();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const restauranteIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    try {
      const data = await apiFetch<{ pedidos: KdsOrder[] }>(`/restaurante/${restauranteId}/kds`);
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
    if (role !== "cozinha") {
      toast.error("Acesso restrito a cozinha.");
      navigate({ to: "/" });
      return;
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (loading || role !== "cozinha") return;
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

  const iniciarPreparo = async (id: number) => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/kds/${id}/iniciar`, { method: "PATCH" });
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar preparo.");
    }
  };

  const finalizarPreparo = async (id: number) => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/kds/${id}/finalizar`, { method: "PATCH" });
      toast.success("Pedido marcado como pronto!");
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar pedido.");
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;

  return (
    <main className="min-h-screen bg-secondary pb-12">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold text-primary">
              Massa<span className="text-foreground">Lab</span>
            </Link>
            <Badge variant="secondary">Cozinha</Badge>
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

      <section className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-4 text-2xl font-bold text-foreground">Painel da cozinha</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className={`rounded-xl border-t-4 ${col.color} bg-card p-4`}>
                <h3 className="mb-3 flex items-center justify-between text-lg font-semibold text-foreground">
                  {col.label}
                  <Badge variant="secondary">{list.length}</Badge>
                </h3>
                {list.length === 0 ? (
                  <p className="rounded-md bg-secondary p-6 text-center text-sm text-muted-foreground">Nada por aqui.</p>
                ) : (
                  <ul className="space-y-3">
                    {list.map((o) => (
                      <li key={o.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary text-primary-foreground">{o.mesa}</Badge>
                          <span className={`text-xs ${o.alerta_atraso ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                            {Math.round(o.minutos_espera)} min
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Pedido #{o.codigo_fila}</p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {o.itens.map((it) => (
                            <li key={it.id} className="text-foreground">
                              <span className="font-semibold">{it.quantidade}x</span> {it.nome}
                              {it.observacoes && (
                                <span className="text-xs text-muted-foreground"> ({it.observacoes})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex gap-2">
                          {o.status === "aberto" && (
                            <Button size="sm" className="w-full" onClick={() => iniciarPreparo(o.id)}>
                              <ChefHat className="mr-1 h-4 w-4" /> Iniciar
                            </Button>
                          )}
                          {o.status === "em_preparo" && (
                            <Button
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => finalizarPreparo(o.id)}
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Marcar pronto
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}