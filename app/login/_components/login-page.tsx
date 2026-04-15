'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Input from '@/src/components/ui/input';
import Button from '@/src/components/ui/button';
import Card from '@/src/components/ui/card';
import Logo from '@/src/components/ui/logo';

const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${({ theme }) => theme?.colors?.background ?? '#050505'};
`;

const FormCard = styled.div`
  width: 100%;
  max-width: 440px;
`;

const LogoBlock = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  cursor: pointer;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
  letter-spacing: 2px;
`;

const Subtitle = styled.p`
  text-align: center;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  margin-bottom: 32px;
  font-size: 0.875rem;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ErrorMsg = styled.div`
  background: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'}15;
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  padding: 12px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  font-size: 0.8125rem;
  text-align: center;
  border: 0.5px solid ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'}30;
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 24px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
`;

const LinkBtn = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  cursor: pointer;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

const PasswordField = styled.div`
  position: relative;
`;

const TogglePassword = styled.button`
  position: absolute;
  right: 14px;
  bottom: 12px;
  background: none;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  display: flex;
  padding: 4px;
`;

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // redirecionamento se já logado
  if (status === 'authenticated') {
    if (typeof window !== 'undefined') {
      if (session?.user?.mustChangePassword) {
        router.replace('/first-access');
      } else {
        router.replace('/dashboard');
      }
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou senha inválidos');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <FormCard>
        <Card padding="40px">
          <LogoBlock onClick={() => router.push('/')}>
            {/* ✅ CORRETO (NOVO PADRÃO) */}
            <Logo type="vertical" variant="dark" height={120} />
          </LogoBlock>

          <Title>BEM-VINDO DE VOLTA</Title>

          <Subtitle>
            Entre na sua conta do JUDGESCORE PRO para continuar
          </Subtitle>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              required
            />

            <PasswordField>
              <Input
                label="Senha"
                type={showPass ? 'text' : 'password'}
                placeholder="Sua senha"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
              />

              <TogglePassword
                type="button"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </TogglePassword>
            </PasswordField>

            <Button type="submit" fullWidth isLoading={loading} size="lg">
              Entrar
            </Button>
          </Form>

          <LinkText>
            Não tem uma conta?{' '}
            <LinkBtn onClick={() => router.push('/registro')}>
              Cadastre-se
            </LinkBtn>
          </LinkText>
        </Card>
      </FormCard>
    </PageWrapper>
  );
}