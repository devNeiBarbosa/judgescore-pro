'use client';

import styled from 'styled-components';

export interface PublicChampionship {
  name: string;
  description: string | null;
  date: string;
  venue: string | null;
  externalPaymentEnabled?: boolean;
  externalPaymentUrl?: string | null;
  externalPaymentLabel?: string | null;
}

interface ChampionshipPublicViewProps {
  championship: PublicChampionship;
}

const Card = styled.section`
  border: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.lg ?? '12px'};
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  padding: 24px;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  letter-spacing: 1px;
  margin-bottom: 12px;
`;

const Details = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
`;

const DetailLine = styled.p`
  font-size: 0.92rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

const Description = styled.p`
  font-size: 0.95rem;
  line-height: 1.65;
  color: ${({ theme }) => theme?.colors?.text ?? '#FFFFFF'};
  white-space: pre-line;
`;

function formatDate(date: string): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
  }).format(parsed);
}

export default function ChampionshipPublicView({ championship }: ChampionshipPublicViewProps) {
  return (
    <Card>
      <Title>{championship.name}</Title>

      <Details>
        <DetailLine>
          <strong>Data:</strong> {formatDate(championship.date)}
        </DetailLine>
        <DetailLine>
          <strong>Local:</strong> {championship.venue?.trim() || 'Local não informado'}
        </DetailLine>
      </Details>

      <Description>{championship.description?.trim() || 'Descrição não informada.'}</Description>
    </Card>
  );
}
