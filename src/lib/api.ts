// Cliente HTTP central para conversar com o backend Laravel.
// Substitui o uso direto do Supabase nas telas.

const API_BASE_URL = "http://localhost/api";

const TOKEN_KEY = "massalab.token";
const USER_KEY = "massalab.user";

export type AppRole = "cliente" | "garcom" | "cozinha" | "gerente" | "admin";

export type AuthUser = {
  id: number;
  nome: string;
  email: string;
  papel: AppRole;
  restauranteId: number;
};

// ---- Armazenamento local do token e do usuário logado ----

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ---- Erro padronizado da API ----

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// ---- Função genérica de chamada à API ----

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // se true, envia o token no header Authorization
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ?? `Erro na requisição (${response.status})`;
    const errors = (data as { errors?: Record<string, string[]> })?.errors;
    throw new ApiError(message, response.status, errors);
  }

  return data as T;
}