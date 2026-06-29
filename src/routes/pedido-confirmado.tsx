import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Home, BellRing } from "lucide-react";

export const Route = createFileRoute("/pedido-confirmado")({
  head: () => ({
    meta: [
      { title: "Pedido confirmado | MassaLab" },
      { name: "description", content: "Seu pedido foi confirmado e já está sendo preparado." },
    ],
  }),
  component: OrderConfirmedPage,
});

type ConfirmedInfo = { tableNumber?: string; eta?: number; orderId?: number; codigoFila?: number };

const STATUS_LABEL: Record<string, string> = {
  aberto: "Recebido",
  em_preparo: "Em preparo",
  pronto: "Pronto para retirar!",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function OrderConfirmedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [info, setInfo] = useState<ConfirmedInfo | null>(null);
  const [status, setStatus] = useState<string>("aberto");
  const [ready, setReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("massalab.confirmed");
      if (raw) setInfo(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Polling a cada 8 segundos para atualizar o status do pedido
  useEffect(() => {
    if (!info?.orderId || !user) return;

    const check = async () => {
      try {
        const data = await apiFetch<{ pedido: { status: string } }>(
          `/restaurante/${user.restauranteId}/pedidos/${info.orderId}`
        );
        const s = data.pedido.status;
        setStatus(s);
        if (s === "pronto" || s === "entregue") {
          setReady(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch { /* ignora erros de rede temporários */ }
    };

    check(); // checa imediatamente ao montar
    intervalRef.current = setInterval(check, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [info?.orderId, user]);

  const eta = info?.eta ?? 30;

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-elegant)]">
        <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${ready ? "bg-amber-100 ring-8 ring-amber-50" : "bg-green-100 ring-8 ring-green-50"}`}>
          {ready
            ? <BellRing className="h-14 w-14 animate-pulse text-amber-600" strokeWidth={2.5} />
            : <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={2.5} />
          }
        </div>

        <Badge className={`mb-4 text-white ${ready ? "bg-amber-600 hover:bg-amber-600" : "bg-green-600 hover:bg-green-600"}`}>
          {ready ? "Pedido pronto!" : "Pedido confirmado"}
        </Badge>

        <h1 className="text-2xl font-bold text-foreground">
          {ready ? "Seu pedido está pronto!" : "Seu pedido já está sendo preparado!"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready
            ? "O garçom já está a caminho com seu pedido."
            : "Nossa cozinha recebeu seu pedido e está cuidando de tudo com carinho."}
        </p>

        {info?.tableNumber && (
          <p className="mt-4 text-sm text-muted-foreground">
            Mesa <span className="font-semibold text-foreground">{info.tableNumber}</span>
          </p>
        )}
        {info?.codigoFila && (
          <p className="mt-1 text-sm text-muted-foreground">
            Pedido <span className="font-semibold text-foreground">#{info.codigoFila}</span>
          </p>
        )}

        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
          Status: <span className="font-semibold text-foreground">{STATUS_LABEL[status] ?? status}</span>
        </p>

        {!ready && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-border bg-secondary p-4">
            <Clock className="h-6 w-6 text-primary" />
            <div className="text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tempo estimado</p>
              <p className="text-xl font-bold text-foreground">{eta - 5} – {eta + 5} minutos</p>
            </div>
          </div>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={() => {
            sessionStorage.removeItem("massalab.confirmed");
            navigate({ to: "/menu" });
          }}
          style={{ background: "var(--gradient-primary)" }}
        >
          <Home className="mr-2 h-4 w-4" /> Voltar ao cardápio
        </Button>
      </div>
    </main>
  );
}