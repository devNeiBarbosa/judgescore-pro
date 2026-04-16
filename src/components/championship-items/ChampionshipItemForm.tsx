'use client';

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';

export interface ChampionshipItem {
  id: string;
  name: string;
  priceInCents: number;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChampionshipItemFormProps {
  championshipId: string;
  item?: ChampionshipItem | null;
  onCancel: () => void;
  onSuccess: (item: ChampionshipItem) => void;
}

interface FormState {
  name: string;
  priceMasked: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

const FormGrid = styled.div`
  display: grid;
  gap: 14px;
`;

const CheckboxRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const ErrorMsg = styled.p`
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  font-size: 0.8125rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
`;

function formatCentsToCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDigitsToCurrencyInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '');
  const cents = Number(digits || '0');
  return formatCentsToCurrency(cents);
}

function parseCurrencyInputToCents(maskedValue: string): number {
  const digits = maskedValue.replace(/\D/g, '');
  return Number(digits || '0');
}

export default function ChampionshipItemForm({ championshipId, item, onCancel, onSuccess }: ChampionshipItemFormProps) {
  const [form, setForm] = useState<FormState>(() => ({
    name: item?.name ?? '',
    priceMasked: formatCentsToCurrency(item?.priceInCents ?? 0),
    description: item?.description ?? '',
    imageUrl: item?.imageUrl ?? '',
    isActive: item?.isActive ?? true,
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(item);

  const priceInCents = useMemo(() => parseCurrencyInputToCents(form.priceMasked), [form.priceMasked]);

  const handleSubmit = async () => {
    setError('');

    if (form.name.trim().length < 2) {
      setError('Nome deve ter ao menos 2 caracteres.');
      return;
    }

    if (!Number.isInteger(priceInCents) || priceInCents < 0) {
      setError('Preço inválido.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        price: priceInCents,
        priceInCents,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        isActive: form.isActive,
      };

      const url = isEditing
        ? `/api/admin/championships/${championshipId}/items/${item?.id}`
        : `/api/admin/championships/${championshipId}/items`;

      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
  credentials: 'include',
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível salvar o item.');
        setSaving(false);
        return;
      }

      let finalItem: ChampionshipItem = data.item;

      if (!isEditing && !form.isActive && data?.item?.id) {
        const activationResponse = await fetch(`/api/admin/championships/${championshipId}/items/${data.item.id}`, {
  credentials: 'include',
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        });

        const activationData = await activationResponse.json();

        if (!activationResponse.ok) {
          setError(activationData?.error ?? 'Item criado, mas não foi possível atualizar o status.');
          setSaving(false);
          return;
        }

        finalItem = activationData.item;
      }

      onSuccess(finalItem);
    } catch {
      setError('Erro de rede ao salvar item.');
    }

    setSaving(false);
  };

  return (
    <>
      <FormGrid>
        <Input
          label="Nome"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Ex.: Camiseta oficial"
        />

        <Input
          label="Preço"
          value={form.priceMasked}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              priceMasked: formatDigitsToCurrencyInput(event.target.value),
            }))
          }
          placeholder="R$ 0,00"
        />

        <Input
          label="Descrição"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Descrição opcional"
        />

        <Input
          label="URL da imagem"
          value={form.imageUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
          placeholder="https://..."
        />

        <CheckboxRow>
          <Checkbox
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          Item ativo
        </CheckboxRow>
      </FormGrid>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Actions>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} isLoading={saving}>
          {isEditing ? 'Salvar alterações' : 'Criar item'}
        </Button>
      </Actions>
    </>
  );
}
