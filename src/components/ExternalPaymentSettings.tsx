'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import Card from '@/src/components/ui/card';
import Input from '@/src/components/ui/input';
import Button from '@/src/components/ui/button';

type PaymentSettings = {
  organizationId: string;
  externalPaymentEnabled: boolean;
  externalPaymentUrl: string | null;
  externalPaymentLabel: string | null;
};

type FormState = {
  externalPaymentEnabled: boolean;
  externalPaymentUrl: string;
  externalPaymentLabel: string;
};

const SettingsCard = styled(Card)`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const SectionDescription = styled.p`
  margin: 0 0 16px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

const FormGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const ToggleRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme?.colors?.text ?? '#FFFFFF'};
`;

const ToggleInput = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const Actions = styled.div`
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Message = styled.p<{ $variant: 'error' | 'success' | 'muted' }>`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: ${({ $variant, theme }) => {
    if ($variant === 'error') return theme?.colors?.error ?? '#FF7272';
    if ($variant === 'success') return theme?.colors?.success ?? '#79D19A';
    return theme?.colors?.textSecondary ?? '#A0A0A0';
  }};
`;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ExternalPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FormState>({
    externalPaymentEnabled: false,
    externalPaymentUrl: '',
    externalPaymentLabel: '',
  });

  const urlError = useMemo(() => {
    const trimmed = form.externalPaymentUrl.trim();
    if (!trimmed) return '';
    return isValidHttpUrl(trimmed) ? '' : 'URL inválida. Use http(s)://...';
  }, [form.externalPaymentUrl]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/organization/payment-settings', {
  credentials: 'include',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível carregar as configurações de pagamento externo.');
        return;
      }

      const settings: PaymentSettings | undefined = data?.paymentSettings;

      setForm({
        externalPaymentEnabled: settings?.externalPaymentEnabled ?? false,
        externalPaymentUrl: settings?.externalPaymentUrl ?? '',
        externalPaymentLabel: settings?.externalPaymentLabel ?? '',
      });
    } catch {
      setError('Erro de rede ao carregar configurações de pagamento externo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    const trimmedUrl = form.externalPaymentUrl.trim();
    const trimmedLabel = form.externalPaymentLabel.trim();

    if (trimmedUrl && !isValidHttpUrl(trimmedUrl)) {
      setError('URL inválida. Use http(s)://...');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/admin/organization/payment-settings', {
  credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalPaymentEnabled: form.externalPaymentEnabled,
          externalPaymentUrl: trimmedUrl,
          externalPaymentLabel: trimmedLabel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível salvar as configurações de pagamento externo.');
        return;
      }

      const settings: PaymentSettings | undefined = data?.paymentSettings;

      setForm((prev) => ({
        ...prev,
        externalPaymentEnabled: settings?.externalPaymentEnabled ?? prev.externalPaymentEnabled,
        externalPaymentUrl: settings?.externalPaymentUrl ?? '',
        externalPaymentLabel: settings?.externalPaymentLabel ?? '',
      }));

      setSuccess('Configurações salvas com sucesso.');
    } catch {
      setError('Erro de rede ao salvar configurações de pagamento externo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard padding="20px">
      <SectionTitle>Pagamento externo</SectionTitle>
      <SectionDescription>
        Ative esta opção para direcionar usuários para uma página externa de pagamento da sua organização.
      </SectionDescription>

      {loading ? (
        <Message $variant="muted">Carregando configurações...</Message>
      ) : (
        <>
          <FormGrid>
            <ToggleRow>
              <ToggleInput
                type="checkbox"
                checked={form.externalPaymentEnabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    externalPaymentEnabled: event.target.checked,
                  }))
                }
              />
              Habilitar pagamento externo
            </ToggleRow>

            <Input
              label="URL de pagamento externo"
              placeholder="https://..."
              value={form.externalPaymentUrl}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  externalPaymentUrl: event.target.value,
                }))
              }
              error={urlError || undefined}
            />

            <Input
              label="Rótulo do botão"
              placeholder="Ex.: Pagar agora"
              value={form.externalPaymentLabel}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  externalPaymentLabel: event.target.value,
                }))
              }
              maxLength={120}
            />
          </FormGrid>

          <Actions>
            <Button onClick={handleSave} isLoading={saving} disabled={Boolean(urlError)}>
              Salvar configurações
            </Button>
            <Button variant="ghost" onClick={fetchSettings} disabled={saving}>
              Recarregar
            </Button>
          </Actions>
        </>
      )}

      {error && <Message $variant="error">{error}</Message>}
      {success && <Message $variant="success">{success}</Message>}
    </SettingsCard>
  );
}
