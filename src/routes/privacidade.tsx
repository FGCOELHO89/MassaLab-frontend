import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | MassaLab" },
      { name: "description", content: "Política de privacidade e tratamento de dados do MassaLab." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-secondary px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/auth" className="mb-6 inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>

        <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
          <p className="mt-1 text-sm text-muted-foreground">Última atualização: junho de 2026</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground">
            <section>
              <h2 className="mb-2 text-lg font-semibold">1. Quem somos</h2>
              <p>
                O MassaLab é um sistema de pedidos para restaurantes. Esta política explica como
                coletamos, usamos e protegemos os dados pessoais de clientes e funcionários que
                utilizam nossa plataforma.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">2. Quais dados coletamos</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Nome completo</li>
                <li>E-mail</li>
                <li>Telefone (quando informado)</li>
                <li>Senha (armazenada de forma criptografada, nunca em texto puro)</li>
                <li>Histórico de pedidos realizados no restaurante</li>
                <li>Data e hora de criação da conta</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">3. Para que usamos seus dados</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Identificar você ao fazer login e processar seus pedidos</li>
                <li>Manter o histórico de pedidos para acompanhamento e suporte</li>
                <li>Comunicar atualizações sobre o status do seu pedido</li>
                <li>Garantir a segurança da sua conta</li>
              </ul>
              <p className="mt-2">
                Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins
                de marketing.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">4. Seus direitos (LGPD)</h2>
              <p>De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Confirmar a existência de tratamento dos seus dados</li>
                <li>Acessar os dados que temos sobre você</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a exclusão dos seus dados pessoais</li>
                <li>Revogar o consentimento a qualquer momento</li>
              </ul>
              <p className="mt-2">
                Para exercer qualquer um desses direitos, entre em contato diretamente com o
                restaurante onde você possui cadastro.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">5. Segurança dos dados</h2>
              <p>
                Suas senhas são armazenadas com criptografia (hash bcrypt) e nunca são visíveis,
                nem mesmo para a equipe do restaurante. O acesso aos dados é restrito a funcionários
                autorizados, conforme o papel de cada um no sistema.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">6. Retenção de dados</h2>
              <p>
                Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para
                cumprir obrigações legais. Você pode solicitar a exclusão da sua conta a qualquer
                momento junto ao restaurante.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">7. Alterações nesta política</h2>
              <p>
                Esta política pode ser atualizada periodicamente. Recomendamos revisitar esta página
                de tempos em tempos para se manter informado sobre como protegemos seus dados.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}