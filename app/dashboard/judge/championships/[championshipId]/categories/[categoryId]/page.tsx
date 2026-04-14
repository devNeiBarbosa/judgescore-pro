'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';

const Back = styled.button`
  margin-top: 40px;
  margin-bottom: 16px;
  border: none;
  background: none;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  display: inline-flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Small = styled.p`
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.8rem;
`;

const Alert = styled.p<{ $error?: boolean }>`
  margin: 8px 0;
  font-size: 0.85rem;
  color: ${({ $error }) => ($error ? '#ff6b6b' : '#00E676')};
`;

const FinalizedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 2px solid #16a34a;
  background: rgba(22, 163, 74, 0.24);
  color: #bbf7d0;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
`;

const FinalizedCallout = styled.div`
  margin: 12px 0;
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid #16a34a;
  background: rgba(22, 163, 74, 0.2);
  color: #dcfce7;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Table = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Row = styled.div<{ $filled: boolean; $disabled: boolean }>`
  display: grid;
  grid-template-columns: 120px 1fr 180px;
  gap: 12px;
  align-items: center;
  border-radius: 12px;
  border: 1px solid
    ${({ $filled, theme }) => ($filled ? '#22c55e' : theme?.colors?.border ?? '#222222')};
  background: ${({ $filled, $disabled, theme }) => {
    if ($disabled) return 'rgba(148, 163, 184, 0.12)';
    if ($filled) return 'rgba(34, 197, 94, 0.12)';
    return theme?.colors?.surface ?? '#0F0F0F';
  }};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  padding: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const AthleteNumber = styled.span`
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: ${({ theme }) => theme?.colors?.text ?? '#ffffff'};
`;

const AthleteName = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme?.colors?.text ?? '#ffffff'};
`;

const PositionField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SaveHint = styled.span<{ $tone?: 'default' | 'success' | 'error' }>`
  color: ${({ $tone, theme }) => {
    if ($tone === 'success') return '#22c55e';
    if ($tone === 'error') return '#ef4444';
    return theme?.colors?.textSecondary ?? '#A0A0A0';
  }};
  font-size: 0.72rem;
  line-height: 1;
  font-weight: 600;
