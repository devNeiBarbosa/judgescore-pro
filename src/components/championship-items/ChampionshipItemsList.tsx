'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Edit3, Plus, Power, Trash2 } from 'lucide-react';
import Button from '@/src/components/ui/button';
import ChampionshipItemForm, { ChampionshipItem } from './ChampionshipItemForm';

interface ChampionshipItemsListProps {
  championshipId: string;
}

const SectionCard = styled.div`
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.lg ?? '12px'};
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  padding: 16px;
  margin-bottom: 40px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`;

const Td = styled.td`
  padding: 10px 12px;
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  font-size: 0.84rem;
  vertical-align: top;
`;

const Badge = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  background: ${({ $active }) => ($active ? 'rgba(0,230,118,0.12)' : 'rgba(255,107,107,0.12)')};
  color: ${({ $active }) => ($active ? '#00E676' : '#FF6B6B')};
`;

const Actions = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const IconBtn = styled.button`
  background: transparent;
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  padding: 6px;
  cursor: pointer;
  display: inline-flex;

  &:hover {
    color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    border-color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  }
`;

const InlineInfo = styled.p<{ $error?: boolean }>`
  margin-top: 10px;
  font-size: 0.78rem;
  color: ${({ $error }) => ($error ? '#FF6B6B' : '#00E676')};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 10px;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-size: 0.82rem;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 220;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 560px;
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.lg ?? '12px'};
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  padding: 24px;
`;

const ModalTitle = styled.h3`
  margin-bottom: 16px;
  letter-spacing: 1px;
  font-size: 1.05rem;
`;

function formatPriceInBRL(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ChampionshipItemsList({ championshipId }: ChampionshipItemsListProps) {
  const [items, setItems] = useState<ChampionshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<ChampionshipItem | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'pt-BR')),
    [items],
  );

  const fetchItems = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/admin/championships/${championshipId}/items`, { credentials: 'include' });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível carregar os itens.');
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError('Erro de rede ao carregar os itens.');
      setItems([]);
    }

    setLoading(false);
  }, [championshipId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleActive = async (item: ChampionshipItem) => {
    setError('');
    setSuccess('');
    setSavingAction(`toggle-${item.id}`);

    try {
      const response = await fetch(`/api/admin/championships/${championshipId}/items/${item.id}`, {
  credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Falha ao alterar status do item.');
        setSavingAction('');
        return;
      }

      setItems((prev) => prev.map((entry) => (entry.id === item.id ? data.item : entry)));
      setSuccess(`Item ${data.item.isActive ? 'ativado' : 'desativado'} com sucesso.`);
    } catch {
      setError('Erro de rede ao atualizar item.');
    }

    setSavingAction('');
  };

  const handleDelete = async (item: ChampionshipItem) => {
    setError('');
    setSuccess('');

    const firstConfirm = window.confirm(`Tem certeza que deseja remover o item "${item.name}"? Esta ação é irreversível.`);
    if (!firstConfirm) return;

    const typedName = window.prompt(`Confirmação segura: digite exatamente o nome do item para remover:\n\n${item.name}`)?.trim();

    if (typedName !== item.name) {
      setError('Confirmação inválida. Digite o nome exato do item para remover.');
      return;
    }

    setSavingAction(`delete-${item.id}`);

    try {
      const response = await fetch(`/api/admin/championships/${championshipId}/items/${item.id}`, {
  credentials: 'include',
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível remover o item.');
        setSavingAction('');
        return;
      }

      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setSuccess('Item removido com sucesso.');
    } catch {
      setError('Erro de rede ao remover item.');
    }

    setSavingAction('');
  };

  const handleFormSuccess = (savedItem: ChampionshipItem) => {
    setShowCreate(false);
    setEditingItem(null);
    setError('');
    setSuccess('Item salvo com sucesso.');
    setItems((prev) => {
      const found = prev.find((entry) => entry.id === savedItem.id);
      if (found) {
        return prev.map((entry) => (entry.id === savedItem.id ? savedItem : entry));
      }
      return [savedItem, ...prev];
    });
  };

  return (
    <SectionCard>
      <Header>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          Novo item
        </Button>
      </Header>

      {loading ? (
        <EmptyState>Carregando itens...</EmptyState>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Preço</Th>
                <Th>Descrição</Th>
                <Th>Imagem</Th>
                <Th>Status</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <Td colSpan={6}>
                    <EmptyState>Nenhum item cadastrado neste campeonato.</EmptyState>
                  </Td>
                </tr>
              ) : (
                sortedItems.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.name}</Td>
                    <Td>{formatPriceInBRL(item.priceInCents)}</Td>
                    <Td>{item.description || '—'}</Td>
                    <Td>
                      {item.imageUrl ? (
                        <a href={item.imageUrl} target="_blank" rel="noreferrer">
                          Abrir imagem
                        </a>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <Badge $active={item.isActive}>{item.isActive ? 'ATIVO' : 'INATIVO'}</Badge>
                    </Td>
                    <Td>
                      <Actions>
                        <IconBtn
                          title="Editar"
                          onClick={() => setEditingItem(item)}
                          disabled={Boolean(savingAction)}
                          aria-label={`Editar item ${item.name}`}
                        >
                          <Edit3 size={14} />
                        </IconBtn>
                        <IconBtn
                          title={item.isActive ? 'Desativar' : 'Ativar'}
                          onClick={() => handleToggleActive(item)}
                          disabled={savingAction === `toggle-${item.id}` || Boolean(savingAction.startsWith('delete-'))}
                          aria-label={`${item.isActive ? 'Desativar' : 'Ativar'} item ${item.name}`}
                        >
                          <Power size={14} />
                        </IconBtn>
                        <IconBtn
                          title="Remover"
                          onClick={() => handleDelete(item)}
                          disabled={savingAction === `delete-${item.id}` || Boolean(savingAction.startsWith('toggle-'))}
                          aria-label={`Remover item ${item.name}`}
                        >
                          <Trash2 size={14} />
                        </IconBtn>
                      </Actions>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      {(error || success) && <InlineInfo $error={Boolean(error)}>{error || success}</InlineInfo>}

      {(showCreate || editingItem) && (
        <Overlay onClick={() => { setShowCreate(false); setEditingItem(null); }}>
          <Modal onClick={(event) => event.stopPropagation()}>
            <ModalTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</ModalTitle>
            <ChampionshipItemForm
              championshipId={championshipId}
              item={editingItem}
              onCancel={() => {
                setShowCreate(false);
                setEditingItem(null);
              }}
              onSuccess={handleFormSuccess}
            />
          </Modal>
        </Overlay>
      )}
    </SectionCard>
  );
}
