import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";

type MonteMassaItem = {
  id: number;
  nome: string;
  descricao: string | null;
  preco?: string;
};

type MonteMassaIngrediente = {
  id: number;
  nome: string;
  unidade_medida: string | null;
  preco: string;
};

type MonteMassaOptions = {
  massas: MonteMassaItem[];
  molhos: MonteMassaItem[];
  ingredientes: MonteMassaIngrediente[];
  max_ingredientes_inclusos: number;
  preco_base: string;
};

type CalculoResultado = {
  preco_massa: string;
  ingredientes_total: number;
  ingredientes_inclusos: number;
  ingredientes_extras: number;
  custo_extras: number;
  total: number;
};

export type MonteMassaResult = {
  massaId: number;
  massaNome: string;
  molhoId: number | null;
  molhoNome: string | null;
  ingredientes: { ingrediente_id: number; quantidade: number }[];
  ingredientesNomes: string[];
  precoTotal: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  restauranteId: number;
  onConfirm: (result: MonteMassaResult) => void;
};

export function MonteMassaModal({ open, onClose, restauranteId, onConfirm }: Props) {
  const [options, setOptions] = useState<MonteMassaOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [massaId, setMassaId] = useState<number | null>(null);
  const [molhoId, setMolhoId] = useState<number | null>(null);
  // Mapa de ingredienteId -> quantidade (0 = não selecionado)
  const [ingredientesQtd, setIngredientesQtd] = useState<Record<number, number>>({});
  const [calculo, setCalculo] = useState<CalculoResultado | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<MonteMassaOptions>(`/restaurante/${restauranteId}/monte-massa`)
      .then((data) => {
        setOptions(data);
        if (data.massas.length > 0) setMassaId(data.massas[0].id);
        if (data.molhos.length > 0) setMolhoId(data.molhos[0].id);
      })
      .finally(() => setLoading(false));
  }, [open, restauranteId]);

  // Lista de {ingrediente_id, quantidade} - um item por ingrediente, sem repeticao
  const ingredientesSelecionados = useMemo(() => {
    return Object.entries(ingredientesQtd)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ ingrediente_id: Number(id), quantidade: qty }));
  }, [ingredientesQtd]);

  // Total de unidades (soma das quantidades) - usado para contar "X / 8 inclusos"
  const totalUnidades = useMemo(
    () => ingredientesSelecionados.reduce((s, i) => s + i.quantidade, 0),
    [ingredientesSelecionados]
  );

  // Recalcula sempre que a seleção mudar
  useEffect(() => {
    if (!massaId) return;
    setCalculando(true);
    const params = new URLSearchParams();
    params.append("massa_id", String(massaId));
    ingredientesSelecionados.forEach((item, idx) => {
      params.append(`ingredientes[${idx}][ingrediente_id]`, String(item.ingrediente_id));
      params.append(`ingredientes[${idx}][quantidade]`, String(item.quantidade));
    });

    apiFetch<CalculoResultado>(`/restaurante/${restauranteId}/monte-massa/calcular?${params.toString()}`)
      .then(setCalculo)
      .finally(() => setCalculando(false));
  }, [massaId, ingredientesSelecionados, restauranteId]);

  const toggleIngrediente = (id: number) => {
    setIngredientesQtd((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  };

  const addQtd = (id: number) => {
    setIngredientesQtd((prev) => ({ ...prev, [id]: (prev[id] ?? 1) + 1 }));
  };

  const subQtd = (id: number) => {
    setIngredientesQtd((prev) => {
      if ((prev[id] ?? 1) <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: prev[id] - 1 };
    });
  };

  const massaSelecionada = useMemo(
    () => options?.massas.find((m) => m.id === massaId) ?? null,
    [options, massaId]
  );
  const molhoSelecionado = useMemo(
    () => options?.molhos.find((m) => m.id === molhoId) ?? null,
    [options, molhoId]
  );

  const handleConfirm = () => {
    if (!massaSelecionada || !calculo) return;
    const ingredientesNomes = (options?.ingredientes ?? [])
      .filter((i) => ingredientesQtd[i.id])
      .map((i) => `${i.nome}${ingredientesQtd[i.id] > 1 ? ` x${ingredientesQtd[i.id]}` : ""}`);

    onConfirm({
      massaId: massaSelecionada.id,
      massaNome: massaSelecionada.nome,
      molhoId: molhoSelecionado?.id ?? null,
      molhoNome: molhoSelecionado?.nome ?? null,
      ingredientes: ingredientesSelecionados,
      ingredientesNomes,
      precoTotal: calculo.total,
    });

    setIngredientesQtd({});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Monte sua massa</DialogTitle>
        </DialogHeader>

        {loading || !options ? (
          <p className="py-8 text-center text-muted-foreground">Carregando opcoes...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Escolha a massa</Label>
              <div className="space-y-2">
                {options.massas.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMassaId(m.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${massaId === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                    <span>
                      <span className="font-medium">{m.nome}</span>
                      {m.descricao && <span className="block text-xs text-muted-foreground">{m.descricao}</span>}
                    </span>
                    <span className="font-semibold text-primary">R$ {Number(m.preco ?? 0).toFixed(2)}</span>
                  </button>
                ))}
                {options.massas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma massa disponivel.</p>}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Escolha o molho</Label>
              <div className="space-y-2">
                {options.molhos.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMolhoId(m.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${molhoId === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                    <span className="font-medium">{m.nome}</span>
                  </button>
                ))}
                {options.molhos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum molho disponivel.</p>}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Ingredientes</Label>
                <Badge variant="secondary">
                  {totalUnidades} / {options.max_ingredientes_inclusos} inclusos
                </Badge>
              </div>
              <div className="space-y-2">
                {options.ingredientes.map((ing) => {
                  const qty = ingredientesQtd[ing.id] ?? 0;
                  const checked = qty > 0;
                  return (
                    <div key={ing.id}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${checked ? "border-primary bg-primary/10" : "border-border"}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleIngrediente(ing.id)} />
                      <span className="flex-1 font-medium">{ing.nome}</span>
                      <span className="text-xs text-muted-foreground">R$ {Number(ing.preco).toFixed(2)}</span>
                      {checked && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => subQtd(ing.id)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background hover:bg-muted">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-semibold">{qty}</span>
                          <button type="button" onClick={() => addQtd(ing.id)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background hover:bg-muted">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {options.ingredientes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum ingrediente disponivel.</p>}
              </div>
            </div>

            {calculo && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Massa</span>
                  <span>R$ {Number(calculo.preco_massa).toFixed(2)}</span>
                </div>
                {calculo.ingredientes_extras > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>{calculo.ingredientes_extras} ingrediente(s) extra(s)</span>
                    <span>+R$ {Number(calculo.custo_extras).toFixed(2)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
                  <span>Total</span>
                  <span>{calculando ? "..." : `R$ ${Number(calculo.total).toFixed(2)}`}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!massaSelecionada || !calculo || calculando}>
            Adicionar ao carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}