`;

const PositionInput = styled.input<{ $disabled: boolean }>`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  background: ${({ $disabled, theme }) => ($disabled ? 'rgba(100, 116, 139, 0.25)' : theme?.colors?.surface ?? '#0F0F0F')};
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'text')};

  &:focus {
    outline: none;
    border-color: #22c55e;
    box-shadow: 0 0 0 1px #22c55e;
  }

  &::placeholder {
    color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
    font-weight: 500;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalCard = styled.div`
  width: min(92vw, 520px);
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme?.colors?.border ?? '#2a2a2a'};
  background: ${({ theme }) => theme?.colors?.background ?? '#0b0b0b'};
  padding: 20px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 10px;
`;

const ModalActions = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

type Participation = {
  id: string;
  athleteNumber: number | null;
  athlete: { id: string; name: string };
  judgment: {
    id: string;
    participationId: string;
    position: number | null;
    finalized: boolean;
    updatedAt: string;
  } | null;
};

type GlobalJudgeStatus = {
  judgeId: string;
  name: string;
  email: string;
  role: string;
  finalized: boolean;
  completedJudgments: number;
  totalRequiredJudgments: number;
};

export default function JudgeCategoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const championshipId = params?.championshipId as string;
  const categoryId = params?.categoryId as string;

  const [categoryName, setCategoryName] = useState('Categoria');
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [positions, setPositions] = useState<Record<string, number | null>>({});
  const [finalized, setFinalized] = useState(false);
  const [saveStatusByParticipation, setSaveStatusByParticipation] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [finalizing, setFinalizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [globalFinalized, setGlobalFinalized] = useState<GlobalJudgeStatus[]>([]);
  const [globalPending, setGlobalPending] = useState<GlobalJudgeStatus[]>([]);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveStatusTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastSavedPositionsRef = useRef<Record<string, number | null>>({});

  const canAccess = session?.user?.role === 'ARBITRO_AUXILIAR' || session?.user?.role === 'ARBITRO_CENTRAL' || session?.user?.role === 'SUPER_ADMIN';

  const setSaveStatus = useCallback((participationId: string, status: 'saving' | 'saved' | 'error' | null) => {
    setSaveStatusByParticipation((prev) => {
      const currentStatus = prev[participationId];
      if (status === null) {
        if (!currentStatus) return prev;
        const next = { ...prev };
        delete next[participationId];
        return next;
      }

      if (currentStatus === status) return prev;
      return { ...prev, [participationId]: status };
    });
  }, []);

  const scheduleClearSaveStatus = useCallback((participationId: string, timeoutMs: number) => {
    const currentStatusTimer = saveStatusTimersRef.current[participationId];
    if (currentStatusTimer) clearTimeout(currentStatusTimer);

    saveStatusTimersRef.current[participationId] = setTimeout(() => {
      setSaveStatus(participationId, null);
      delete saveStatusTimersRef.current[participationId];
    }, timeoutMs);
  }, [setSaveStatus]);
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/judge/championships/${championshipId}/categories/${categoryId}/participations`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao carregar julgamento');
        setLoading(false);
        return;
      }

      setCategoryName(data.category?.name ?? 'Categoria');
      setParticipations(data.participations ?? []);
      setFinalized(Boolean(data.finalized));
      setGlobalFinalized(data.globalStatus?.finalizedJudges ?? []);
      setGlobalPending(data.globalStatus?.pendingJudges ?? []);

      const mapped: Record<string, number | null> = {};
      (data.participations ?? []).forEach((item: Participation) => {
        mapped[item.id] = item.judgment?.position ?? null;
      });

      setPositions(mapped);
      setSaveStatusByParticipation({});
      lastSavedPositionsRef.current = mapped;
    } catch {
      setError('Erro de rede ao carregar julgamento');
    }
    setLoading(false);
  }, [championshipId, categoryId]);

  useEffect(() => {
    if (status === 'authenticated' && !canAccess) {
      router.replace('/dashboard');
      return;
    }

    if (status === 'authenticated' && canAccess) {
      loadData();
    }
  }, [status, canAccess, router, loadData]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
      Object.values(saveStatusTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (loading || finalized || participations.length === 0) return;

    const firstInput = inputRefs.current[participations[0].id];
    if (!firstInput) return;

    firstInput.focus();
    const len = firstInput.value.length;
    firstInput.setSelectionRange(len, len);
  }, [loading, finalized, participations]);

  const selectedPositions = useMemo(
    () => Object.values(positions).filter((value): value is number => value !== null),
    [positions],
  );

  const evaluatedCount = useMemo(
    () => Object.values(positions).filter((value) => typeof value === 'number' && value >= 1 && value <= 10).length,
    [positions],
  );

  const saveParticipation = async (participationId: string, positionToSave: number | null) => {
    if (finalized) {
      setError('Categoria já finalizada. Edição bloqueada.');
      return;
    }

    if (lastSavedPositionsRef.current[participationId] === positionToSave) {
      setSaveStatus(participationId, 'saved');
      scheduleClearSaveStatus(participationId, 5000);
      return;
    }

    setSaveStatus(participationId, 'saving');
    setError('');

    try {
      const res = await fetch('/api/judge/judgments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          championshipId,
          categoryId,
          participationId,
          position: positionToSave,
        }),
      });

      await res.json();

      if (!res.ok) {
        setSaveStatus(participationId, 'error');
      } else {
        lastSavedPositionsRef.current[participationId] = positionToSave;
        setSaveStatus(participationId, 'saved');
        scheduleClearSaveStatus(participationId, 5000);
      }
    } catch {
      setSaveStatus(participationId, 'error');
    }
  };

  const scheduleAutoSave = (participationId: string, positionToSave: number | null) => {
    const currentTimer = saveTimersRef.current[participationId];
    if (currentTimer) clearTimeout(currentTimer);

    const currentStatusTimer = saveStatusTimersRef.current[participationId];
    if (currentStatusTimer) {
      clearTimeout(currentStatusTimer);
      delete saveStatusTimersRef.current[participationId];
    }

    setSaveStatus(participationId, 'saving');

    saveTimersRef.current[participationId] = setTimeout(() => {
      saveParticipation(participationId, positionToSave);
      delete saveTimersRef.current[participationId];
    }, 5000);
  };

  const flushAndSave = (participationId: string, positionToSave: number | null) => {
    const currentTimer = saveTimersRef.current[participationId];
    if (currentTimer) {
      clearTimeout(currentTimer);
      delete saveTimersRef.current[participationId];
    }

    const currentStatusTimer = saveStatusTimersRef.current[participationId];
    if (currentStatusTimer) {
      clearTimeout(currentStatusTimer);
      delete saveStatusTimersRef.current[participationId];
    }

    setSaveStatus(participationId, 'saving');
    saveParticipation(participationId, positionToSave);
  };

  const focusNextInput = (currentParticipationId: string) => {
    const currentIndex = participations.findIndex((item) => item.id === currentParticipationId);
    if (currentIndex === -1) return;

    const nextItem = participations[currentIndex + 1];
    if (!nextItem) return;

    const nextInput = inputRefs.current[nextItem.id];
    nextInput?.focus();
    nextInput?.select();
  };

  const handlePositionInput = (participationId: string, value: string) => {
    if (finalized) return;

    if (value === '') {
      setError('');
      setPositions((prev) => ({ ...prev, [participationId]: null }));
      scheduleAutoSave(participationId, null);
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      setError('Posição inválida. Use valores de 1 a 10.');
      return;
    }

    setError('');
    setPositions((prev) => ({ ...prev, [participationId]: parsed }));
    scheduleAutoSave(participationId, parsed);
  };

  const handlePositionBlur = (participationId: string) => {
    if (finalized) return;
    flushAndSave(participationId, positions[participationId] ?? null);
  };

  const handlePositionKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, participationId: string) => {
    const blockedKeys = ['e', 'E', '+', '-', '.', ',', ' '];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      flushAndSave(participationId, positions[participationId] ?? null);
      focusNextInput(participationId);
    }
  };

  const finalizeCategory = async () => {
    if (finalized) return;

    setFinalizing(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/judge/championships/${championshipId}/categories/${categoryId}/finalize`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao finalizar categoria');
      } else {
        setMessage('Categoria finalizada com sucesso. Edição bloqueada.');
        setFinalized(true);
        await loadData();
      }
    } catch {
      setError('Erro de rede ao finalizar categoria');
    }

    setFinalizing(false);
  };

  if (status === 'loading' || loading) {
    return <MainLayout><Container><Small>Carregando julgamento...</Small></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container>
        <Back onClick={() => router.push(`/dashboard/judge/championships/${championshipId}`)}>
          <ArrowLeft size={14} /> Voltar às categorias
        </Back>

        <HeaderRow>
          <h1 style={{ letterSpacing: '2px', marginBottom: 6 }}>JULGAMENTO — {categoryName.toUpperCase()}</h1>
          {finalized && (
            <FinalizedBadge>
              <Lock size={14} /> CATEGORIA FINALIZADA
            </FinalizedBadge>
          )}
        </HeaderRow>

        <Small>
          Digite posições de 1 a 10. Campo vazio significa sem classificação.
        </Small>
        <Small style={{ marginTop: 2 }}>
          Você já avaliou {evaluatedCount} atletas
        </Small>

        {finalized && (
          <FinalizedCallout>
            <Lock size={18} /> CATEGORIA FINALIZADA — JULGAMENTO BLOQUEADO
          </FinalizedCallout>
        )}

        {error && <Alert $error>{error}</Alert>}
        {message && <Alert>{message}</Alert>}

        <Card padding="16px" style={{ marginTop: 12 }}>
          <Table>
            {participations.map((participation) => {
              const hasPosition = positions[participation.id] !== null;

              return (
                <Row key={participation.id} $filled={hasPosition} $disabled={finalized}>
                  <AthleteNumber>#{participation.athleteNumber ?? '—'}</AthleteNumber>
                  <AthleteName>{participation.athlete.name}</AthleteName>
                  <PositionField>
                    <Small style={{ margin: 0 }}>Posição</Small>
                    <PositionInput
                      ref={(element) => {
                        inputRefs.current[participation.id] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      autoComplete="off"
                      placeholder="1-10"
                      value={positions[participation.id] ?? ''}
                      onChange={(event) => handlePositionInput(participation.id, event.target.value)}
                      onBlur={() => handlePositionBlur(participation.id)}
                      onKeyDown={(event) => handlePositionKeyDown(event, participation.id)}
                      disabled={finalized}
                      $disabled={finalized}
                    />
                    {saveStatusByParticipation[participation.id] === 'saving' && <SaveHint>Salvando...</SaveHint>}
                    {saveStatusByParticipation[participation.id] === 'saved' && <SaveHint $tone="success">✔ Salvo</SaveHint>}
                    {saveStatusByParticipation[participation.id] === 'error' && <SaveHint $tone="error">Falha ao salvar</SaveHint>}
                  </PositionField>
                </Row>
              );
            })}
          </Table>

          <div style={{ marginTop: 16 }}>
            <Small>
              Posições usadas no momento: {selectedPositions.length ? [...selectedPositions].sort((a, b) => a - b).join(', ') : 'nenhuma'}
            </Small>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button
              icon={<CheckCircle2 size={15} />}
              isLoading={finalizing}
              disabled={finalized || participations.length === 0}
              onClick={() => setShowFinalizeConfirm(true)}
            >
              Finalizar Categoria
            </Button>
          </div>
        </Card>

        <Card padding="16px" style={{ marginTop: 12, marginBottom: 40 }}>
          <strong>Controle global de finalização</strong>
          <Small>Finalizados: {globalFinalized.length} • Pendentes: {globalPending.length}</Small>
          <div style={{ marginTop: 10 }}>
            {globalFinalized.map((judge) => (
              <Small key={`f-${judge.judgeId}`}>✅ {judge.name} ({judge.completedJudgments}/{judge.totalRequiredJudgments})</Small>
            ))}
            {globalPending.map((judge) => (
              <Small key={`p-${judge.judgeId}`}>⏳ {judge.name} ({judge.completedJudgments}/{judge.totalRequiredJudgments})</Small>
            ))}
          </div>
        </Card>

        {showFinalizeConfirm && (
          <ModalOverlay>
            <ModalCard>
              <ModalTitle>Confirmar finalização</ModalTitle>
              <Small style={{ fontSize: '0.95rem', margin: 0 }}>
                Você está finalizando o julgamento desta categoria. Deseja continuar?
              </Small>
              {evaluatedCount === 0 && (
                <Small style={{ fontSize: '0.9rem', marginTop: 8 }}>
                  Você não avaliou nenhum atleta. Deseja realmente finalizar?
                </Small>
              )}
              <ModalActions>
                <Button variant="secondary" onClick={() => setShowFinalizeConfirm(false)}>
                  Cancelar
                </Button>
                <Button
                  icon={<CheckCircle2 size={15} />}
                  isLoading={finalizing}
                  onClick={async () => {
                    setShowFinalizeConfirm(false);
                    await finalizeCategory();
                  }}
                >
                  Confirmar
                </Button>
              </ModalActions>
            </ModalCard>
          </ModalOverlay>
        )}
      </Container>
    </MainLayout>
  );
}
