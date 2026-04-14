'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Button from '@/src/components/ui/button';

const Header = styled.div`
  padding: 42px 0 24px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  letter-spacing: 2px;
`;

const Gold = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#777'};
  border-bottom: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222'};
`;

const Td = styled.td`
  padding: 12px;
  font-size: 0.84rem;
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222'};
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222'};
  border-radius: 8px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  padding: 8px;
`;

const Badge = styled.span<{ $active: boolean }>`
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.68rem;
  background: ${({ $active }) => ($active ? 'rgba(0,230,118,0.15)' : 'rgba(255,61,61,0.15)')};
  color: ${({ $active }) => ($active ? '#00E676' : '#FF3D3D')};
`;

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  planType: 'EVENTO' | 'SAAS' | 'LICENCA';
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  isActive: boolean;
  createdAt: string;
  _count: { users: number; championships: number };
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/organizations');
      if (res.ok) {
        const data = await res.json();
        setItems(data.organizations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'SUPER_ADMIN') {
        router.replace('/dashboard');
      } else {
        fetchOrganizations();
      }
    }
  }, [status, session, router, fetchOrganizations]);

  const updateOrganization = async (organizationId: string, payload: Record<string, unknown>) => {
    setSavingId(organizationId);
    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Erro ao atualizar organização');
      } else {
        await fetchOrganizations();
      }
    } finally {
      setSavingId(null);
    }
  };

  const startImpersonation = async (organizationId: string) => {
    setSavingId(organizationId);
    try {
      const res = await fetch('/api/super-admin/impersonation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Erro ao iniciar impersonação');
        return;
      }
      router.push('/dashboard/admin');
    } finally {
      setSavingId(null);
    }
  };

  const stopImpersonation = async () => {
    await fetch('/api/super-admin/impersonation', { method: 'DELETE' });
    await fetchOrganizations();
  };

  if (status === 'loading' || loading) {
    return <MainLayout><Container><p style={{ padding: 40 }}>Carregando...</p></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <Header>
          <div>
            <Title>PAINEL <Gold>SUPER ADMIN</Gold></Title>
            <p style={{ color: '#999', marginTop: 6 }}>Gerenciamento global de organizações, planos e acesso por impersonação.</p>
          </div>
          <Controls>
            <Button variant="ghost" onClick={stopImpersonation}>Encerrar Impersonação</Button>
            <Button onClick={fetchOrganizations}>Atualizar</Button>
          </Controls>
        </Header>

        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <Th>Organização</Th>
                <Th>Plano</Th>
                <Th>Status</Th>
                <Th>Ativa</Th>
                <Th>Criação</Th>
                <Th>Usuários</Th>
                <Th>Campeonatos</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((org) => (
                <tr key={org.id}>
                  <Td>
                    <strong>{org.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#777' }}>{org.slug}</div>
                  </Td>
                  <Td>
                    <Select
                      value={org.planType}
                      onChange={(e) => updateOrganization(org.id, { planType: e.target.value })}
                      disabled={savingId === org.id}
                    >
                      <option value="EVENTO">EVENTO</option>
                      <option value="SAAS">SAAS</option>
                      <option value="LICENCA">LICENCA</option>
                    </Select>
                  </Td>
                  <Td>
                    <Select
                      value={org.subscriptionStatus}
                      onChange={(e) => updateOrganization(org.id, { subscriptionStatus: e.target.value })}
                      disabled={savingId === org.id}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="TRIAL">TRIAL</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </Select>
                  </Td>
                  <Td><Badge $active={org.isActive}>{org.isActive ? 'ATIVA' : 'INATIVA'}</Badge></Td>
                  <Td>{new Date(org.createdAt).toLocaleDateString('pt-BR')}</Td>
                  <Td>{org._count.users}</Td>
                  <Td>{org._count.championships}</Td>
                  <Td>
                    <Controls>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={savingId === org.id}
                        onClick={() => updateOrganization(org.id, { isActive: !org.isActive })}
                      >
                        {org.isActive ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        isLoading={savingId === org.id}
                        onClick={() => startImpersonation(org.id)}
                      >
                        Impersonar
                      </Button>
                    </Controls>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Container>
    </MainLayout>
  );
}
