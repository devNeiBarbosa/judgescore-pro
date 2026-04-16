'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, Download, Dumbbell, MapPin, Trophy } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { STATUS_LABELS } from '@/lib/types';

interface AthleteChampionship {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: 'PUBLISHED' | 'ONGOING';
  venue: string | null;
  city: string | null;
  state: string | null;
}

interface AthleteInscription {
  id: string;
  championshipId: string;
  extraCategories: number;
  totalCategoriesAllowed: number;
  status: string;
  painting: boolean;
  photos: boolean;
  createdAt: string;
  championship: {
    id: string;
    name: string;
    date: string;
    status: string;
  };
}

interface InscriptionFormState {
  extraCategories: number;
  painting: boolean;
  photos: boolean;
}

const PageHeader = styled.div`
  padding: 48px 0 24px;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 3px;
`;

const Gold = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const SubText = styled.p`
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.8125rem;
  margin-top: 8px;
  text-transform: none;
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 24px 0 14px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;

  @media (min-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.78rem;
  margin-top: 6px;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: ${({ $status }) => ($status === 'ONGOING' ? 'rgba(64,169,255,0.12)' : 'rgba(0,230,118,0.12)')};
  color: ${({ $status }) => ($status === 'ONGOING' ? '#40A9FF' : '#00E676')};
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`;

const CardActions = styled.div`
  margin-top: 14px;
`;

const FormBlock = styled.div`
  margin-top: 16px;
  border-top: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  padding-top: 14px;
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  margin-top: 10px;
  text-transform: none;
`;

const InfoText = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#707070'};
  margin-top: 8px;
  text-transform: none;
`;

const List = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 48px;
`;

const EmptyState = styled.div`
  border: 0.5px dashed ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  padding: 28px;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#707070'};
  text-align: center;
  margin-bottom: 32px;
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  font-size: 0.8125rem;
  margin-bottom: 10px;
`;

