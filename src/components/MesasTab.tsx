import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Mesa = {
  id: number;
  numero: number;
  capacidade: number | null;
  status: string;
  pedido_ativo: { id: number; codigo_fila: number; status: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  livre: "Livre",
  ocupada: "Ocupada",
  reservada: "Reservada",
};

const STATUS_COLOR: Record<string, string> = {
  livre: "bg-green-600",
  ocupada: "bg-amber-500",
  reservada: "bg-blue-500",
};

export function MesasTab({ restauranteId }: { restauranteId: number }) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loadingMesas, setLoadingMesas] = useState(true);
  const [numero, setNumero] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [criando, setCriando] = useState(false);

  const fetchMesas = () => {
    setLoadingMesas(true);
    apiFetch<{ mesas: Mesa[] }>(`/restaurante/${restauranteId}/mesas`)
      .then((data) => setMesas(data.mesas))
      .catch(() => toast.error("Erro ao carregar mesas."))
      .finally(() => setLoadingMesas(false));
  };

  useEffect(() => {
    fetchMesas();
  }, [restauranteId]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(numero, 10);
    if (!n || n < 1) {
      toast.error("Informe um numero de mesa valido.");
      return;
    }
    setCriando(true);
    try {
      await apiFetch(`/restaurante/${restauranteId}/mesas`, {
        method: "POST",
        body: {
          numero: n,
          capacidade: capacidade ? parseInt(capacidade, 10) : undefined,
        },
      });
      toast.success(`Mesa ${n} criada com sucesso!`);
      setNumero("");
      setCapacidade("");
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar mesa.");
    } finally {
      setCriando(false);
    }
  };

  const handleExcluir = async (mesa: Mesa) => {
    if (!window.confirm(`Excluir a mesa ${mesa.numero}?`)) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/mesas/${mesa.id}`, { method: "DELETE" });
      toast.success(`Mesa ${mesa.numero} excluida.`);
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao excluir mesa.");
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-foreground">Gerenciar mesas</h2>

      <form
        onSubmit={handleCriar}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1">
          <Label htmlFor="numero-mesa">Numero da mesa</Label>
          <Input
            id="numero-mesa"
            type="number"
            min={1}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ex: 12"
            className="w-32"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="capacidade-mesa">Capacidade</Label>
          <Input
            id="capacidade-mesa"
            type="number"
            min={1}
            value={capacidade}
            onChange={(e) => setCapacidade(e.target.value)}
            placeholder="Ex: 4"
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={criando}>
          <Plus className="mr-2 h-4 w-4" /> {criando ? "Criando..." : "Adicionar mesa"}
        </Button>
      </form>

      {loadingMesas ? (
        <p className="text-sm text-muted-foreground">Carregando mesas...</p>
      ) : mesas.length === 0 ? (
        <p className="rounded-md bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhuma mesa cadastrada ainda.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mesas.map((mesa) => (
            <li key={mesa.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">Mesa {mesa.numero}</span>
                <Badge className={`${STATUS_COLOR[mesa.status] ?? "bg-muted"} text-white`}>
                  {STATUS_LABEL[mesa.status] ?? mesa.status}
                </Badge>
              </div>
              {mesa.capacidade && (
                <p className="mt-1 text-sm text-muted-foreground">Capacidade: {mesa.capacidade} pessoas</p>
              )}
              {mesa.pedido_ativo && (
                <p className="mt-1 text-xs text-amber-700">
                  Pedido #{mesa.pedido_ativo.codigo_fila} em andamento
                </p>
              )}
              <Button
                size="sm"
                variant="destructive"
                className="mt-3 w-full"
                disabled={!!mesa.pedido_ativo}
                onClick={() => handleExcluir(mesa)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}