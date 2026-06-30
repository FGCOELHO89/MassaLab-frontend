import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clearToken, ApiError } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LogOut,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EstoqueTab } from "@/components/EstoqueTab";

export const Route = createFileRoute("/gerente")({
  head: () => ({ meta: [{ title: "Painel do gerente | MassaLab" }] }),
  component: ManagerPage,
});

type Categoria = {
  id: number;
  nome: string;
  tipo: string;
  descricao: string | null;
  ativo: boolean;
};

type ItemCardapio = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string;
  disponivel: boolean;
  ativo: boolean;
  imagem_url: string | null;
  categoria: { id: number; nome: string; tipo: string } | null;
};

const TIPOS_CATEGORIA = [
  { value: "prato", label: "Prato" },
  { value: "massa", label: "Massa" },
  { value: "molho", label: "Molho" },
  { value: "ingrediente", label: "Ingrediente" },
  { value: "bebida", label: "Bebida" },
  { value: "outro", label: "Outro" },
];

function ManagerPage() {
  const { role, loading } = useRole();
  const navigate = useNavigate();
  const [restauranteId, setRestauranteId] = useState<number | null>(null);
  const [abaSelecionada, setAbaSelecionada] = useState<"cardapio" | "estoque">("cardapio");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [itens, setItens] = useState<ItemCardapio[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(false);

  // Modal categoria
  const [catModal, setCatModal] = useState(false);
  const [catEditando, setCatEditando] = useState<Categoria | null>(null);
  const [catNome, setCatNome] = useState("");
  const [catTipo, setCatTipo] = useState("prato");
  const [catDescricao, setCatDescricao] = useState("");
  const [salvandoCat, setSalvandoCat] = useState(false);

  // Modal item
  const [itemModal, setItemModal] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemCardapio | null>(null);
  const [itemNome, setItemNome] = useState("");
  const [itemDescricao, setItemDescricao] = useState("");
  const [itemPreco, setItemPreco] = useState("");
  const [itemCategoriaId, setItemCategoriaId] = useState<number | null>(null);
  const [salvandoItem, setSalvandoItem] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!role) {
      navigate({ to: "/auth" });
      return;
    }
    if (role !== "gerente" && role !== "admin") {
      toast.error("Acesso restrito a gerentes.");
      navigate({ to: "/" });
      return;
    }
    const raw = localStorage.getItem("massalab.user");
    if (raw) {
      try {
        const user = JSON.parse(raw) as { restauranteId: number };
        setRestauranteId(user.restauranteId);
      } catch {
        /* ignore */
      }
    }
  }, [role, loading, navigate]);

  const carregarDados = useCallback(async () => {
    if (!restauranteId) return;
    setCarregandoDados(true);
    try {
      const [catData, itensData] = await Promise.all([
        apiFetch<{ categorias: Categoria[] }>(`/restaurante/${restauranteId}/categorias`),
        apiFetch<{ itens: ItemCardapio[] }>(`/restaurante/${restauranteId}/cardapio/todos`),
      ]);
      setCategorias(catData.categorias);
      setItens(itensData.itens);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao carregar cardapio.");
    } finally {
      setCarregandoDados(false);
    }
  }, [restauranteId]);

  useEffect(() => {
    if (restauranteId) carregarDados();
  }, [restauranteId, carregarDados]);

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  // ---------- Categorias ----------
  const abrirNovaCategoria = () => {
    setCatEditando(null);
    setCatNome("");
    setCatTipo("prato");
    setCatDescricao("");
    setCatModal(true);
  };

  const abrirEditarCategoria = (cat: Categoria) => {
    setCatEditando(cat);
    setCatNome(cat.nome);
    setCatTipo(cat.tipo);
    setCatDescricao(cat.descricao ?? "");
    setCatModal(true);
  };

  const salvarCategoria = async () => {
    if (!restauranteId || !catNome.trim()) return;
    setSalvandoCat(true);
    try {
      const payload = { nome: catNome, tipo: catTipo, descricao: catDescricao || null };
      if (catEditando) {
        await apiFetch(`/restaurante/${restauranteId}/categorias/${catEditando.id}`, {
          method: "PUT",
          body: payload,
        });
        toast.success("Categoria atualizada!");
      } else {
        await apiFetch(`/restaurante/${restauranteId}/categorias`, {
          method: "POST",
          body: payload,
        });
        toast.success("Categoria criada!");
      }
      setCatModal(false);
      carregarDados();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar categoria.");
    } finally {
      setSalvandoCat(false);
    }
  };

  const desativarCategoria = async (cat: Categoria) => {
    if (!restauranteId) return;
    if (!window.confirm(`Desativar a categoria "${cat.nome}"?`)) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/categorias/${cat.id}`, { method: "DELETE" });
      toast.success("Categoria desativada.");
      carregarDados();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao desativar categoria.");
    }
  };

  // ---------- Itens ----------
  const abrirNovoItem = () => {
    setItemEditando(null);
    setItemNome("");
    setItemDescricao("");
    setItemPreco("");
    setItemCategoriaId(categorias[0]?.id ?? null);
    setItemModal(true);
  };

  const abrirEditarItem = (item: ItemCardapio) => {
    setItemEditando(item);
    setItemNome(item.nome);
    setItemDescricao(item.descricao ?? "");
    setItemPreco(String(item.preco));
    setItemCategoriaId(item.categoria?.id ?? null);
    setItemModal(true);
  };

  const salvarItem = async () => {
    if (!restauranteId || !itemNome.trim() || !itemCategoriaId || !itemPreco) return;
    setSalvandoItem(true);
    try {
      const payload = {
        categoria_id: itemCategoriaId,
        nome: itemNome,
        descricao: itemDescricao || null,
        preco: parseFloat(itemPreco),
      };
      if (itemEditando) {
        await apiFetch(`/restaurante/${restauranteId}/cardapio/${itemEditando.id}`, {
          method: "PUT",
          body: payload,
        });
        toast.success("Item atualizado!");
      } else {
        await apiFetch(`/restaurante/${restauranteId}/cardapio`, {
          method: "POST",
          body: payload,
        });
        toast.success("Item criado!");
      }
      setItemModal(false);
      carregarDados();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar item.");
    } finally {
      setSalvandoItem(false);
    }
  };

  const toggleDisponibilidade = async (item: ItemCardapio) => {
    if (!restauranteId) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/cardapio/${item.id}/disponibilidade`, {
        method: "PATCH",
      });
      carregarDados();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar disponibilidade.");
    }
  };

  const excluirItem = async (item: ItemCardapio) => {
    if (!restauranteId) return;
    if (!window.confirm(`Remover "${item.nome}" do cardapio?`)) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/cardapio/${item.id}`, { method: "DELETE" });
      toast.success("Item removido.");
      carregarDados();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover item.");
    }
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
            <Badge variant="secondary">Gerente</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={carregarDados}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex gap-2"><button onClick={() => setAbaSelecionada("cardapio")} className={"rounded-md border px-4 py-2 text-sm font-medium transition " + (abaSelecionada === "cardapio" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")}>Cardapio</button><button onClick={() => setAbaSelecionada("estoque")} className={"rounded-md border px-4 py-2 text-sm font-medium transition " + (abaSelecionada === "estoque" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")}>Estoque</button></div>{abaSelecionada === "estoque" && restauranteId && <EstoqueTab restauranteId={restauranteId} />}{abaSelecionada === "cardapio" && (<><h2 className="mb-6 text-2xl font-bold text-foreground">Gerenciar cardapio</h2>

        {/* Categorias */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Categorias</h3>
            <Button size="sm" onClick={abrirNovaCategoria}>
              <Plus className="mr-1 h-4 w-4" /> Nova categoria
            </Button>
          </div>
          {carregandoDados ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categorias.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <p className="font-medium text-foreground">{cat.nome}</p>
                    <p className="text-xs text-muted-foreground">{cat.tipo}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => abrirEditarCategoria(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => desativarCategoria(cat)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
              {categorias.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
              )}
            </ul>
          )}
        </div>

        {/* Itens */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Itens do cardapio</h3>
            <Button size="sm" onClick={abrirNovoItem} disabled={categorias.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> Novo item
            </Button>
          </div>
          {carregandoDados ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="space-y-2">
              {itens.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.nome}</p>
                      {!item.ativo && <Badge variant="destructive">inativo</Badge>}
                      {item.ativo && !item.disponivel && <Badge variant="outline">indisponivel</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.categoria?.nome ?? "Sem categoria"} Â· R$ {Number(item.preco).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleDisponibilidade(item)} title="Ativar/desativar disponibilidade">
                      <Power className={`h-4 w-4 ${item.disponivel ? "text-green-600" : "text-muted-foreground"}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => abrirEditarItem(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => excluirItem(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
              {itens.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
              )}
            </ul>
          )}
        </div>
        </>
        )}
      </section>

      {/* Modal categoria */}
      <Dialog open={catModal} onOpenChange={(v) => !v && setCatModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{catEditando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={catNome} onChange={(e) => setCatNome(e.target.value)} placeholder="Ex: Sobremesas" />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                value={catTipo}
                onChange={(e) => setCatTipo(e.target.value)}
              >
                {TIPOS_CATEGORIA.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Descricao (opcional)</Label>
              <Input value={catDescricao} onChange={(e) => setCatDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModal(false)}>Cancelar</Button>
            <Button onClick={salvarCategoria} disabled={salvandoCat || !catNome.trim()}>
              {salvandoCat ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal item */}
      <Dialog open={itemModal} onOpenChange={(v) => !v && setItemModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{itemEditando ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={itemNome} onChange={(e) => setItemNome(e.target.value)} placeholder="Ex: Espaguete" />
            </div>
            <div>
              <Label>Categoria</Label>
              <select
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                value={itemCategoriaId ?? ""}
                onChange={(e) => setItemCategoriaId(Number(e.target.value))}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Preco (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={itemPreco}
                onChange={(e) => setItemPreco(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Descricao (opcional)</Label>
              <Input value={itemDescricao} onChange={(e) => setItemDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModal(false)}>Cancelar</Button>
            <Button onClick={salvarItem} disabled={salvandoItem || !itemNome.trim() || !itemPreco}>
              {salvandoItem ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