export default function AthleteDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [championships, setChampionships] = useState<AthleteChampionship[]>([]);
  const [inscriptions, setInscriptions] = useState<AthleteInscription[]>([]);
  const [forms, setForms] = useState<Record<string, InscriptionFormState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingChampId, setSubmittingChampId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [championshipsRes, inscriptionsRes] = await Promise.all([
        fetch('/api/athlete/championships', { credentials: 'include' }),
        fetch('/api/athlete/inscriptions', { credentials: 'include' }),
      ]);

      if (!championshipsRes.ok || !inscriptionsRes.ok) {
        setError('Não foi possível carregar os dados do atleta.');
        setLoading(false);
        return;
      }

      const championshipsData = await championshipsRes.json();
      const inscriptionsData = await inscriptionsRes.json();

      const loadedChampionships = championshipsData.championships ?? [];
      const loadedInscriptions = inscriptionsData.inscriptions ?? [];

      setChampionships(loadedChampionships);
      setInscriptions(loadedInscriptions);

      setForms((prev) => {
        const next = { ...prev };
        for (const championship of loadedChampionships) {
          if (!next[championship.id]) {
            next[championship.id] = { extraCategories: 0, painting: false, photos: false };
          }
        }
        return next;
      });
    } catch {
      setError('Erro de rede ao carregar dados.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'ATLETA') {
      router.replace('/dashboard');
      return;
    }

    if (status === 'authenticated' && session?.user?.role === 'ATLETA') {
      fetchData();
    }
  }, [status, session, router, fetchData]);

  const inscriptionByChampionship = useMemo(() => {
    const map = new Map<string, AthleteInscription>();
    for (const inscription of inscriptions) {
      map.set(inscription.championshipId, inscription);
    }
    return map;
  }, [inscriptions]);

  const handleCreateInscription = async (championshipId: string) => {
    const form = forms[championshipId] ?? { extraCategories: 0, painting: false, photos: false };

    setSubmittingChampId(championshipId);
    setError('');

    try {
      const res = await fetch('/api/athlete/inscriptions', {
  credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          championshipId,
          extraCategories: form.extraCategories,
          painting: form.painting,
          photos: form.photos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Não foi possível concluir a inscrição.');
        setSubmittingChampId(null);
        return;
      }

      await fetchData();
    } catch {
      setError('Erro de rede ao criar inscrição.');
    }

    setSubmittingChampId(null);
  };

  const handleDownloadReceipt = (inscriptionId: string) => {
    window.open(`/api/athlete/inscriptions/${inscriptionId}/receipt`, '_blank', 'noopener,noreferrer');
  };

  if (status === 'loading' || loading) {
    return <MainLayout><Container><PageHeader><Title>CARREGANDO...</Title></PageHeader></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <PageHeader>
          <Title>PAINEL DO <Gold>ATLETA</Gold></Title>
          <SubText>Pré-inscrição por campeonato com isolamento por organização</SubText>
        </PageHeader>

        {error && <ErrorText>{error}</ErrorText>}

        <SectionTitle><Gold>CAMPEONATOS DISPONÍVEIS</Gold></SectionTitle>
        {championships.length === 0 ? (
          <EmptyState>Nenhum campeonato ativo (PUBLISHED ou ONGOING) para sua organização.</EmptyState>
        ) : (
          <Grid>
            {championships.map((championship) => {
              const alreadyInscribed = inscriptionByChampionship.has(championship.id);
              const formState = forms[championship.id] ?? { extraCategories: 0, painting: false, photos: false };

              return (
                <Card key={championship.id} padding="18px">
                  <CardTop>
                    <div>
                      <strong>{championship.name}</strong>
                      <Row><Calendar size={13} /> {new Date(championship.date).toLocaleDateString('pt-BR')}</Row>
                      {(championship.venue || championship.city || championship.state) && (
                        <Row><MapPin size={13} /> {[championship.venue, championship.city, championship.state].filter(Boolean).join(' • ')}</Row>
                      )}
                    </div>
                    <StatusBadge $status={championship.status}>{STATUS_LABELS[championship.status] ?? championship.status}</StatusBadge>
                  </CardTop>

                  <FormBlock>
                    {alreadyInscribed ? (
                      <InfoText>
                        <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: 'text-top' }} />
                        Você já possui inscrição neste campeonato.
                      </InfoText>
                    ) : (
                      <>
                        <Input
                          label="Categorias extras"
                          type="number"
                          min={0}
                          max={20}
                          value={formState.extraCategories}
                          onChange={(e) => {
                            const parsed = Number(e.target.value || 0);
                            setForms((prev) => ({
                              ...prev,
                              [championship.id]: {
                                ...formState,
                                extraCategories: Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(20, parsed)),
                              },
                            }));
                          }}
                        />

                        <CheckRow>
                          <input
                            type="checkbox"
                            checked={formState.painting}
                            onChange={(e) => setForms((prev) => ({
                              ...prev,
                              [championship.id]: { ...formState, painting: e.target.checked },
                            }))}
                          />
                          Incluir serviço de pintura
                        </CheckRow>

                        <CheckRow>
                          <input
                            type="checkbox"
                            checked={formState.photos}
                            onChange={(e) => setForms((prev) => ({
                              ...prev,
                              [championship.id]: { ...formState, photos: e.target.checked },
                            }))}
                          />
                          Incluir serviço de fotos
                        </CheckRow>

                        <InfoText>
                          Total de categorias permitidas: <strong>{1 + formState.extraCategories}</strong>
                        </InfoText>

                        <Button
                          style={{ marginTop: 12 }}
                          icon={<Dumbbell size={14} />}
                          isLoading={submittingChampId === championship.id}
                          onClick={() => handleCreateInscription(championship.id)}
                        >
                          Confirmar pré-inscrição
                        </Button>
                      </>
                    )}
                  </FormBlock>
                </Card>
              );
            })}
          </Grid>
        )}

        <SectionTitle><Gold>MINHAS INSCRIÇÕES</Gold></SectionTitle>
        {inscriptions.length === 0 ? (
          <EmptyState>Você ainda não possui inscrições.</EmptyState>
        ) : (
          <List>
            {inscriptions.map((inscription) => (
              <Card key={inscription.id} padding="16px">
                <CardTop>
                  <div>
                    <strong>{inscription.championship.name}</strong>
                    <Row><Calendar size={13} /> {new Date(inscription.championship.date).toLocaleDateString('pt-BR')}</Row>
                    <Row><Trophy size={13} /> Categorias permitidas: {inscription.totalCategoriesAllowed}</Row>
                    <Row>
                      Serviços: {inscription.painting ? 'Pintura' : 'Sem pintura'} • {inscription.photos ? 'Fotos' : 'Sem fotos'}
                    </Row>
                  </div>
                  <StatusBadge $status={inscription.status}>{STATUS_LABELS[inscription.status] ?? inscription.status}</StatusBadge>
                </CardTop>
                <CardActions>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={14} />}
                    onClick={() => handleDownloadReceipt(inscription.id)}
                  >
                    Baixar comprovante
                  </Button>
                </CardActions>
              </Card>
            ))}
          </List>
        )}
      </Container>
    </MainLayout>
  );
}
