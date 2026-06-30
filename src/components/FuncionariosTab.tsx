import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Ban, CheckCircle2, Trash2 } from "lucide-react";

type Funcionario = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  criado_em: string;
};

const PAPEL_LABEL: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  garcom: "Garçom",
  cozinha: "Cozinha",
};

const PAPEL_COLOR: Record<string, string> = {
  admin: "bg-purple-600",
  gerente: "bg-blue-600",
  garcom: "bg-amber-500",
  cozinha: "bg-green-600",
};

const PAPEIS_DISPONIVEIS = ["garcom", "cozinha", "gerente", "admin"];

export function FuncionariosTab({ restauranteId, currentUserId }: { restauranteId: number; currentUserId: number }) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFuncionarios = () => {
    setLoading(true);
    apiFetch<{ funcionarios: Funcionario[] }>(`/restaurante/${restauranteId}/funcionarios`)
      .then((data) => setFuncionarios(data.funcionarios))
      .catch(() => toast.error("Erro ao carregar funcionarios."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFuncionarios();
  }, [restauranteId]);

  const handleAlterarPapel = async (func: Funcionario, novoPapel: string) => {
    try {
      await apiFetch(`/restaurante/${restauranteId}/funcionarios/${func.id}/papel`, {
        method: "PATCH",
        body: { papel: novoPapel },
      });
      toast.success(`Papel de ${func.nome} atualizado para ${PAPEL_LABEL[novoPapel]}.`);
      fetchFuncionarios();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao alterar papel.");
    }
  };

  const handleAlternarAtivo = async (func: Funcionario) => {
    try {
      await apiFetch(`/restaurante/${restauranteId}/funcionarios/${func.id}/ativo`, { method: "PATCH" });
      toast.success(`${func.nome} foi ${func.ativo ? "desativado" : "ativado"}.`);
      fetchFuncionarios();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao alterar status.");
    }
  };

  const handleExcluir = async (func: Funcionario) => {
    if (!window.confirm(`Excluir definitivamente ${func.nome}? Essa acao nao pode ser desfeita.`)) return;
    try {
      await apiFetch(`/restaurante/${restauranteId}/funcionarios/${func.id}`, { method: "DELETE" });
      toast.success(`${func.nome} foi removido.`);
      fetchFuncionarios();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao excluir funcionario.");
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-foreground">Gerenciar funcionarios</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando funcionarios...</p>
      ) : funcionarios.length === 0 ? (
        <p className="rounded-md bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum funcionario cadastrado.
        </p>
      ) : (
        <ul className="space-y-3">
          {funcionarios.map((func) => {
            const isSelf = func.id === currentUserId;
            return (
              <li key={func.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{func.nome}</span>
                      {isSelf && <Badge variant="outline" className="text-xs">Voce</Badge>}
                      {!func.ativo && (
                        <Badge variant="outline" className="border-destructive text-destructive text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{func.email}</p>
                  </div>
                  <Badge className={`${PAPEL_COLOR[func.papel] ?? "bg-muted"} text-white`}>
                    {PAPEL_LABEL[func.papel] ?? func.papel}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">Mudar papel:</span>
                  {PAPEIS_DISPONIVEIS.map((p) => (
                    <button
                      key={p}
                      disabled={isSelf || p === func.papel}
                      onClick={() => handleAlterarPapel(func, p)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        p === func.papel
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {PAPEL_LABEL[p]}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSelf}
                    className="flex-1"
                    onClick={() => handleAlternarAtivo(func)}
                  >
                    {func.ativo ? (
                      <>
                        <Ban className="mr-1 h-4 w-4" /> Desativar
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSelf}
                    className="flex-1"
                    onClick={() => handleExcluir(func)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}