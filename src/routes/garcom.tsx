import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, clearToken, ApiError } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, CheckCheck, ChefHat, RefreshCw, ArrowLeftRight, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

type Mesa = { id: number; numero: number; status: string };

type ContaItem = {
  nome: string;
  quantidade: number;
  preco: string;
  subtotal: string;
  detalhes: string[];
};

type Conta = {
  pedido_id: number;
  codigo_fila: number;
  mesa: number | null;
  modalidade: string;
  status: string;
  itens: ContaItem[];
  total: string;
  criado_em: string;
  impresso_em: string;
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
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const restauranteIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Troca de mesa
  const [trocaModal, setTrocaModal] = useState(false);
  const [pedidoTroca, setPedidoTroca] = useState<Order | null>(null);
  const [mesaNovaId, setMesaNovaId] = useState<number | null>(null);
  const [trocando, setTrocando] = useState(false);

  // Impressão de conta
  const [contaModal, setContaModal] = useState(false);
  const [conta, setConta] = useState<Conta | null>(null);
  const [carregandoConta, setCarregandoConta] = useState(false);

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

  const fetchMesas = useCallback(async () => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    try {
      const data = await apiFetch<{ mesas: Mesa[] }>(`/restaurante/${restauranteId}/mesas`);
      setMesas(data.mesas);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!role) { navigate({ to: "/auth" }); return; }
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
    } catch { return; }

    fetchOrders();
    fetchMesas();
    intervalRef.current = setInterval(fetchOrders, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading, role, fetchOrders, fetchMesas]);

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

  const abrirTrocaMesa = (order: Order) => {
    setPedidoTroca(order);
    setMesaNovaId(null);
    setTrocaModal(true);
  };

  const confirmarTrocaMesa = async () => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId || !pedidoTroca || !mesaNovaId) return;
    setTrocando(true);
    try {
      const data = await apiFetch<{ message: string; mesa: { numero: number } }>(
        `/restaurante/${restauranteId}/pedidos/${pedidoTroca.id}/trocar-mesa`,
        { method: "PATCH", body: { mesa_id: mesaNovaId } }
      );
      toast.success(`Mesa alterada para Mesa ${data.mesa.numero}!`);
      setTrocaModal(false);
      fetchOrders();
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao trocar mesa.");
    } finally {
      setTrocando(false);
    }
  };

  const abrirConta = async (order: Order) => {
    const restauranteId = restauranteIdRef.current;
    if (!restauranteId) return;
    setCarregandoConta(true);
    setContaModal(true);
    setConta(null);
    try {
      const data = await apiFetch<{ conta: Conta }>(
        `/restaurante/${restauranteId}/pedidos/${order.id}/conta`
      );
      setConta(data.conta);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao carregar conta.");
      setContaModal(false);
    } finally {
      setCarregandoConta(false);
    }
  };

  const imprimirConta = () => {
    window.print();
  };

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  // Mesas livres (exceto a atual do pedido em troca)
  const mesasLivres = mesas.filter(
    (m) => m.status === "livre" && m.id !== pedidoTroca?.mesa?.id
  );

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
        <h2 className="mb-4 text-2xl font-bold text-foreground">
          Pedidos ativos ({orders.length})
        </h2>

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
                    <Button size="sm" className="col-span-2 bg-green-600 hover:bg-green-700"
                      onClick={() => marcarEntregue(o.id)}>
                      <CheckCheck className="mr-1 h-4 w-4" /> Marcar entregue
                    </Button>
                  )}
                  {(o.status === "aberto" || o.status === "em_preparo") && (
                    <Badge variant="outline" className="col-span-2 justify-center py-2">
                      <ChefHat className="mr-1 h-4 w-4" /> Aguardando a cozinha
                    </Badge>
                  )}

                  {/* Troca de mesa — só para pedidos com mesa e não finalizados */}
                  {o.mesa && o.status !== "entregue" && o.status !== "cancelado" && (
                    <Button size="sm" variant="outline" onClick={() => abrirTrocaMesa(o)}>
                      <ArrowLeftRight className="mr-1 h-4 w-4" /> Trocar mesa
                    </Button>
                  )}

                  {/* Imprimir conta */}
                  {o.status !== "cancelado" && (
                    <Button size="sm" variant="outline" onClick={() => abrirConta(o)}>
                      <Printer className="mr-1 h-4 w-4" /> Imprimir conta
                    </Button>
                  )}

                  {o.status !== "entregue" && o.status !== "cancelado" && (
                    <Button size="sm" variant="destructive"
                      className={o.mesa ? "" : "col-span-2"}
                      onClick={() => cancelarPedido(o.id)}>
                      Cancelar pedido
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal troca de mesa */}
      <Dialog open={trocaModal} onOpenChange={(v) => !v && setTrocaModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Trocar mesa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pedido #{pedidoTroca?.codigo_fila} — atualmente na{" "}
            <strong>Mesa {pedidoTroca?.mesa?.numero}</strong>
          </p>
          <div className="mt-4 space-y-2">
            {mesasLivres.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma mesa livre disponivel.</p>
            ) : (
              mesasLivres.map((m) => (
                <button key={m.id} type="button"
                  onClick={() => setMesaNovaId(m.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm transition ${
                    mesaNovaId === m.id
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:bg-muted"
                  }`}>
                  Mesa {m.numero}
                  {mesaNovaId === m.id && <span className="text-primary">✓</span>}
                </button>
              ))
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTrocaModal(false)}>Cancelar</Button>
            <Button onClick={confirmarTrocaMesa} disabled={!mesaNovaId || trocando}>
              {trocando ? "Trocando..." : "Confirmar troca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal conta / impressão */}
      <Dialog open={contaModal} onOpenChange={(v) => !v && setContaModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conta do pedido</DialogTitle>
          </DialogHeader>

          {carregandoConta ? (
            <p className="py-6 text-center text-muted-foreground">Carregando conta...</p>
          ) : conta ? (
            <div id="area-impressao" className="space-y-3 text-sm">
              <div className="text-center font-bold text-lg">MassaLab</div>
              <div className="text-center text-muted-foreground text-xs">
                {conta.mesa ? `Mesa ${conta.mesa}` : "Retirada"} · Pedido #{conta.codigo_fila}
              </div>
              <div className="border-t border-dashed border-border pt-2 space-y-1">
                {conta.itens.map((it, i) => (
                  <div key={i}>
                    <div className="flex justify-between">
                      <span>{it.quantidade}x {it.nome}</span>
                      <span>R$ {it.subtotal}</span>
                    </div>
                    {it.detalhes.length > 0 && (
                      <p className="text-xs text-muted-foreground pl-3">
                        {it.detalhes.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-dashed border-border pt-2 font-bold text-base">
                <span>Total</span>
                <span>R$ {conta.total}</span>
              </div>
              <div className="text-center text-xs text-muted-foreground pt-1">
                Emitido em {conta.impresso_em}
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setContaModal(false)}>Fechar</Button>
            {conta && (
              <Button onClick={imprimirConta}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}