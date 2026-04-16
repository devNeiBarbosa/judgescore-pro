'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Gavel, Trophy } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import { STATUS_LABELS } from '@/lib/types';

const PageHeader = styled.div`
  padding: 44px 0 20px;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  letter-spacing: 2px;
  margin-bottom: 8px;
`;

const Sub = styled.p`
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#A0A0A0'};
  font-size: 0.85rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 40px;
`;

const Meta = styled.p`
  margin-top: 6px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

type JudgeChampionship = {
  id: string;
  name: string;
  date: string;
  status: string;
};

export default function JudgeDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [championships, setChampionships] = useState<JudgeChampionship[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess = session?.user?.role === 'ARBITRO_AUXILIAR' || session?.user?.role === 'ARBITRO_CENTRAL' || session?.user?.role === 'SUPER_ADMIN';

  const fetchChampionships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/judge/championships', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setChampionships(data.championships ?? []);
      } else {
        setChampionships([]);
      }
    } catch {
      setChampionships([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && !canAccess) {
      router.replace('/dashboard');
      return;
    }

    if (status === 'authenticated' && canAccess) {
      fetchChampionships();
    }
  }, [status, canAccess, router, fetchChampionships]);

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <Container>
          <PageHeader>
            <Sub>Carregando painel do árbitro...</Sub>
          </PageHeader>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container>
        <PageHeader>
          <Title><Gavel size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> PAINEL DE JULGAMENTO</Title>
          <Sub>Selecione um campeonato para julgar as categorias atribuídas.</Sub>
        </PageHeader>

        {championships.length === 0 ? (
          <Card padding="16px">
            <Sub>Nenhum campeonato disponível para julgamento.</Sub>
          </Card>
        ) : (
          <Grid>
            {championships.map((championship) => (
              <Card key={championship.id} padding="16px">
                <strong><Trophy size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {championship.name}</strong>
                <Meta>Status: {STATUS_LABELS[championship.status] ?? championship.status}</Meta>
                <Meta>Data: {new Date(championship.date).toLocaleDateString('pt-BR')}</Meta>
                <div style={{ marginTop: 12 }}>
                  <Button
                    size="sm"
                    icon={<ArrowRight size={14} />}
                    onClick={() => router.push(`/dashboard/judge/championships/${championship.id}`)}
                  >
                    Ver categorias
                  </Button>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </Container>
    </MainLayout>
  );
}
