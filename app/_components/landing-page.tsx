'use client';

import React from 'react';
import styled from 'styled-components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Users, BarChart3, Award, ArrowRight, Dumbbell, Zap } from 'lucide-react';
import MainLayout from '@/src/components/layout/main-layout';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Button from '@/src/components/ui/button';
import Logo from '@/src/components/ui/logo';

const HeroSection = styled.section`
  position: relative;
  padding: 100px 0 80px;
  text-align: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -40%;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}08 0%, transparent 60%);
    pointer-events: none;
  }
`;

const HeroLogoWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
`;

const HeroTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 20px;
  letter-spacing: 3px;
  position: relative;

  @media (min-width: 768px) {
    font-size: 3.5rem;
  }
`;

const GoldText = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const HeroSubtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  max-width: 560px;
  margin: 0 auto 40px;
  line-height: 1.7;
  letter-spacing: 0;
  text-transform: none;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  font-weight: 400;
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
`;

const Divider = styled.div`
  width: 60px;
  height: 2px;
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  margin: 0 auto 48px;
`;

const FeaturesSection = styled.section`
  padding: 80px 0;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border-top: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 3px;
`;

const SectionSubtitle = styled.p`
  text-align: center;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  font-size: 0.875rem;
  margin-bottom: 48px;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FeatureIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}10;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 0.5px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}20;
`;

const FeatureTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: 2px;
`;

const FeatureDesc = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  line-height: 1.6;
  font-family: ${({ theme }) => theme?.fonts?.body ?? 'Inter, sans-serif'};
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
`;

const CTASection = styled.section`
  padding: 100px 0;
  text-align: center;
`;

const CTACard = styled.div`
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  padding: 56px 32px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}, transparent);
  }
`;

const features = [
  { icon: Zap, title: 'Campeonatos', desc: 'Gerencie todos os aspectos dos seus campeonatos de forma centralizada e profissional.' },
  { icon: Users, title: 'Inscrições', desc: 'Sistema completo de pré-inscrição, pesagem e confirmação de atletas.' },
  { icon: Shield, title: 'Julgamento', desc: 'Painel dedicado para árbitros com sistema de votação preciso e transparente.' },
  { icon: BarChart3, title: 'Resultados', desc: 'Cálculo automático de pontuação, desempate e classificação em tempo real.' },
  { icon: Award, title: 'Categorias', desc: 'Configuração flexível de categorias com critérios personalizados.' },
  { icon: Dumbbell, title: 'Área do Atleta', desc: 'Painel exclusivo para atletas acompanharem suas inscrições e resultados.' },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleCTA = () => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    } else {
      router.push('/registro');
    }
  };

  return (
    <MainLayout>
      <HeroSection>
        <Container>
          <HeroLogoWrap>
            <Logo variant="primary-dark" vertical height={120} />
          </HeroLogoWrap>
          <HeroTitle>
            GESTÃO <GoldText>PROFISSIONAL</GoldText> DE<br />
            CAMPEONATOS
          </HeroTitle>
          <HeroSubtitle>
            Plataforma completa para organizar campeonatos, gerenciar inscrições,
            conduzir julgamentos e publicar resultados com precisão e transparência.
          </HeroSubtitle>
          <HeroButtons>
            <Button size="lg" onClick={handleCTA} icon={<ArrowRight size={18} />}>
              {status === 'authenticated' ? 'Ir para Dashboard' : 'Começar Agora'}
            </Button>
            {status !== 'authenticated' && (
              <Button variant="outline" size="lg" onClick={() => router.push('/login')}>
                Já tenho conta
              </Button>
            )}
          </HeroButtons>
        </Container>
      </HeroSection>

      <FeaturesSection>
        <Container>
          <SectionTitle>TUDO EM UM SÓ <GoldText>LUGAR</GoldText></SectionTitle>
          <SectionSubtitle>Ferramentas projetadas para operação real no dia do evento</SectionSubtitle>
          <Divider />
          <FeaturesGrid>
            {(features ?? []).map((f: any, i: number) => (
              <Card key={i} hoverable>
                <FeatureIcon>
                  {f?.icon && <f.icon size={24} />}
                </FeatureIcon>
                <FeatureTitle>{f?.title ?? ''}</FeatureTitle>
                <FeatureDesc>{f?.desc ?? ''}</FeatureDesc>
              </Card>
            ))}
          </FeaturesGrid>
        </Container>
      </FeaturesSection>

      <CTASection>
        <Container>
          <CTACard>
            <SectionTitle>PRONTO PARA O <GoldText>PALCO</GoldText>?</SectionTitle>
            <HeroSubtitle>
              Cadastre-se gratuitamente e comece a configurar seu próximo evento.
            </HeroSubtitle>
            <Button size="lg" onClick={handleCTA} icon={<ArrowRight size={18} />}>
              {status === 'authenticated' ? 'Acessar Dashboard' : 'Criar Conta Gratuita'}
            </Button>
          </CTACard>
        </Container>
      </CTASection>
    </MainLayout>
  );
}
