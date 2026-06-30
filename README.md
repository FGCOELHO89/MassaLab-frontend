# MassaLab - Frontend (React + Vite)

Interface web do sistema MassaLab: cardapio do cliente com customizacao
("monte sua massa"), paineis de cozinha e garcom, e painel administrativo
do gerente.

## Stack

- React 19 + TypeScript
- TanStack Router (file-based routing) + TanStack Start
- Vite 7
- Tailwind CSS 4 + shadcn/ui (Radix UI)
- Bun (gerenciador de pacotes e runtime)

## Pre-requisitos

- [Bun](https://bun.sh) instalado (`curl -fsSL https://bun.sh/install | bash` no Linux/Mac, ou `powershell -c "irm bun.sh/install.ps1 | iex"` no Windows)
- O backend MassaLab rodando em `http://localhost` (veja o repositorio do backend: https://github.com/FGCOELHO89/primeiro-projeto)

Alternativamente, e possivel usar `npm` ou `yarn` no lugar do Bun, trocando os comandos `bun install` / `bun run dev` por `npm install` / `npm run dev`.

## Instalacao

### 1. Clonar o repositorio

```bash
git clone https://github.com/FGCOELHO89/MassaLab-frontend.git
cd MassaLab-frontend
```

### 2. Instalar dependencias

```bash
bun install
```

### 3. Configurar o ambiente

```bash
cp .env.example .env
```

Por padrao, o `.env.example` ja aponta para `http://localhost/api`, que e onde o backend Laravel/Sail roda. Se o backend estiver em outro endereco, ajuste a variavel `VITE_API_URL`.

### 4. Rodar o backend primeiro

Este frontend depende do backend Laravel estar no ar. Siga as instrucoes do repositorio do backend antes de continuar: https://github.com/FGCOELHO89/primeiro-projeto

### 5. Rodar o frontend

```bash
bun run dev
```

A aplicacao estara disponivel em `http://localhost:8080`.

## Scripts disponiveis

```bash
bun run dev        # ambiente de desenvolvimento
bun run build      # build de producao
bun run preview    # preview do build de producao
bun run lint        # roda o linter
bun run format      # formata o codigo com prettier
```

## Fluxo de uso

| Papel    | Tela inicial         | Como acessar                                      |
|----------|-----------------------|----------------------------------------------------|
| Cliente  | `/` (escolha de mesa) | Acesso direto, sem cadastro                         |
| Garcom   | `/garcom`             | Login de funcionario (precisa de cadastro previo)   |
| Cozinha  | `/cozinha`            | Login de funcionario (precisa de cadastro previo)   |
| Gerente  | `/gerente`            | Login de funcionario (precisa de cadastro previo)   |

Para criar os primeiros usuarios de funcionario (garcom, cozinha, gerente), veja a secao "Criando usuarios de teste" no README do backend.

## Repositorio do backend

A API (Laravel) esta em um repositorio separado: https://github.com/FGCOELHO89/primeiro-projeto