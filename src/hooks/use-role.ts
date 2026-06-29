import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/api";

export type { AppRole };

export function useRole() {
  const { user, loading } = useAuth();
  const role: AppRole | null = user?.papel ?? null;

  return { role, loading, user };
}