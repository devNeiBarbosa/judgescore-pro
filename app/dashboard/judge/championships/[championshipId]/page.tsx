'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock3, Gavel } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';

const Back = styled.button`
  margin-top: 40px;
  background: none;
  border: none;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`;

const Badge = styled.span<{ $ok: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: ${({ $ok }) => ($ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,215,0,0.12)')};
  color: ${({ $ok }) => ($ok ? '#00E676' : '#FFD700')};
`;

const Small = styled.p`
  margin-top: 6px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

type Category = {
  id: string;
  name: string;
  requiredParticipations: number;
  completedJudgments: number;
  finalized: boolean;
};

export default function JudgeChampionshipCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const championshipId = params?.championshipId as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess = session?.user?.role === 'ARBITRO_AUXILIAR' || session?.user?.role === 'ARBITRO_CENTRAL' || session?.user?.role === 'SUPER_ADMIN';

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/judge/championships/${championshipId}/categories`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setCategories(data.categories ?? []);
      else setCategories([]);
    } catch {
      setCategories([]);
    }
    setLoading(false);
  }, [championshipId]);

  useEffect(() => {
    if (status === 'authenticated' && !canAccess) {
      router.replace('/dashboard');
      return;
    }

    if (status === 'authenticated' && canAccess) {
      loadCategories();
    }
  }, [status, canAccess, router, loadCategories]);

  if (status === 'loading' || loading) {
    return <MainLayout><Container><Small>Carregando categorias...</Small></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <Back onClick={() => router.push('/dashboard/judge')}>
          <ArrowLeft size={14} /> Voltar aos campeonatos
        </Back>

        <h1 style={{ marginBottom: 8, letterSpacing: '2px' }}><Gavel size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} /> CATEGORIAS PARA JULGAMENTO</h1>
        <Small>Escolha a categoria para abrir a tela de avaliação por posição.</Small>

        {categories.length === 0 ? (
          <Card padding="16px" style={{ marginTop: 16 }}>
            <Small>Nenhuma categoria disponível para julgamento.</Small>
          </Card>
        ) : (
          <Grid style={{ marginTop: 16, marginBottom: 40 }}>
            {categories.map((category) => (
              <Card key={category.id} padding="16px">
                <strong>{category.name}</strong>
                <div style={{ marginTop: 8 }}>
                  <Badge $ok={category.finalized}>
                    {category.finalized ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                    {category.finalized ? 'Finalizada' : 'Pendente'}
                  </Badge>
                </div>
                <Small>Avaliações: {category.completedJudgments}/{category.requiredParticipations}</Small>
                <div style={{ marginTop: 12 }}>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/dashboard/judge/championships/${championshipId}/categories/${category.id}`)}
                  >
                    Abrir julgamento
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
