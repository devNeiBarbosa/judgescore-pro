'use client';

import React from 'react';
import styled from 'styled-components';

import Container from '@/src/components/ui/container';

interface Plan {
  name: string;
  badge?: string;
  price: string;
  description: string;
  features: string[];
  buttonLabel: string;
  buttonLink?: string;
  highlight?: boolean;
}

const Section = styled.section`
  padding: 80px 0;
  background: ${({ theme }) => theme?.colors?.backgroundLight ?? '#0A0A0A'};
  border-top: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-bottom: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 3px;
  margin-bottom: 12px;
`;

const GoldText = styled.span`
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const SectionSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#707070'};
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: ${({ theme }) => theme?.breakpoints?.md ?? '768px'}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
  }
`;

const PlanCard = styled.article<{ $highlight?: boolean }>`
  position: relative;
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border: 1px solid
    ${({ theme, $highlight }) => ($highlight ? theme?.colors?.gold ?? '#FFD700' : theme?.colors?.border ?? '#222222')};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.25s ease;
  transform: ${({ $highlight }) => ($highlight ? 'scale(1.02)' : 'scale(1)')};

  &:hover {
    border-color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    background: ${({ theme }) => theme?.colors?.surfaceLight ?? '#171717'};
    box-shadow: ${({ theme }) => theme?.shadows?.glow ?? '0 0 20px rgba(212, 175, 55, 0.25)'};
  }
`;

const Badge = styled.span`
  align-self: flex-start;
  font-size: 0.68rem;
  letter-spacing: 1px;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 4px 10px;
  color: #0f0f0f;
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const PlanName = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0;
`;

const PlanPrice = styled.p`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
`;

const PlanDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

const FeaturesList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
`;

const FeatureItem = styled.li`
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
  font-size: 0.875rem;
  line-height: 1.5;
`;

const PlanButton = styled.a<{ $highlight?: boolean }>`
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: ${({ theme }) => theme?.radii?.sm ?? '6px'};
  padding: 10px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  border: 1px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  color: ${({ $highlight }) => ($highlight ? '#0F0F0F' : '#FFD700')};
  background: ${({ $highlight, theme }) => ($highlight ? theme?.colors?.gold ?? '#FFD700' : 'transparent')};
`;

const plans: Plan[] = [
  {
    name: 'Single',
    price: 'R$ 6.700 / mês',
    description: 'Para eventos pequenos ou testes',
    features: [
      'Até 2 campeonatos por ciclo',
      'Gestão básica de atletas',
      'Categorias',
      'Página pública',
      'Painel administrativo',
    ],
    buttonLabel: 'Começar agora',
    buttonLink: '/registro',
  },
  {
    name: 'Premium',
    badge: 'Mais popular',
    price: 'R$ 5.000 / mês',
    description: 'Ideal para organizações profissionais',
    features: [
      'Campeonatos ilimitados',
      'Gestão completa',
      'Arbitragem',
      'Itens e monetização',
      'Painel completo',
      'Melhor custo-benefício',
    ],
    buttonLabel: 'Escolher plano',
    buttonLink: '/registro',
    highlight: true,
  },
  {
    name: 'Business',
    price: 'R$ 51.900 / ano',
    description: 'Para operações maiores',
    features: [
      'Tudo do Premium',
      'Branding liberado',
      'Operação anual',
      'Prioridade máxima',
    ],
    buttonLabel: 'Falar no WhatsApp',
    buttonLink:
      'https://wa.me/5581991003501?text=Olá! Vim pelo site da Judgescore Pro e quero saber mais sobre o plano Business.',
  },
];

export default function PricingPlans() {
  return (
    <Section>
      <Container>
        <SectionHeader>
          <SectionTitle>
            NOSSOS <GoldText>PLANOS</GoldText>
          </SectionTitle>
          <SectionSubtitle>Escolha a opção ideal para a sua organização.</SectionSubtitle>
        </SectionHeader>

        <PlansGrid>
          {plans.map((plan) => (
            <PlanCard key={plan.name} $highlight={plan.highlight}>
              {plan.badge && <Badge>{plan.badge}</Badge>}
              <PlanName>{plan.name}</PlanName>
              <PlanPrice>{plan.price}</PlanPrice>
              <PlanDescription>{plan.description}</PlanDescription>

              <FeaturesList>
                {plan.features.map((feature) => (
                  <FeatureItem key={feature}>{feature}</FeatureItem>
                ))}
              </FeaturesList>

              <PlanButton
                href={plan.buttonLink ?? '/registro'}
                $highlight={plan.highlight}
                target={plan.buttonLink?.startsWith('http') ? '_blank' : undefined}
                rel={plan.buttonLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {plan.buttonLabel}
              </PlanButton>
            </PlanCard>
          ))}
        </PlansGrid>
      </Container>
    </Section>
  );
}
