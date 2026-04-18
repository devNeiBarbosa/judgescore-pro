'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Shield, ArrowLeft, Search, X, Trash2 } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { ROLE_LABELS } from '@/lib/types';

/* ─── Styled ─── */
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
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
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

const SearchRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-bottom: 40px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  border-bottom: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 0.8125rem;
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'}10;
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  white-space: nowrap;
`;

const RolePill = styled.span<{ $role: string }>`
  display: inline-flex;
  padding: 3px 10px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  text-transform: uppercase;
  background: ${({ $role }) => {
    if ($role === 'ADMIN') return 'rgba(255,61,61,0.12)';
    if ($role === 'ARBITRO_CENTRAL') return 'rgba(64,169,255,0.12)';
    if ($role === 'ARBITRO_AUXILIAR') return 'rgba(0,230,118,0.12)';
    return 'rgba(255,215,0,0.1)';
  }};
  color: ${({ $role }) => {
    if ($role === 'ADMIN') return '#FF3D3D';
    if ($role === 'ARBITRO_CENTRAL') return '#40A9FF';
    if ($role === 'ARBITRO_AUXILIAR') return '#00E676';
    return '#FFD700';
  }};
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.lg ?? '12px'};
  padding: 32px;
  width: 100%;
  max-width: 480px;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SelectLabel = styled.label`
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
  font-size: 0.9375rem;
  font-family: inherit;
  &:focus {
    border-color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    outline: none;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ErrorMsg = styled.p`
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  font-size: 0.8125rem;
  margin-bottom: 12px;
`;

const EmptyRow = styled.td`
  padding: 40px 16px;
  text-align: center;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-size: 0.8125rem;
`;

const LoadingText = styled.p`
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  text-align: center;
  padding: 40px 0;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.75rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
    border-color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'}40;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/* ─── Types ─── */
interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
}

export default function UsuariosPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ARBITRO_AUXILIAR' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN')) {
      fetchUsers();
    } else if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, session, router, fetchUsers]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.name || !form.email || (form.role !== 'ATLETA' && !form.password)) {
      setFormError('Preencha os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const endpoint = form.role === 'ATLETA' ? '/api/admin/athletes' : '/api/admin/users';
      const payload = form.role === 'ATLETA'
        ? { name: form.name, email: form.email, role: 'ATLETA' }
        : form;

      const res = await fetch(endpoint, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Erro ao criar usuário');
        setSaving(false);
        return;
      }
      if (form.role === 'ATLETA' && data.temporaryPassword) {
        alert(`Atleta criado com sucesso. Senha temporária: ${data.temporaryPassword}`);
      }
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'ARBITRO_AUXILIAR' });
      fetchUsers();
    } catch {
      setFormError('Erro de rede');
    }
    setSaving(false);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (ROLE_LABELS[u.role] ?? '').toLowerCase().includes(q);
  });


  const handleDelete = async (user: UserItem) => {
    if (!session?.user?.role) return;
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const isAdmin = session.user.role === 'ADMIN';

    if (!isSuperAdmin && !(isAdmin && ['ATLETA', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'].includes(user.role))) {
      alert('Você não tem permissão para excluir este usuário.');
      return;
    }

    const endpoint = user.role === 'ATLETA'
      ? `/api/admin/athletes/${user.id}`
      : ['ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'].includes(user.role)
        ? `/api/admin/referees/${user.id}`
        : `/api/admin/users/${user.id}`;

    if (!window.confirm(`Deseja realmente excluir ${user.name}?`)) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? 'Erro ao excluir usuário');
        return;
      }
      await fetchUsers();
    } catch {
      alert('Erro de rede ao excluir usuário');
    } finally {
      setDeletingId(null);
    }
  };


  const canDeleteUser = (user: UserItem) => {
    const currentRole = session?.user?.role;
    if (!currentRole) return false;
    if (session?.user?.email === user.email) return false;
    if (currentRole === 'SUPER_ADMIN') return true;
    if (currentRole === 'ADMIN') return ['ATLETA', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'].includes(user.role);
    return false;
  };

  if (authStatus === 'loading') {
    return <MainLayout><Container><LoadingText>Carregando...</LoadingText></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <BackLink onClick={() => router.push('/dashboard/admin')}>
          <ArrowLeft size={14} /> Voltar ao Admin
        </BackLink>

        <PageHeader>
          <HeaderLeft>
            <Title><Gold>USUÁRIOS</Gold></Title>
            <SubText>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</SubText>
          </HeaderLeft>
          <Button icon={<UserPlus size={16} />} onClick={() => setShowModal(true)}>Novo Usuário</Button>
        </PageHeader>

        <SearchRow>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <Input placeholder="Buscar por nome, email ou role..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          </div>
        </SearchRow>

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Telefone</Th>
                <Th>Cadastro</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><EmptyRow colSpan={6}>Carregando...</EmptyRow></tr>
              ) : filtered.length === 0 ? (
                <tr><EmptyRow colSpan={6}>Nenhum usuário encontrado</EmptyRow></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <Td style={{ fontWeight: 600 }}>{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td><RolePill $role={u.role}>{ROLE_LABELS[u.role] ?? u.role}</RolePill></Td>
                    <Td>{u.phone ?? '—'}</Td>
                    <Td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</Td>
                    <Td>
                      {canDeleteUser(u) ? (
                        <ActionButton type="button" title={deletingId === u.id ? 'Excluindo...' : 'Excluir usuário'} aria-label={deletingId === u.id ? 'Excluindo...' : 'Excluir usuário'} onClick={() => handleDelete(u)} disabled={deletingId === u.id}>
                          <Trash2 size={14} />
                        </ActionButton>
                      ) : '—'}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrapper>

        {showModal && (
          <ModalOverlay onClick={() => setShowModal(false)}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
              <ModalTitle>NOVO <Gold>USUÁRIO</Gold></ModalTitle>
              {formError && <ErrorMsg>{formError}</ErrorMsg>}
              <FormGroup>
                <Input label="Nome completo" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                {form.role !== 'ATLETA' ? (
                  <Input label="Senha" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                ) : (
                  <SubText>Atletas recebem senha temporária gerada automaticamente.</SubText>
                )}
                <SelectWrapper>
                  <SelectLabel>Role</SelectLabel>
                  <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="ATLETA">Atleta</option>
                    <option value="ARBITRO_AUXILIAR">Árbitro Auxiliar</option>
                    <option value="ARBITRO_CENTRAL">Árbitro Central</option>
                    {session?.user?.role === 'SUPER_ADMIN' && <option value="ADMIN">Administrador</option>}
                  </Select>
                </SelectWrapper>
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button isLoading={saving} onClick={handleCreate}>Criar Usuário</Button>
              </ModalActions>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    </MainLayout>
  );
}
