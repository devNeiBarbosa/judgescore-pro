'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Trophy, BarChart3, ChevronRight, MailPlus } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import ExternalPaymentSettings from '@/src/components/ExternalPaymentSettings';

const PageHeader = styled.div`
  padding: 48px 0 32px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 3px;
  margin-bottom: 8px;
`;

const Gold = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const SubText = styled.p`
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.875rem;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 32px 0 48px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const CardInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const IconBox = styled.div`
  width: 52px;
  height: 52px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}10;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}20;
`;

const CardTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const CardDesc = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const Arrow = styled.div`
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  transition: color 0.2s;
`;

const BillingCard = styled(Card)`
  margin-bottom: 24px;
`;

const BillingTitle = styled.h2`
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 14px;
  text-transform: uppercase;
`;

const BillingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const BillingRow = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  margin: 0;

  strong {
    color: ${({ theme }) => theme?.colors?.text ?? '#FFFFFF'};
    margin-right: 6px;
  }
`;

const BillingMessage = styled.p<{ $isCritical?: boolean }>`
  margin: 14px 0 0;
  font-size: 0.8125rem;
  color: ${({ $isCritical }) => ($isCritical ? '#FF7272' : '#BDBDBD')};
`;

type BillingPlanType = 'MONTHLY' | 'RECURRING' | 'ANNUAL' | null;
type BillingStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | null;

interface OrganizationBilling {
  id: string;
  billingPlanType: BillingPlanType;
  billingStatus: BillingStatus;
  billingExpiresAt: string | null;
  championshipsUsedInCycle: number;
}

const modules = [
  { icon: Trophy, title: 'Campeonatos', desc: 'Criar e gerenciar campeonatos, categorias e árbitros', href: '/dashboard/admin/campeonatos' },
  { icon: Users, title: 'Usuários', desc: 'Gerenciar atletas, árbitros e administradores', href: '/dashboard/admin/usuarios' },
  { icon: MailPlus, title: 'Convites', desc: 'Criar e acompanhar convites de acesso por token', href: '/dashboard/admin/convites' },
  { icon: BarChart3, title: 'Dashboard', desc: 'Visão geral com estatísticas do sistema', href: '/dashboard' },
];

function formatBillingPlan(plan: BillingPlanType): string {
  if (plan === 'MONTHLY') return 'MONTHLY';
  if (plan === 'RECURRING') return 'RECURRING';
  if (plan === 'ANNUAL') return 'ANNUAL';
  return 'NÃO DEFINIDO';
}

function formatBillingStatus(status: BillingStatus): string {
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'INACTIVE') return 'INACTIVE';
  if (status === 'EXPIRED') return 'EXPIRED';
  return 'NÃO DEFINIDO';
}

function getBillingUsageText(plan: BillingPlanType, championshipsUsedInCycle: number): string {
  if (plan === 'MONTHLY') {
    return `${championshipsUsedInCycle} de 2 campeonatos`;
  }

  if (plan === 'RECURRING' || plan === 'ANNUAL') {
    return 'Campeonatos: ilimitados';
  }

  return 'Não aplicável';
}

function getBillingMessage(plan: BillingPlanType, status: BillingStatus, championshipsUsedInCycle: number): string {
  if (status === 'EXPIRED' || status === 'INACTIVE') {
    return 'Plano expirado — você ainda pode acessar resultados, PDFs e auditoria, mas não pode criar novos campeonatos';
  }

  if (status === 'ACTIVE' && plan === 'MONTHLY') {
    return `Plano mensal ativo — ${championshipsUsedInCycle} de 2 campeonatos usados`;
  }

  if (status === 'ACTIVE' && (plan === 'RECURRING' || plan === 'ANNUAL')) {
    return 'Campeonatos: ilimitados';
  }

  return 'Plano sem configuração de billing definida.';
}

export default function AdminHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [billing, setBilling] = useState<OrganizationBilling | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      setBilling(data.organizationBilling ?? null);
    } catch {
      setBilling(null);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN')) {
      fetchBilling();
    }
  }, [fetchBilling, session?.user?.role, status]);

  if (status === 'loading') {
    return <MainLayout><Container><PageHeader><Title>CARREGANDO...</Title></PageHeader></Container></MainLayout>;
  }

  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    if (typeof window !== 'undefined') router.replace('/dashboard');
    return null;
  }

  const billingMessage = billing
    ? getBillingMessage(billing.billingPlanType, billing.billingStatus, billing.championshipsUsedInCycle)
    : null;

  const isCriticalBilling = billing?.billingStatus === 'EXPIRED' || billing?.billingStatus === 'INACTIVE';

  return (
    <MainLayout>
      <Container>
        <PageHeader>
          <Title>PAINEL <Gold>ADMIN</Gold></Title>
          <SubText>Gerencie todos os módulos do sistema JUDGESCORE PRO</SubText>
        </PageHeader>

        <BillingCard padding="20px">
          <BillingTitle>Billing da Organização</BillingTitle>
          {billing ? (
            <>
              <BillingGrid>
                <BillingRow><strong>Plano:</strong>{formatBillingPlan(billing.billingPlanType)}</BillingRow>
                <BillingRow><strong>Status:</strong>{formatBillingStatus(billing.billingStatus)}</BillingRow>
                <BillingRow>
                  <strong>Validade:</strong>
                  {billing.billingExpiresAt
                    ? new Date(billing.billingExpiresAt).toLocaleDateString('pt-BR')
                    : 'Sem data de validade'}
                </BillingRow>
                <BillingRow><strong>Uso do ciclo:</strong>{getBillingUsageText(billing.billingPlanType, billing.championshipsUsedInCycle)}</BillingRow>
              </BillingGrid>
              {billingMessage && <BillingMessage $isCritical={isCriticalBilling}>{billingMessage}</BillingMessage>}
            </>
          ) : (
            <BillingMessage>Não foi possível carregar os dados de billing da organização.</BillingMessage>
          )}
        </BillingCard>

        <ExternalPaymentSettings />

        <Grid>
          {modules.map((m) => (
            <Card key={m.href} hoverable padding="20px" onClick={() => router.push(m.href)}>
              <CardInner>
                <CardLeft>
                  <IconBox><m.icon size={24} /></IconBox>
                  <div>
                    <CardTitle>{m.title}</CardTitle>
                    <CardDesc>{m.desc}</CardDesc>
                  </div>
                </CardLeft>
                <Arrow><ChevronRight size={20} /></Arrow>
              </CardInner>
            </Card>
          ))}
        </Grid>
      </Container>
    </MainLayout>
  );
}
