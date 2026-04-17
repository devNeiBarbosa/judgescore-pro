'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';
import Input from '@/src/components/ui/input';
import Button from '@/src/components/ui/button';
import Card from '@/src/components/ui/card';
import Logo from '@/src/components/ui/logo';
import { maskCPF, maskPhone } from '@/lib/utils';
import { validatePassword, validateCPF } from '@/lib/validation';

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
  max-width: 520px;
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

const GoldText = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
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

const InviteInfo = styled.div<{ $valid: boolean }>`
  text-align: center;
  font-size: 0.8125rem;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  background: ${({ $valid }) =>
    $valid ? 'rgba(0,230,118,0.12)' : 'rgba(255,61,61,0.12)'};
  color: ${({ $valid }) => ($valid ? '#00E676' : '#FF3D3D')};
  border: 0.5px solid
    ${({ $valid }) =>
      $valid ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,61,0.3)'};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ErrorMsg = styled.div`
  background: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'}15;
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
  padding: 12px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  font-size: 0.8125rem;
  text-align: center;
  margin-bottom: 8px;
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

const PasswordRules = styled.ul`
  list-style: none;
  padding: 0;
  margin: -10px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RuleItem = styled.li<{ $met: boolean }>`
  font-size: 0.75rem;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  color: ${({ $met, theme }) =>
    $met ? '#22C55E' : (theme?.colors?.textMuted ?? '#606060')};
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '${({ $met }) => ($met ? '✓' : '○')}';
    font-size: 0.7rem;
  }
`;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = (searchParams.get('token') ?? '').trim();
  const { status } = useSession();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    birthDate: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') {
      router.replace('/dashboard');
    }
    return null;
  }

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e?.target?.value ?? '';

      if (field === 'cpf') {
        value = maskCPF(value);
      } else if (field === 'phone') {
        value = maskPhone(value);
      }

      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwResult = validatePassword(formData.password ?? '');
    if (!pwResult.valid) {
      setError(pwResult.errors[0]);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const cpfClean = (formData.cpf ?? '').replace(/\D/g, '');
    if (cpfClean && !validateCPF(cpfClean)) {
      setError('CPF inválido. Verifique os dígitos.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
  credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name ?? '',
          email: formData.email ?? '',
          password: formData.password ?? '',
          cpf: cpfClean || undefined,
          phone: (formData.phone ?? '').replace(/\D/g, '') || undefined,
          birthDate: formData.birthDate || undefined,
          token: inviteToken || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? 'Erro ao cadastrar');
        return;
      }

      const result = await signIn('credentials', {
        email: formData.email ?? '',
        password: formData.password ?? '',
        redirect: false,
      });

      if (result?.error) {
        setError('Conta criada! Faça login.');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const passwordValue = formData.password ?? '';
  const digits = passwordValue.replace(/\D/g, '');
  const hasMinLen = passwordValue.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue);
  const hasLower = /[a-z]/.test(passwordValue);
  const hasDigit = /\d/.test(passwordValue);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passwordValue);

  const noSeqCheck =
    digits.length <= 1 ||
    !(() => {
      let asc = true;
      let desc = true;

      for (let i = 1; i < digits.length; i += 1) {
        if (parseInt(digits[i], 10) - parseInt(digits[i - 1], 10) !== 1) {
          asc = false;
        }
        if (parseInt(digits[i], 10) - parseInt(digits[i - 1], 10) !== -1) {
          desc = false;
        }
      }

      return asc || desc;
    })();

  return (
    <PageWrapper>
      <FormCard>
        <Card padding="40px">
          <LogoBlock onClick={() => router.push('/')}>
            <Logo type="vertical" variant="dark" height={120} />
          </LogoBlock>

          <Title>
            CRIAR <GoldText>CONTA</GoldText>
          </Title>

          <Subtitle>
            {inviteToken
              ? 'Cadastro com convite detectado'
              : 'Cadastro direto: sua organização será criada automaticamente'}
          </Subtitle>

          {inviteToken && (
            <InviteInfo $valid>
              Convite detectado. Complete seu cadastro.
            </InviteInfo>
          )}

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Form onSubmit={handleSubmit}>
            <Input
              label="Nome Completo"
              placeholder="Seu nome completo"
              icon={<User size={18} />}
              value={formData.name ?? ''}
              onChange={handleChange('name')}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail size={18} />}
              value={formData.email ?? ''}
              onChange={handleChange('email')}
              required
            />

            <Row>
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                value={formData.cpf ?? ''}
                onChange={handleChange('cpf')}
                maxLength={14}
              />

              <Input
                label="Telefone"
                placeholder="(00) 00000-0000"
                icon={<Phone size={18} />}
                value={formData.phone ?? ''}
                onChange={handleChange('phone')}
                maxLength={15}
              />
            </Row>

            <Row>
              <Input
                label="Data de Nascimento"
                type="date"
                icon={<Calendar size={18} />}
                value={formData.birthDate ?? ''}
                onChange={handleChange('birthDate')}
              />
            </Row>

            <PasswordField>
              <Input
                label="Senha"
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                icon={<Lock size={18} />}
                value={formData.password ?? ''}
                onChange={handleChange('password')}
                required
              />

              <TogglePassword
                type="button"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </TogglePassword>
            </PasswordField>

            {passwordValue.length > 0 && (
              <PasswordRules>
                <RuleItem $met={hasMinLen}>Mínimo 8 caracteres</RuleItem>
                <RuleItem $met={hasUpper}>1 letra maiúscula</RuleItem>
                <RuleItem $met={hasLower}>1 letra minúscula</RuleItem>
                <RuleItem $met={hasDigit && noSeqCheck}>
                  1 número (sem sequência simples)
                </RuleItem>
                <RuleItem $met={hasSpecial}>
                  1 caractere especial (@, !, #, $)
                </RuleItem>
              </PasswordRules>
            )}

            <Input
              label="Confirmar Senha"
              type={showPass ? 'text' : 'password'}
              placeholder="Repita a senha"
              icon={<Lock size={18} />}
              value={formData.confirmPassword ?? ''}
              onChange={handleChange('confirmPassword')}
              required
            />

            <Button type="submit" fullWidth isLoading={loading} size="lg">
              Cadastrar
            </Button>
          </Form>

          <LinkText>
            Já tem uma conta?{' '}
            <LinkBtn onClick={() => router.push('/login')}>Entrar</LinkBtn>
          </LinkText>
        </Card>
      </FormCard>
    </PageWrapper>
  );
}