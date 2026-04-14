'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trophy, Plus, ArrowLeft, Calendar, MapPin, Users as UsersIcon, Tag } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { STATUS_LABELS } from '@/lib/types';

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 48px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ChampName = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 1px;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 3px 10px;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  text-transform: uppercase;
  background: ${({ $status }) => {
    if ($status === 'PUBLISHED') return 'rgba(0,230,118,0.12)';
    if ($status === 'ONGOING') return 'rgba(64,169,255,0.12)';
    if ($status === 'FINISHED') return 'rgba(160,160,160,0.12)';
    return 'rgba(255,215,0,0.1)';
  }};
  color: ${({ $status }) => {
    if ($status === 'PUBLISHED') return '#00E676';
    if ($status === 'ONGOING') return '#40A9FF';
    if ($status === 'FINISHED') return '#A0A0A0';
    return '#FFD700';
  }};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  margin-top: 6px;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;

  svg { flex-shrink: 0; }
`;

const CountRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
`;

const CountItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6875rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  svg { color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}; }
`;

/* ── Modal ── */
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
  max-width: 520px;
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  margin-bottom: 48px;
  h3 {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 8px;
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

const LoadingText = styled.p`
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  text-align: center;
  padding: 40px 0;
`;

/* ─── Types ─── */
interface ChampItem {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  _count: { categories: number; participations: number; orders: number };
}

export default function CampeonatosPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [champs, setChamps] = useState<ChampItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', venue: '', city: '', state: '', description: '' });

  const fetchChamps = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/championships');
      if (res.ok) {
        const data = await res.json();
        setChamps(data.championships ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN')) {
      fetchChamps();
    } else if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, session, router, fetchChamps]);

  const handleCreate = async () => {
    setFormError('');
    if (!form.name || !form.date) {
      setFormError('Nome e data são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/championships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Erro ao criar campeonato');
        setSaving(false);
        return;
      }
      setShowModal(false);
      setForm({ name: '', date: '', venue: '', city: '', state: '', description: '' });
      fetchChamps();
    } catch {
      setFormError('Erro de rede');
    }
    setSaving(false);
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
            <Title><Gold>CAMPEONATOS</Gold></Title>
            <SubText>{champs.length} campeonato{champs.length !== 1 ? 's' : ''}</SubText>
          </HeaderLeft>
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Novo Campeonato</Button>
        </PageHeader>

        {loading ? (
          <LoadingText>Carregando campeonatos...</LoadingText>
        ) : champs.length === 0 ? (
          <EmptyState>
            <Trophy size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: '#FFD700' }} />
            <h3>NENHUM CAMPEONATO</h3>
            <p>Crie seu primeiro campeonato para começar.</p>
          </EmptyState>
        ) : (
          <Grid>
            {champs.map((c) => (
              <Card key={c.id} hoverable padding="20px" onClick={() => router.push(`/dashboard/admin/championships/${c.id}`)}>
                <CardHeader>
                  <ChampName>{c.name}</ChampName>
                  <StatusBadge $status={c.status}>{STATUS_LABELS[c.status] ?? c.status}</StatusBadge>
                </CardHeader>
                <MetaRow><Calendar size={13} /> {new Date(c.date).toLocaleDateString('pt-BR')}</MetaRow>
                {(c.city || c.state) && (
                  <MetaRow><MapPin size={13} /> {[c.city, c.state].filter(Boolean).join(', ')}</MetaRow>
                )}
                <CountRow>
                  <CountItem><Tag size={13} /> {c._count.categories} categoria{c._count.categories !== 1 ? 's' : ''}</CountItem>
                  <CountItem><UsersIcon size={13} /> {c._count.participations} atleta{c._count.participations !== 1 ? 's' : ''}</CountItem>
                </CountRow>
              </Card>
            ))}
          </Grid>
        )}

        {showModal && (
          <ModalOverlay onClick={() => setShowModal(false)}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
              <ModalTitle>NOVO <Gold>CAMPEONATO</Gold></ModalTitle>
              {formError && <ErrorMsg>{formError}</ErrorMsg>}
              <FormGroup>
                <Input label="Nome do campeonato" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                <Input label="Local / Venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
                <FormRow>
                  <Input label="Cidade" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  <Input label="Estado" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                </FormRow>
                <Input label="Descrição" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button isLoading={saving} onClick={handleCreate}>Criar</Button>
              </ModalActions>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    </MainLayout>
  );
}
