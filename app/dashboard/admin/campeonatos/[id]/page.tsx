'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Tag, UserCheck, Trash2, Save, Calendar, MapPin, Info, ClipboardList, Scale, Download, RotateCcw, Trophy, Package } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import ChampionshipItemsList from '@/src/components/championship-items/ChampionshipItemsList';
import { STATUS_LABELS, ROLE_LABELS } from '@/lib/types';

/* ─── Styled ─── */
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
  margin-top: 48px;
  margin-bottom: 16px;
  &:hover { color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}; }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 3px;
  margin-bottom: 8px;
`;

const Gold = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const MetaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 32px;
`;

const MetaPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  padding: 6px 14px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 4px 12px;
  font-size: 0.625rem;
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

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ItemsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 40px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ItemCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
`;

const ItemName = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
`;

const ItemSub = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const CategoryMeta = styled.div`
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const CategoryStatusPill = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  letter-spacing: 0.4px;
  font-weight: 700;
  background: ${({ $status }) => {
    if ($status === 'RESULT_FINALIZED') return 'rgba(0,230,118,0.14)';
    if ($status === 'ALL_JUDGES_FINALIZED') return 'rgba(64,169,255,0.14)';
    if ($status === 'REOPENED') return 'rgba(255,177,66,0.14)';
    return 'rgba(160,160,160,0.14)';
  }};
  color: ${({ $status }) => {
    if ($status === 'RESULT_FINALIZED') return '#00E676';
    if ($status === 'ALL_JUDGES_FINALIZED') return '#40A9FF';
    if ($status === 'REOPENED') return '#FFB142';
    return '#A0A0A0';
  }};
`;

const CategoryActions = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const InlineAlert = styled.p<{ $error?: boolean }>`
  margin-top: 8px;
  font-size: 0.74rem;
  color: ${({ $error }) => ($error ? '#ff6b6b' : '#00E676')};
`;
const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  &:hover { opacity: 1; }
`;

const RolePill = styled.span<{ $role: string }>`
  display: inline-flex;
  padding: 2px 8px;
  font-size: 0.5625rem;
  font-weight: 700;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  text-transform: uppercase;
  margin-left: 8px;
  background: ${({ $role }) => ($role === 'ARBITRO_CENTRAL' ? 'rgba(64,169,255,0.12)' : 'rgba(0,230,118,0.12)')};
  color: ${({ $role }) => ($role === 'ARBITRO_CENTRAL' ? '#40A9FF' : '#00E676')};
`;

/* Modal */
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

const EmptyItem = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-size: 0.8125rem;
  border: 0.5px dashed ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  grid-column: 1 / -1;
`;

const LoadingText = styled.p`
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  text-align: center;
  padding: 40px 0;
`;

const StatusSelectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
`;

/* ─── Types ─── */
interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  status: 'OPEN_FOR_JUDGING' | 'ALL_JUDGES_FINALIZED' | 'RESULT_FINALIZED' | 'REOPENED';
  categoryResults?: Array<{ id: string; generatedAt: string }>;
  _count?: { categoryRegistrations: number };
}
interface RefereeAssign { id: string; referee: { id: string; name: string; email: string; role: string }; }
interface ChampDetail {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  categories: CategoryItem[];
  referees: RefereeAssign[];
  _count: { participations: number; orders: number };
}
interface AvailableReferee { id: string; name: string; email: string; role: string; }
interface InscriptionItem {
  id: string;
  status: string;
  extraCategories: number;
  totalCategoriesAllowed: number;
  painting: boolean;
  photos: boolean;
  athleteNumber: string | null;
  checkedInAt: string | null;
  createdAt: string;
  athlete: {
    id: string;
    name: string;
    email: string;
  };
  participations: Array<{
    id: string;
    category: { id: string; name: string } | null;
  }>;
}

const CATEGORY_STATUS_LABELS: Record<CategoryItem['status'], string> = {
  OPEN_FOR_JUDGING: 'ABERTA PARA JULGAMENTO',
  ALL_JUDGES_FINALIZED: 'TODOS ÁRBITROS FINALIZARAM',
  RESULT_FINALIZED: 'RESULTADO OFICIAL FINALIZADO',
  REOPENED: 'REABERTA',
};
export default function ChampDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const champId = params?.id as string;

  const [champ, setChamp] = useState<ChampDetail | null>(null);
  const [inscriptions, setInscriptions] = useState<InscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // Referee modal
  const [showRefModal, setShowRefModal] = useState(false);
  const [availableRefs, setAvailableRefs] = useState<AvailableReferee[]>([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [refError, setRefError] = useState('');
  const [refSaving, setRefSaving] = useState(false);

  // Status update
  const [statusVal, setStatusVal] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const isAdminOrSuperAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const canGenerateOfficialResult = session?.user?.role === 'ARBITRO_CENTRAL';
  const canReopenCategory = session?.user?.role === 'ARBITRO_CENTRAL' || session?.user?.role === 'ADMIN';

  const [categoryActionMessage, setCategoryActionMessage] = useState('');
  const [categoryActionError, setCategoryActionError] = useState('');
  const [categoryActionLoadingId, setCategoryActionLoadingId] = useState('');
  const fetchChamp = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/championships/${champId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setChamp(data.championship);
        setStatusVal(data.championship.status);
        fetchReferees(data.championship.organizationId);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [champId]);

  const fetchReferees = useCallback(async (organizationId?: string) => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const refs = (data.users ?? []).filter((u: AvailableReferee & { organizationId?: string }) => {
          const isRef = u.role === 'ARBITRO_AUXILIAR' || u.role === 'ARBITRO_CENTRAL';
          if (!isRef) return false;
          if (!organizationId) return true;
          return u.organizationId === organizationId;
        });
        setAvailableRefs(refs);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchInscriptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/championships/${champId}/inscriptions`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInscriptions(data.inscriptions ?? []);
      }
    } catch {
      setInscriptions([]);
    }
  }, [champId]);

  useEffect(() => {
    const canAccessPage = isAdminOrSuperAdmin || session?.user?.role === 'ARBITRO_CENTRAL';

    if (authStatus === 'authenticated' && canAccessPage) {
      fetchChamp();
      fetchInscriptions();
    } else if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, session?.user?.role, isAdminOrSuperAdmin, router, fetchChamp, fetchReferees, fetchInscriptions]);

  const handleAddCategory = async () => {
    setCatError('');
    if (!catForm.name) { setCatError('Nome é obrigatório'); return; }
    setCatSaving(true);
    try {
      const res = await fetch(`/api/admin/championships/${champId}/categories`, {
  credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error ?? 'Erro'); setCatSaving(false); return; }
      setShowCatModal(false);
      setCatForm({ name: '', description: '' });
      fetchChamp();
    } catch { setCatError('Erro de rede'); }
    setCatSaving(false);
  };

  const handleAssignRef = async () => {
    setRefError('');
    if (!selectedRef) { setRefError('Selecione um árbitro'); return; }
    setRefSaving(true);
    try {
      const res = await fetch(`/api/admin/championships/${champId}/referees`, {
  credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refereeId: selectedRef }),
      });
      const data = await res.json();
      if (!res.ok) { setRefError(data.error ?? 'Erro'); setRefSaving(false); return; }
      setShowRefModal(false);
      setSelectedRef('');
      fetchChamp();
    } catch { setRefError('Erro de rede'); }
    setRefSaving(false);
  };

  const handleRemoveRef = async (refereeId: string) => {
    if (!confirm('Remover este árbitro do campeonato?')) return;
    try {
      const res = await fetch(`/api/admin/championships/${champId}/referees`, {
  credentials: 'include',
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refereeId }),
      });
      if (res.ok) fetchChamp();
      else {
        const data = await res.json();
        alert(data.error ?? 'Erro ao remover');
      }
    } catch { /* ignore */ }
  };

  const handleStatusChange = async () => {
    if (!statusVal || statusVal === champ?.status) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/admin/championships/${champId}`, {
  credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusVal }),
      });
      if (res.ok) fetchChamp();
    } catch { /* ignore */ }
    setStatusSaving(false);
  };

  const handleGenerateOfficialResult = async (categoryId: string) => {
    setCategoryActionMessage('');
    setCategoryActionError('');
    setCategoryActionLoadingId(`finalize-${categoryId}`);
    try {
      const res = await fetch(`/api/admin/championships/${champId}/categories/${categoryId}/finalize`, {
  credentials: 'include', method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setCategoryActionError(data.error ?? 'Erro ao gerar resultado oficial');
      } else {
        setCategoryActionMessage('Resultado oficial gerado com sucesso.');
        await fetchChamp();
      }
    } catch {
      setCategoryActionError('Erro de rede ao gerar resultado oficial');
    }
    setCategoryActionLoadingId('');
  };

  const handleDownloadOfficialPdf = async (categoryId: string) => {
    setCategoryActionMessage('');
    setCategoryActionError('');
    setCategoryActionLoadingId(`pdf-${categoryId}`);
    try {
      const res = await fetch(`/api/admin/championships/${champId}/categories/${categoryId}/result-pdf`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        setCategoryActionError(data.error ?? 'Erro ao baixar PDF oficial');
        setCategoryActionLoadingId('');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `resultado-oficial-${categoryId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setCategoryActionMessage('PDF oficial baixado com sucesso.');
    } catch {
      setCategoryActionError('Erro de rede ao baixar PDF oficial');
    }
    setCategoryActionLoadingId('');
  };

  const handleReopenCategory = async (categoryId: string) => {
    const reason = window.prompt('Informe o motivo obrigatório da reabertura:')?.trim() ?? '';
    if (!reason) {
      setCategoryActionError('Motivo da reabertura é obrigatório.');
      return;
    }

    setCategoryActionMessage('');
    setCategoryActionError('');
    setCategoryActionLoadingId(`reopen-${categoryId}`);
    try {
      const res = await fetch(`/api/admin/championships/${champId}/categories/${categoryId}/reopen`, {
  credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCategoryActionError(data.error ?? 'Erro ao reabrir categoria');
      } else {
        setCategoryActionMessage('Categoria reaberta e resultado oficial anterior invalidado.');
        await fetchChamp();
      }
    } catch {
      setCategoryActionError('Erro de rede ao reabrir categoria');
    }
    setCategoryActionLoadingId('');
  };

  if (authStatus === 'loading' || loading) {
    return <MainLayout><Container><LoadingText>Carregando...</LoadingText></Container></MainLayout>;
  }

  if (!champ) {
    return (
      <MainLayout>
        <Container>
          <BackLink onClick={() => router.push(isAdminOrSuperAdmin ? '/dashboard/admin/campeonatos' : '/dashboard')}>
            <ArrowLeft size={14} /> Voltar
          </BackLink>
          <LoadingText>Campeonato não encontrado</LoadingText>
        </Container>
      </MainLayout>
    );
  }

  const assignedIds = new Set(champ.referees.map((r) => r.referee.id));
  const unassigned = availableRefs.filter((r) => !assignedIds.has(r.id));

  return (
    <MainLayout>
      <Container>
        <BackLink onClick={() => router.push(isAdminOrSuperAdmin ? '/dashboard/admin/campeonatos' : '/dashboard')}>
          <ArrowLeft size={14} /> {isAdminOrSuperAdmin ? 'Voltar aos Campeonatos' : 'Voltar ao Dashboard'}
        </BackLink>

        <Title>{champ.name}</Title>

        <MetaGrid>
          <StatusBadge $status={champ.status}>{STATUS_LABELS[champ.status] ?? champ.status}</StatusBadge>
          <MetaPill><Calendar size={13} /> {new Date(champ.date).toLocaleDateString('pt-BR')}</MetaPill>
          {champ.venue && <MetaPill><MapPin size={13} /> {champ.venue}</MetaPill>}
          {(champ.city || champ.state) && (
            <MetaPill><MapPin size={13} /> {[champ.city, champ.state].filter(Boolean).join(', ')}</MetaPill>
          )}
          <MetaPill><Info size={13} /> {champ._count.participations} atleta{champ._count.participations !== 1 ? 's' : ''}</MetaPill>
        </MetaGrid>

        {champ.description && (
          <Card padding="16px" style={{ marginBottom: 32 }}>
            <ItemSub>{champ.description}</ItemSub>
          </Card>
        )}

        {/* Status control */}
        {isAdminOrSuperAdmin && (
          <StatusSelectWrapper>
            <SelectLabel>Status:</SelectLabel>
            <Select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ONGOING">Em Andamento</option>
              <option value="FINISHED">Finalizado</option>
            </Select>
            <Button size="sm" isLoading={statusSaving} onClick={handleStatusChange} icon={<Save size={14} />} disabled={statusVal === champ.status}>
              Salvar
            </Button>
          </StatusSelectWrapper>
        )}

        {/* Categories */}
        <SectionRow>
          <SectionTitle><Tag size={18} /> CATEGORIAS</SectionTitle>
          {isAdminOrSuperAdmin && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCatModal(true)}>Adicionar</Button>
          )}
        </SectionRow>
        <ItemsGrid>
          {champ.categories.length === 0 ? (
            <EmptyItem>Nenhuma categoria cadastrada</EmptyItem>
          ) : (
            champ.categories.map((cat) => {
              const hasOfficialResult = (cat.categoryResults?.length ?? 0) > 0;
              const isCategoryFinalized = cat.status === 'RESULT_FINALIZED';

              return (
                <ItemCard key={cat.id}>
                  <div style={{ width: '100%' }}>
                    <ItemName>{cat.name}</ItemName>
                    {cat.description && <><br /><ItemSub>{cat.description}</ItemSub></>}

                    <CategoryMeta>
                      <CategoryStatusPill $status={cat.status}>{CATEGORY_STATUS_LABELS[cat.status]}</CategoryStatusPill>
                      {hasOfficialResult && <CategoryStatusPill $status="RESULT_FINALIZED">PDF OFICIAL DISPONÍVEL</CategoryStatusPill>}
                    </CategoryMeta>

                    <CategoryActions>
                      {canGenerateOfficialResult && (
                        <Button
                          size="sm"
                          icon={<Trophy size={14} />}
                          isLoading={categoryActionLoadingId === `finalize-${cat.id}`}
                          disabled={isCategoryFinalized}
                          onClick={() => handleGenerateOfficialResult(cat.id)}
                        >
                          Gerar Resultado Oficial
                        </Button>
                      )}

                      {hasOfficialResult && (
                        <Button
                          size="sm"
                          icon={<Download size={14} />}
                          isLoading={categoryActionLoadingId === `pdf-${cat.id}`}
                          onClick={() => handleDownloadOfficialPdf(cat.id)}
                        >
                          Baixar PDF Oficial
                        </Button>
                      )}

                      {canReopenCategory && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<RotateCcw size={14} />}
                          isLoading={categoryActionLoadingId === `reopen-${cat.id}`}
                          disabled={!hasOfficialResult}
                          onClick={() => handleReopenCategory(cat.id)}
                        >
                          Reabrir Categoria
                        </Button>
                      )}
                    </CategoryActions>
                  </div>
                </ItemCard>
              );
            })
          )}
        </ItemsGrid>

        {(categoryActionError || categoryActionMessage) && (
          <InlineAlert $error={Boolean(categoryActionError)}>{categoryActionError || categoryActionMessage}</InlineAlert>
        )}

        {/* Championship items */}
        {isAdminOrSuperAdmin && (
          <>
            <SectionRow>
              <SectionTitle><Package size={18} /> ITENS</SectionTitle>
            </SectionRow>
            <ChampionshipItemsList championshipId={champId} />
          </>
        )}

        {/* Referees */}
        {isAdminOrSuperAdmin && (
          <>
            <SectionRow>
              <SectionTitle><UserCheck size={18} /> ÁRBITROS</SectionTitle>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowRefModal(true)} disabled={unassigned.length === 0}>Atribuir</Button>
            </SectionRow>
            <ItemsGrid>
              {champ.referees.length === 0 ? (
                <EmptyItem>Nenhum árbitro atribuído</EmptyItem>
              ) : (
                champ.referees.map((ra) => (
                  <ItemCard key={ra.id}>
                    <div>
                      <ItemName>
                        {ra.referee.name}
                        <RolePill $role={ra.referee.role}>{ROLE_LABELS[ra.referee.role] ?? ra.referee.role}</RolePill>
                      </ItemName>
                      <br /><ItemSub>{ra.referee.email}</ItemSub>
                    </div>
                    <RemoveBtn onClick={() => handleRemoveRef(ra.referee.id)} title="Remover árbitro">
                      <Trash2 size={16} />
                    </RemoveBtn>
                  </ItemCard>
                ))
              )}
            </ItemsGrid>
          </>
        )}

        {/* Inscriptions */}
        <SectionRow>
          <SectionTitle><ClipboardList size={18} /> INSCRIÇÕES</SectionTitle>
          <Button size="sm" icon={<Scale size={14} />} onClick={() => router.push(`/dashboard/admin/championships/${champId}/checkin`)}>
            Check-in / Pesagem
          </Button>
        </SectionRow>
        <ItemsGrid>
          {inscriptions.length === 0 ? (
            <EmptyItem>Nenhum atleta inscrito</EmptyItem>
          ) : (
            inscriptions.map((inscription) => (
              <ItemCard key={inscription.id}>
                <div>
                  <ItemName>{inscription.athlete.name}</ItemName>
                  <br /><ItemSub>{inscription.athlete.email}</ItemSub>
                  <br /><ItemSub>Status: {STATUS_LABELS[inscription.status] ?? inscription.status}</ItemSub>
                  <br /><ItemSub>Número atleta: {inscription.athleteNumber ?? '—'}</ItemSub>
                  <br /><ItemSub>Total categorias: {inscription.totalCategoriesAllowed} (extras: {inscription.extraCategories})</ItemSub>
                  <br /><ItemSub>
                    Categorias reais: {inscription.participations.map((p) => p.category?.name).filter(Boolean).join(', ') || 'Não definidas'}
                  </ItemSub>
                  <br /><ItemSub>Serviços: {inscription.painting ? 'Pintura' : 'Sem pintura'} • {inscription.photos ? 'Fotos' : 'Sem fotos'}</ItemSub>
                </div>
              </ItemCard>
            ))
          )}
        </ItemsGrid>

        {/* Category Modal */}
        {showCatModal && (
          <ModalOverlay onClick={() => setShowCatModal(false)}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
              <ModalTitle>NOVA <Gold>CATEGORIA</Gold></ModalTitle>
              {catError && <ErrorMsg>{catError}</ErrorMsg>}
              <FormGroup>
                <Input label="Nome da categoria" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} />
                <Input label="Descrição (opcional)" value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} />
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" onClick={() => setShowCatModal(false)}>Cancelar</Button>
                <Button isLoading={catSaving} onClick={handleAddCategory}>Criar</Button>
              </ModalActions>
            </ModalBox>
          </ModalOverlay>
        )}

        {/* Referee Modal */}
        {showRefModal && (
          <ModalOverlay onClick={() => setShowRefModal(false)}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
              <ModalTitle>ATRIBUIR <Gold>ÁRBITRO</Gold></ModalTitle>
              {refError && <ErrorMsg>{refError}</ErrorMsg>}
              <FormGroup>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SelectLabel>Selecione o árbitro</SelectLabel>
                  <Select value={selectedRef} onChange={(e) => setSelectedRef(e.target.value)}>
                    <option value="">— Selecionar —</option>
                    {unassigned.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({ROLE_LABELS[r.role] ?? r.role})</option>
                    ))}
                  </Select>
                </div>
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" onClick={() => setShowRefModal(false)}>Cancelar</Button>
                <Button isLoading={refSaving} onClick={handleAssignRef}>Atribuir</Button>
              </ModalActions>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    </MainLayout>
  );
}