'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';

const Wrap = styled.div`
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Form = styled.form`
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Msg = styled.p<{ $error?: boolean }>`
  font-size: 0.875rem;
  color: ${({ $error }) => ($error ? '#FF3D3D' : '#A0A0A0')};
`;

export default function FirstAccessPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (status === 'authenticated' && !session?.user?.mustChangePassword) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível atualizar a senha.');
        return;
      }

      await update({ mustChangePassword: false });
      setMessage('Senha alterada com sucesso. Redirecionando...');
      setTimeout(() => router.replace('/dashboard'), 900);
    } catch {
      setError('Erro de rede ao trocar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container>
        <Wrap>
          <Card padding="28px">
            <Form onSubmit={handleSubmit}>
              <h1>Troca de senha obrigatória</h1>
              <Msg>
                Por segurança, altere sua senha inicial antes de acessar o sistema.
              </Msg>
              {error && <Msg $error>{error}</Msg>}
              {message && <Msg>{message}</Msg>}

              <Input
                label="Senha atual"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="Nova senha"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button type="submit" isLoading={loading}>
                Salvar nova senha
              </Button>
            </Form>
          </Card>
        </Wrap>
      </Container>
    </MainLayout>
  );
}
