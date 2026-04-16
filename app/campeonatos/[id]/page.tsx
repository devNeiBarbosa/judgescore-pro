import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import ChampionshipPublicView, {
  type PublicChampionship,
} from '@/src/components/championship-public/ChampionshipPublicView';
import ChampionshipItemsPublicList, {
  type PublicChampionshipItem,
} from '@/src/components/championship-public/ChampionshipItemsPublicList';

export const dynamic = 'force-dynamic';

interface ChampionshipResponse {
  championship?: PublicChampionship;
  error?: string;
}

interface ItemsResponse {
  items?: PublicChampionshipItem[];
  error?: string;
}

function resolveBaseUrl(): string {
  const requestHeaders = headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

async function fetchChampionship(baseUrl: string, id: string): Promise<PublicChampionship> {
  const response = await fetch(`${baseUrl}/api/public/championships/${id}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  const payload = (await response.json()) as ChampionshipResponse;

  if (!response.ok || !payload.championship) {
    throw new Error(payload.error || 'Não foi possível carregar o campeonato.');
  }

  return payload.championship;
}

async function fetchChampionshipItems(baseUrl: string, id: string): Promise<PublicChampionshipItem[]> {
  const response = await fetch(`${baseUrl}/api/public/championships/${id}/items`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  const payload = (await response.json()) as ItemsResponse;

  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível carregar os itens do campeonato.');
  }

  return payload.items ?? [];
}

export default async function PublicChampionshipPage({ params }: { params: { id: string } }) {
  const baseUrl = resolveBaseUrl();
  const championship = await fetchChampionship(baseUrl, params.id);
  const items = await fetchChampionshipItems(baseUrl, params.id);

  return (
    <MainLayout>
      <Container>
        <div style={{ padding: '40px 0 56px' }}>
          <ChampionshipPublicView championship={championship} />

          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 14, fontSize: '1.2rem' }}>Itens do campeonato</h2>

            {items.length === 0 ? (
              <p style={{ opacity: 0.85 }}>Nenhum item disponível</p>
            ) : (
              <ChampionshipItemsPublicList
                items={items}
                externalPaymentEnabled={Boolean(championship.externalPaymentEnabled)}
                externalPaymentUrl={championship.externalPaymentUrl ?? null}
                externalPaymentLabel={championship.externalPaymentLabel ?? null}
              />
            )}
          </section>
        </div>
      </Container>
    </MainLayout>
  );
}
