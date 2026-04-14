'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, Scale, Ruler, Hash, CheckCircle2 } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { STATUS_LABELS } from '@/lib/types';

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
  margin-top: 40px;
  margin-bottom: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 2px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  margin-bottom: 40px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const SearchRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
`;

const ResultItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  background: ${({ $active, theme }) => ($active ? `${theme?.colors?.gold ?? '#FFD700'}14` : theme?.colors?.surface ?? '#0F0F0F')};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  padding: 10px 12px;
  cursor: pointer;
`;

const Small = styled.p`
  margin-top: 4px;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-size: 0.78rem;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const CategoriesWrap = styled.div`
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  padding: 12px;
  margin-bottom: 16px;
`;

const CategoryRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.85rem;
`;

const Alert = styled.p<{ $error?: boolean }>`
  font-size: 0.82rem;
  margin-bottom: 10px;
  color: ${({ $error }) => ($error ? '#ff6b6b' : '#89f0a0')};
`;

const DoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
`;

type Category = { id: string; name: string };
type SearchInscription = {
  id: string;
  status: string;
  athleteNumber: string | null;
  checkedInAt: string | null;
  totalCategoriesAllowed: number;
  athlete: { name: string; email: string; cpf: string | null };
};
type InscriptionDetail = {
  id: string;
  status: string;
  totalCategoriesAllowed: number;
  extraCategories: number;
  painting: boolean;
  photos: boolean;
  weight: string | null;
  height: string | null;
  athleteNumber: string | null;
  athlete: { name: string; email: string; cpf: string | null };
  championship: { id: string; name: string };
  participations: Array<{ id: string; category: { id: string; name: string } | null }>;
};

type ListInscription = {
  id: string;
  status: string;
  athleteNumber: string | null;
  athlete: { name: string };
  participations: Array<{ category: { id: string; name: string } | null }>;
};

export default function ChampionshipCheckinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const championshipId = params?.id as string;

  const canAccess = useMemo(() => ['ADMIN', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'SUPER_ADMIN'].includes(session?.user?.role ?? ''), [session?.user?.role]);
  const canEditDone = useMemo(() => ['ADMIN', 'ARBITRO_CENTRAL', 'SUPER_ADMIN'].includes(session?.user?.role ?? ''), [session?.user?.role]);

  const [championshipName, setChampionshipName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<SearchInscription[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<InscriptionDetail | null>(null);
  const [listDone, setListDone] = useState<ListInscription[]>([]);
  const [loadingDone, setLoadingDone] = useState(false);

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [athleteNumber, setAthleteNumber] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBase = useCallback(async () => {
    try {
      const [champRes, catRes] = await Promise.all([
        fetch(`/api/admin/championships/${championshipId}`),
        fetch(`/api/admin/championships/${championshipId}/categories`),
      ]);
      if (champRes.ok) {
        const data = await champRes.json();
        setChampionshipName(data.championship?.name ?? 'Campeonato');
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories((data.categories ?? []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
      }
    } catch {
      // noop
    }
  }, [championshipId]);

  const fetchDoneList = useCallback(async () => {
    setLoadingDone(true);
    try {
      const res = await fetch(`/api/admin/championships/${championshipId}/inscriptions`);
      if (!res.ok) return;
      const data = await res.json();
      const done = (data.inscriptions ?? []).filter((item: ListInscription) => item.status === 'CHECKIN_DONE');
      setListDone(done);
    } catch {
      setListDone([]);
    }
    setLoadingDone(false);
  }, [championshipId]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/inscriptions/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const inscription = data.inscription as InscriptionDetail;
      setDetail(inscription);
      setSelectedId(inscription.id);
      setWeight(inscription.weight ?? '');
      setHeight(inscription.height ?? '');
      setAthleteNumber(inscription.athleteNumber ?? '');
      setSelectedCategories(inscription.participations.map((p) => p.category?.id).filter((value): value is string => Boolean(value)));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && !canAccess) router.replace('/dashboard');
    if (status === 'authenticated' && canAccess) {
      fetchBase();
      fetchDoneList();
    }
  }, [status, canAccess, router, fetchBase, fetchDoneList]);

  const runSearch = useCallback(async () => {
    setError('');
    setMessage('');
    const query = search.trim();
    if (!query) {
      setResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/championships/${championshipId}/inscriptions/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao buscar inscrições');
        setSearchLoading(false);
        return;
      }
      setResults(data.inscriptions ?? []);
    } catch {
      setError('Erro de rede na busca');
    }
    setSearchLoading(false);
  }, [search, championshipId]);

  const toggleCategory = (categoryId: string) => {
    setError('');
    setSelectedCategories((previous) => {
      if (previous.includes(categoryId)) {
        return previous.filter((item) => item !== categoryId);
      }

      if (detail && previous.length >= detail.totalCategoriesAllowed) {
        setError(`Limite de categorias atingido (${detail.totalCategoriesAllowed})`);
        return previous;
      }

      return [...previous, categoryId];
    });
  };

  const saveCheckin = useCallback(async () => {
    if (!detail) return;

    setError('');
    setMessage('');

    if (!weight || !height || !athleteNumber) {
      setError('Peso, altura e número do atleta são obrigatórios');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Selecione ao menos uma categoria real');
      return;
    }

    const isEdit = detail.status === 'CHECKIN_DONE';
    if (isEdit && !canEditDone) {
      setError('Apenas ADMIN ou ARBITRO_CENTRAL podem editar check-ins concluídos');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${detail.id}/${isEdit ? 'edit' : 'checkin'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: Number(weight),
          height: Number(height),
          athleteNumber,
          categoryIds: selectedCategories,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao salvar check-in');
        setSaving(false);
        return;
      }

      setMessage(isEdit ? 'Check-in editado com sucesso' : 'Check-in concluído com sucesso');
      await loadDetail(detail.id);
      await fetchDoneList();
      if (search.trim()) {
        await runSearch();
      }
    } catch {
      setError('Erro de rede ao salvar check-in');
    }
    setSaving(false);
  }, [detail, weight, height, athleteNumber, selectedCategories, canEditDone, loadDetail, fetchDoneList, runSearch, search]);

  if (status === 'loading') {
    return <MainLayout><Container><Small>Carregando...</Small></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <BackLink
          onClick={() =>
            router.push(
              session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
                ? `/dashboard/admin/championships/${championshipId}`
                : '/dashboard',
            )
          }
        >
          <ArrowLeft size={14} /> Voltar
        </BackLink>

        <Header>
          <Title>CHECK-IN / PESAGEM — {championshipName}</Title>
        </Header>

        <Grid>
          <Card padding="16px">
            <SearchRow>
              <Input placeholder="CPF, nome, e-mail ou ID" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button onClick={runSearch} isLoading={searchLoading} icon={<Search size={14} />}>Buscar</Button>
            </SearchRow>
            <Small>Busca restrita ao campeonato e à organização atual.</Small>

            <List>
              {results.map((item) => (
                <ResultItem key={item.id} $active={selectedId === item.id} onClick={() => loadDetail(item.id)}>
                  <strong>{item.athlete.name}</strong>
                  <Small>{item.athlete.email} • CPF: {item.athlete.cpf ?? 'N/A'}</Small>
                  <Small>Status: {STATUS_LABELS[item.status] ?? item.status}</Small>
                </ResultItem>
              ))}
            </List>
          </Card>

          <Card padding="16px">
            {!detail ? (
              <Small>Selecione uma inscrição para iniciar o check-in.</Small>
            ) : (
              <>
                <h3>{detail.athlete.name}</h3>
                <Small>{detail.athlete.email} • CPF: {detail.athlete.cpf ?? 'N/A'}</Small>
                <Small>Inscrição: {detail.id}</Small>
                <Small>Status: {STATUS_LABELS[detail.status] ?? detail.status}</Small>
                <Small>Total de categorias permitidas: {detail.totalCategoriesAllowed} (extras: {detail.extraCategories})</Small>
                <Small>Extras: {detail.painting ? 'Pintura' : 'Sem pintura'} • {detail.photos ? 'Fotos' : 'Sem fotos'}</Small>

                <FormGrid>
                  <Input label="Peso (kg)" type="number" step="0.01" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} icon={<Scale size={14} />} />
                  <Input label="Altura (m)" type="number" step="0.01" min="0" value={height} onChange={(e) => setHeight(e.target.value)} icon={<Ruler size={14} />} />
                  <Input label="Número do atleta" value={athleteNumber} onChange={(e) => setAthleteNumber(e.target.value)} icon={<Hash size={14} />} />
                </FormGrid>

                <CategoriesWrap>
                  <strong>Categorias reais</strong>
                  <Small>Máximo permitido: {detail.totalCategoriesAllowed}</Small>
                  {categories.map((category) => (
                    <CategoryRow key={category.id}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      {category.name}
                    </CategoryRow>
                  ))}
                </CategoriesWrap>

                {error && <Alert $error>{error}</Alert>}
                {message && <Alert>{message}</Alert>}

                <Button onClick={saveCheckin} isLoading={saving} icon={<CheckCircle2 size={15} />}>
                  {detail.status === 'CHECKIN_DONE' ? 'Salvar edição de check-in' : 'Concluir check-in'}
                </Button>
              </>
            )}
          </Card>
        </Grid>

        <h3>ATLETAS COM CHECK-IN CONCLUÍDO</h3>
        {loadingDone ? (
          <Small>Carregando check-ins...</Small>
        ) : (
          <DoneGrid>
            {listDone.map((item) => (
              <Card key={item.id} padding="12px">
                <strong>{item.athlete.name}</strong>
                <Small>Número: {item.athleteNumber ?? '—'}</Small>
                <Small>
                  Categorias: {item.participations.map((p) => p.category?.name).filter(Boolean).join(', ') || '—'}
                </Small>
              </Card>
            ))}
          </DoneGrid>
        )}
      </Container>
    </MainLayout>
  );
}
