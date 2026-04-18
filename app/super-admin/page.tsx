'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  vertical-align: top;
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

const BillingMessage = styled.div<{ $critical: boolean }>`
  margin-top: 6px;
  font-size: 0.72rem;
  color: ${({ $critical }) => ($critical ? '#FF7272' : '#B0B0B0')};
  line-height: 1.35;
`;

const ImpersonationBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.35);
  background: rgba(255, 215, 0, 0.08);
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  width: min(460px, calc(100vw - 32px));
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222'};
  border-radius: 10px;
  padding: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1rem;
  letter-spacing: 1px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.72rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#777'};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
`;

const TextInput = styled.input`
  width: 100%;
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222'};
  border-radius: 8px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  padding: 10px 12px;
  margin-bottom: 12px;
`;

const ErrorText = styled.p`
  margin: 0 0 12px;
  color: #ff7272;
  font-size: 0.8rem;
`;

type BillingPlanType = 'MONTHLY' | 'RECURRING' | 'ANNUAL' | null;
type BillingStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | null;

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  planType: 'EVENTO' | 'SAAS' | 'LICENCA';
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  billingPlanType: BillingPlanType;
  billingStatus: BillingStatus;
  billingExpiresAt: string | null;
  championshipsUsedInCycle: number;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; championships: number };
}

function getBillingUsageText(plan: BillingPlanType, usedInCycle: number): string {
  if (plan === 'MONTHLY') {
    return `${usedInCycle} de 2 campeonatos`;
  }

  if (plan === 'RECURRING' || plan === 'ANNUAL') {
    return 'Campeonatos: ilimitados';
  }

  return 'Não aplicável';
}

function getBillingMessage(plan: BillingPlanType, status: BillingStatus, usedInCycle: number): string {
  if (status === 'EXPIRED' || status === 'INACTIVE') {
    return 'Plano expirado — você ainda pode acessar resultados, PDFs e auditoria, mas não pode criar novos campeonatos';
  }

  if (status === 'ACTIVE' && plan === 'MONTHLY') {
    return `Plano mensal ativo — ${usedInCycle} de 2 campeonatos usados`;
  }

  if (status === 'ACTIVE' && (plan === 'RECURRING' || plan === 'ANNUAL')) {
    return 'Campeonatos: ilimitados';
  }

  return 'Plano sem configuração de billing definida.';
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeImpersonationOrganizationId, setActiveImpersonationOrganizationId] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [newOrganizationSlug, setNewOrganizationSlug] = useState('');
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [createOrganizationError, setCreateOrganizationError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/organizations', {
        credentials: 'include',
      });
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
        setActiveImpersonationOrganizationId(session.user.actingOrganizationId ?? null);
        fetchOrganizations();
      }
    }
  }, [status, session, router, fetchOrganizations]);

  const activeImpersonationOrganizationName = useMemo(() => {
    if (!activeImpersonationOrganizationId) return null;
    return items.find((item) => item.id === activeImpersonationOrganizationId)?.name ?? 'Organização selecionada';
  }, [activeImpersonationOrganizationId, items]);

  const updateOrganization = async (organizationId: string, payload: Record<string, unknown>) => {
    setSavingId(organizationId);
    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'PATCH',
        credentials: 'include',
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

  const createOrganization = async () => {
    const name = newOrganizationName.trim();
    if (!name) {
      setCreateOrganizationError('Informe o nome da organização.');
      return;
    }

    setCreatingOrganization(true);
    setCreateOrganizationError(null);

    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: newOrganizationSlug.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCreateOrganizationError(data.error ?? 'Erro ao criar organização');
        return;
      }

      setIsCreateModalOpen(false);
      setNewOrganizationName('');
      setNewOrganizationSlug('');
      await fetchOrganizations();
    } finally {
      setCreatingOrganization(false);
    }
  };

  const startImpersonation = async (organizationId: string) => {
    setSavingId(organizationId);
    try {
      const res = await fetch('/api/super-admin/impersonation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Erro ao iniciar impersonação');
        return;
      }
      setActiveImpersonationOrganizationId(organizationId);
      await fetchOrganizations();
    } finally {
      setSavingId(null);
    }
  };

  const stopImpersonation = async () => {
    const currentImpersonationId = activeImpersonationOrganizationId;
    setSavingId(currentImpersonationId);
    try {
      const res = await fetch('/api/super-admin/impersonation', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Erro ao encerrar impersonação');
        return;
      }
      setActiveImpersonationOrganizationId(null);
      await fetchOrganizations();
    } finally {
      setSavingId(null);
    }
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
            <Button variant="ghost" onClick={stopImpersonation} disabled={!activeImpersonationOrganizationId}>
              Sair da impersonação
            </Button>
            <Button variant="secondary" onClick={() => {
              setCreateOrganizationError(null);
              setIsCreateModalOpen(true);
            }}>
              Nova Organização
            </Button>
            <Button onClick={fetchOrganizations}>Atualizar</Button>
          </Controls>
        </Header>

        {activeImpersonationOrganizationId && (
          <ImpersonationBanner>
            <span>Você está operando como: <strong>{activeImpersonationOrganizationName}</strong></span>
            <Button size="sm" variant="ghost" onClick={stopImpersonation} isLoading={savingId === activeImpersonationOrganizationId}>
              Sair da impersonação
            </Button>
          </ImpersonationBanner>
        )}

        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <Th>Organização</Th>
                <Th>Plano</Th>
                <Th>Status</Th>
                <Th>Billing Plano</Th>
                <Th>Billing Status</Th>
                <Th>Validade</Th>
                <Th>Uso no ciclo</Th>
                <Th>Ativa</Th>
                <Th>Criação</Th>
                <Th>Usuários</Th>
                <Th>Campeonatos</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((org) => {
                const billingMessage = getBillingMessage(org.billingPlanType, org.billingStatus, org.championshipsUsedInCycle);
                const criticalBilling = org.billingStatus === 'EXPIRED' || org.billingStatus === 'INACTIVE';
                const isImpersonatingThisOrganization = activeImpersonationOrganizationId === org.id;

                return (
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
                    <Td>{org.billingPlanType ?? 'NÃO DEFINIDO'}</Td>
                    <Td>{org.billingStatus ?? 'NÃO DEFINIDO'}</Td>
                    <Td>{org.billingExpiresAt ? new Date(org.billingExpiresAt).toLocaleDateString('pt-BR') : 'Sem validade'}</Td>
                    <Td>
                      <div>{getBillingUsageText(org.billingPlanType, org.championshipsUsedInCycle)}</div>
                      <BillingMessage $critical={criticalBilling}>{billingMessage}</BillingMessage>
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
                        {isImpersonatingThisOrganization ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            isLoading={savingId === org.id}
                            onClick={stopImpersonation}
                          >
                            Sair
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            isLoading={savingId === org.id}
                            onClick={() => startImpersonation(org.id)}
                          >
                            Entrar
                          </Button>
                        )}
                      </Controls>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {isCreateModalOpen && (
          <Overlay onClick={() => !creatingOrganization && setIsCreateModalOpen(false)}>
            <Modal onClick={(e) => e.stopPropagation()}>
              <ModalTitle>Nova Organização</ModalTitle>

              <Label htmlFor="new-org-name">Nome da organização *</Label>
              <TextInput
                id="new-org-name"
                value={newOrganizationName}
                onChange={(e) => setNewOrganizationName(e.target.value)}
                placeholder="Nome da organização"
                disabled={creatingOrganization}
              />

              <Label htmlFor="new-org-slug">Slug (opcional)</Label>
              <TextInput
                id="new-org-slug"
                value={newOrganizationSlug}
                onChange={(e) => setNewOrganizationSlug(e.target.value)}
                placeholder="slug-opcional"
                disabled={creatingOrganization}
              />

              {createOrganizationError && <ErrorText>{createOrganizationError}</ErrorText>}

              <Controls>
                <Button
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creatingOrganization}
                >
                  Cancelar
                </Button>
                <Button onClick={createOrganization} isLoading={creatingOrganization}>
                  Criar Organização
                </Button>
              </Controls>
            </Modal>
          </Overlay>
        )}
      </Container>
    </MainLayout>
  );
}
