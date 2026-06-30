import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, Save } from "lucide-react";

type EstoqueItem = {
  id: number;
  tipo_origem: "ingrediente" | "item_cardapio";
  tipo?: string;
  categoria?: string;
  nome: string;
  unidade_medida: string;
  estoque_atual: string;
  estoque_minimo: string;
  disponivel: boolean;
  estoque_baixo: boolean;
};

export function EstoqueTab({ restauranteId }: { restauranteId: number }) {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await apiFetch<{ estoque: EstoqueItem[]; total: number; estoque_baixo: number }>(
        `/restaurante/${restauranteId}/estoque`
      );
      setItens(data.estoque);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao carregar estoque.");
    } finally {
      setCarregando(false);
    }
  }, [restauranteId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const iniciarEdicao = (item: EstoqueItem) => {
    setEditando(item.id * (item.tipo_origem === "ingrediente" ? 1 : -1));
    setValorEdicao(String(Number(item.estoque_atual)));
  };

  const salvarEstoque = async (item: EstoqueItem) => {
    setSalvando(true);
    try {
      const path =
        item.tipo_origem === "ingrediente"
          ? `/restaurante/${restauranteId}/estoque/ingrediente/${item.id}`
          : `/restaurante/${restauranteId}/estoque/item/${item.id}`;

      await apiFetch(path, {
        method: "PUT",
        body: {
          estoque_atual: parseFloat(valorEdicao),
          estoque_minimo: Number(item.estoque_minimo),
        },
      });

      toast.success(`Estoque de "${item.nome}" atualizado!`);
      setEditando(null);
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar estoque.");
    } finally {
      setSalvando(false);
    }
  };

  const chaveEdicao = (item: EstoqueItem) => item.id * (item.tipo_origem === "ingrediente" ? 1 : -1);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Controle de estoque</h2>
        <Button size="sm" variant="ghost" onClick={carregar}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => {
            const chave = chaveEdicao(item);
            const editandoEste = editando === chave;
            return (
              <li
                key={chave}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{item.nome}</p>
                    <Badge variant="outline" className="text-xs">
                      {item.tipo_origem === "ingrediente" ? "Ingrediente" : item.categoria ?? "Item"}
                    </Badge>
                    {item.estoque_baixo && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Estoque baixo
                      </Badge>
                    )}
                    {!item.disponivel && (
                      <Badge variant="outline" className="text-xs">
                        indisponivel
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimo: {Number(item.estoque_minimo)} {item.unidade_medida}
                  </p>
                </div>

                {editandoEste ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={valorEdicao}
                      onChange={(e) => setValorEdicao(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">{item.unidade_medida}</span>
                    <Button size="icon" onClick={() => salvarEstoque(item)} disabled={salvando}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => iniciarEdicao(item)}
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    {Number(item.estoque_atual)} {item.unidade_medida}
                  </button>
                )}
              </li>
            );
          })}
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item com estoque cadastrado.</p>
          )}
        </ul>
      )}
    </div>
  );
}