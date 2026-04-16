'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trophy, Users, Award, BarChart3, Calendar, Settings, Dumbbell, Shield, Zap, UserCheck } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import { ROLE_LABELS } from '@/lib/types';

const PageHeader = styled.div`
  padding: 48px 0 24px;
`;

const WelcomeText = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 2px;
`;

const GoldText = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}12;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  text-transform: uppercase;
  margin-bottom: 16px;
  border: 0.5px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}25;
`;

const SubText = styled.p`
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.875rem;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 32px 0;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}10;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 0.5px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}20;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme?.fonts?.mono ?? 'monospace'};
  margin-bottom: 4px;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: 2px;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 40px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ActionCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
`;

const ActionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  background: ${({ theme }) => theme?.colors?.surfaceLight ?? '#161616'};
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  transition: all 0.2s ease;
`;

const ActionText = styled.div`
  h3 {
    font-size: 0.8125rem;
    font-weight: 700;
    margin-bottom: 2px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  p {
    font-size: 0.75rem;
    color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
    font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
  }
`;

const ComingSoonTag = styled.span`
  font-size: 0.5625rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}15;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  margin-left: 8px;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  margin-bottom: 40px;

  h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: 2px;
  }

  p {
    color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
    font-size: 0.8125rem;
    font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
  }
`;

interface DashboardStats {
  championships: number;
  athletes: number;
  categories: number;
  referees: number;
  orders: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [realStats, setRealStats] = useState<DashboardStats | null>(null);

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const isJudge = session?.user?.role === 'ARBITRO_AUXILIAR' || session?.user?.role === 'ARBITRO_CENTRAL';

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRealStats(data.stats);
      }
    } catch { /* ignore */ }
  }, [isAdmin]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, fetchStats]);

  if (status === 'loading') {
    return (
      <MainLayout>
        <Container>
          <PageHeader>
            <WelcomeText>CARREGANDO...</WelcomeText>
          </PageHeader>
        </Container>
      </MainLayout>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  const userName = session?.user?.name ?? 'Usuário';
  const userRole = session?.user?.role ?? 'ATLETA';

  const stats = isAdmin && realStats
    ? [
        { icon: Trophy, value: String(realStats.championships), label: 'Campeonatos' },
        { icon: Users, value: String(realStats.athletes), label: 'Atletas' },
        { icon: Award, value: String(realStats.categories), label: 'Categorias' },
        { icon: UserCheck, value: String(realStats.referees), label: 'Árbitros' },
      ]
    : [
        { icon: Zap, value: '—', label: 'Campeonatos' },
        { icon: Users, value: '—', label: 'Inscrições' },
        { icon: Award, value: '—', label: 'Categorias' },
        { icon: BarChart3, value: '—', label: 'Resultados' },
      ];

  const adminActions = [
    { icon: Trophy, title: 'Campeonatos', desc: 'Criar e gerenciar campeonatos', href: '/dashboard/admin/campeonatos', ready: true },
    { icon: Users, title: 'Usuários', desc: 'Gerenciar atletas e árbitros', href: '/dashboard/admin/usuarios', ready: true },
    { icon: Shield, title: 'Painel Admin', desc: 'Hub administrativo completo', href: '/dashboard/admin', ready: true },
  ];

  const judgeActions = [
    { icon: Trophy, title: 'Campeonatos', desc: 'Ver campeonatos atribuídos', href: '/dashboard/judge', ready: true },
    { icon: Award, title: 'Categorias', desc: 'Julgar por posição (1 a 10)', href: '/dashboard/judge', ready: true },
    { icon: BarChart3, title: 'Resultados', desc: 'Acompanhar finalizações por categoria', href: '/dashboard/judge', ready: true },
  ];

  const athleteActions = [
    { icon: Trophy, title: 'Campeonatos', desc: 'Ver campeonatos disponíveis', href: '/dashboard/athlete', ready: true },
    { icon: Dumbbell, title: 'Minhas Inscrições', desc: 'Gerenciar inscrições', href: '/dashboard/athlete', ready: true },
    { icon: Calendar, title: 'Agenda', desc: 'Calendário de eventos', href: '/dashboard', ready: false },
    { icon: Settings, title: 'Perfil', desc: 'Editar perfil e dados', href: '/dashboard', ready: false },
  ];

  const actions = isAdmin ? adminActions : isJudge ? judgeActions : athleteActions;

  const handleAction = (action: typeof actions[0]) => {
    if (action.ready) {
      router.push(action.href);
    }
  };

  return (
    <MainLayout>
      <Container>
        <PageHeader>
          <WelcomeText>OLÁ, <GoldText>{userName.toUpperCase()}</GoldText></WelcomeText>
          <RoleBadge>
            <Shield size={12} />
            {ROLE_LABELS[userRole] ?? userRole}
          </RoleBadge>
          <SubText>Painel de controle JUDGESCORE PRO</SubText>
        </PageHeader>

        <StatsGrid>
          {stats.map((s, i) => (
            <Card key={i} hoverable>
              <StatIcon>
                {s?.icon && <s.icon size={20} />}
              </StatIcon>
              <StatValue>{s?.value ?? '—'}</StatValue>
              <StatLabel>{s?.label ?? ''}</StatLabel>
            </Card>
          ))}
        </StatsGrid>

        <SectionTitle>AÇÕES <GoldText>RÁPIDAS</GoldText></SectionTitle>
        <ActionsGrid>
          {actions.map((a, i) => (
            <Card key={i} hoverable padding="16px">
              <ActionCardContent onClick={() => handleAction(a)}>
                <ActionIcon>
                  {a?.icon && <a.icon size={18} />}
                </ActionIcon>
                <ActionText>
                  <h3>
                    {a?.title ?? ''}
                    {!a?.ready && <ComingSoonTag>EM BREVE</ComingSoonTag>}
                  </h3>
                  <p>{a?.desc ?? ''}</p>
                </ActionText>
              </ActionCardContent>
            </Card>
          ))}
        </ActionsGrid>

        {!isAdmin && !isJudge && (
          <EmptyState>
            <Zap size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: '#FFD700' }} />
            <h3>NENHUM CAMPEONATO ATIVO</h3>
            <p>Os campeonatos e eventos aparecerão aqui quando forem criados.</p>
          </EmptyState>
        )}
      </Container>
    </MainLayout>
  );
}
