'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, MailPlus } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';

type InvitationRole = 'ATLETA' | 'ARBITRO_AUXILIAR' | 'ARBITRO_CENTRAL' | 'ADMIN';

interface InvitationItem {
  id: string;
  email: string;
  token: string;
  role: InvitationRole;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<InvitationRole, string> = {
  ATLETA: 'Atleta',
  ARBITRO_AUXILIAR: 'Árbitro Auxiliar',
  ARBITRO_CENTRAL: 'Árbitro Central',
  ADMIN: 'Administrador',
};

const PageHeader = styled.div`
  padding: 48px 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderLeft = styled.div``;

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
  margin-top: 4px;
`;

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  margin-bottom: 16px;
  &:hover { color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}; }
`;

const CreateCard = styled(Card)`
  margin-bottom: 24px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 220px auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SelectWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
`;

const ErrorMsg = styled.p`
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  font-size: 0.8125rem;
  margin-top: 10px;
`;

const SuccessMsg = styled.p`
  color: #00e676;
  font-size: 0.8125rem;
  margin-top: 10px;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 10px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  border-bottom: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
`;

const Td = styled.td`
  padding: 12px 10px;
  font-size: 0.8125rem;
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'}20;
`;

const Badge = styled.span<{ $status: 'PENDENTE' | 'USADO' | 'EXPIRADO' }>`
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: ${({ $status }) => {
    if ($status === 'USADO') return 'rgba(64,169,255,0.14)';
    if ($status === 'EXPIRADO') return 'rgba(255,61,61,0.14)';
    return 'rgba(0,230,118,0.14)';
  }};
  color: ${({ $status }) => {
    if ($status === 'USADO') return '#40A9FF';
    if ($status === 'EXPIRADO') return '#FF3D3D';
    return '#00E676';
  }};
`;

const SmallText = styled.span`
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-size: 0.75rem;
`;

function getStatus(invitation: InvitationItem): 'PENDENTE' | 'USADO' | 'EXPIRADO' {
  if (invitation.usedAt) return 'USADO';
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) return 'EXPIRADO';
  return 'PENDENTE';
}

export default function ConvitesAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitationRole>('ATLETA');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invitations', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Erro ao carregar convites');
        return;
      }
      setInvitations(data.invitations ?? []);
    } catch {
      setError('Erro de rede ao carregar convites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN')) {
      fetchInvitations();
      return;
    }

    if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, session, router, fetchInvitations]);

  const sorted = useMemo(
    () => [...invitations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [invitations]
  );

  const handleCreateInvitation = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Informe um email para o convite.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/invitations', {
  credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? 'Erro ao criar convite');
        return;
      }

      setSuccess('Convite criado com sucesso. Link pronto para copiar.');
      setEmail('');
      setRole('ATLETA');
      setInvitations((prev) => [data.invitation, ...prev]);
    } catch {
      setError('Erro de rede ao criar convite');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (token: string) => {
    const link = `${window.location.origin}/signup?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('Link de convite copiado para a área de transferência.');
    } catch {
      setError('Não foi possível copiar automaticamente. Copie manualmente.');
    }
  };

  if (authStatus === 'loading') {
    return <MainLayout><Container><p style={{ padding: '40px 0' }}>Carregando...</p></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <BackLink onClick={() => router.push('/dashboard/admin')}>
          <ArrowLeft size={14} /> Voltar ao Admin
        </BackLink>

        <PageHeader>
          <HeaderLeft>
            <Title><Gold>CONVITES</Gold></Title>
            <SubText>Gerencie convites da sua organização com controle de expiração e uso</SubText>
          </HeaderLeft>
        </PageHeader>

        <CreateCard padding="20px">
          <FormRow>
            <Input
              label="Email do convidado"
              placeholder="atleta@exemplo.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
            <SelectWrap>
              <Label>Perfil</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as InvitationRole)}>
                <option value="ATLETA">Atleta</option>
                <option value="ARBITRO_AUXILIAR">Árbitro Auxiliar</option>
                <option value="ARBITRO_CENTRAL">Árbitro Central</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </SelectWrap>
            <div>
              <Button icon={<MailPlus size={16} />} isLoading={saving} onClick={handleCreateInvitation}>
                Criar convite
              </Button>
            </div>
          </FormRow>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}
        </CreateCard>

        <Card padding="20px">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Perfil</Th>
                  <Th>Status</Th>
                  <Th>Token</Th>
                  <Th>Expira em</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><Td colSpan={6}>Carregando convites...</Td></tr>
                ) : sorted.length === 0 ? (
                  <tr><Td colSpan={6}>Nenhum convite criado.</Td></tr>
                ) : sorted.map((inv) => {
                  const status = getStatus(inv);
                  return (
                    <tr key={inv.id}>
                      <Td>{inv.email}</Td>
                      <Td>{ROLE_LABELS[inv.role] ?? inv.role}</Td>
                      <Td><Badge $status={status}>{status.toLowerCase()}</Badge></Td>
                      <Td>
                        <div>{inv.token}</div>
                        <SmallText>ID: {inv.id}</SmallText>
                      </Td>
                      <Td>{new Date(inv.expiresAt).toLocaleString('pt-BR')}</Td>
                      <Td>
                        <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => handleCopy(inv.token)}>
                          Copiar link
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </Container>
    </MainLayout>
  );
}
