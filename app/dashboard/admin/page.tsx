'use client';

import React from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Trophy, BarChart3, Shield, ChevronRight, MailPlus } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';

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

const modules = [
  { icon: Trophy, title: 'Campeonatos', desc: 'Criar e gerenciar campeonatos, categorias e árbitros', href: '/dashboard/admin/campeonatos' },
  { icon: Users, title: 'Usuários', desc: 'Gerenciar atletas, árbitros e administradores', href: '/dashboard/admin/usuarios' },
  { icon: MailPlus, title: 'Convites', desc: 'Criar e acompanhar convites de acesso por token', href: '/dashboard/admin/convites' },
  { icon: BarChart3, title: 'Dashboard', desc: 'Visão geral com estatísticas do sistema', href: '/dashboard' },
];

export default function AdminHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <MainLayout><Container><PageHeader><Title>CARREGANDO...</Title></PageHeader></Container></MainLayout>;
  }

  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    if (typeof window !== 'undefined') router.replace('/dashboard');
    return null;
  }

  return (
    <MainLayout>
      <Container>
        <PageHeader>
          <Title>PAINEL <Gold>ADMIN</Gold></Title>
          <SubText>Gerencie todos os módulos do sistema JUDGESCORE PRO</SubText>
        </PageHeader>

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
