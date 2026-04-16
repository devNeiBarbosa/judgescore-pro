'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';

export interface PublicChampionshipItem {
  name: string;
  priceInCents: number;
  description: string | null;
  imageUrl: string | null;
}

interface ChampionshipItemsPublicListProps {
  items: PublicChampionshipItem[];
  externalPaymentEnabled?: boolean;
  externalPaymentUrl?: string | null;
  externalPaymentLabel?: string | null;
}

const ListWrapper = styled.div`
  display: grid;
  gap: 14px;
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ExternalPaymentButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '10px'};
  border: 1px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  color: ${({ theme }) => theme?.colors?.background ?? '#000000'};
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`;

const ListGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Card = styled.article`
  border: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  border-radius: ${({ theme }) => theme?.radii?.lg ?? '12px'};
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  overflow: hidden;
`;

const Image = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
  background: #151515;
`;

const Content = styled.div`
  padding: 14px;
`;

const Name = styled.h3`
  font-size: 1rem;
  margin-bottom: 8px;
`;

const Price = styled.p`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  margin-bottom: 10px;
`;

const Description = styled.p`
  font-size: 0.86rem;
  line-height: 1.55;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

const FALLBACK_IMAGE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='480' viewBox='0 0 800 480'%3E%3Crect width='800' height='480' fill='%23181818'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%23919191' font-family='Arial%2Csans-serif' font-size='28'%3EImagem indispon%C3%ADvel%3C/text%3E%3C/svg%3E";

function formatPriceInBRL(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizeExternalHttpUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export default function ChampionshipItemsPublicList({
  items,
  externalPaymentEnabled = false,
  externalPaymentUrl,
  externalPaymentLabel,
}: ChampionshipItemsPublicListProps) {
  const [failedIndexes, setFailedIndexes] = useState<Record<number, boolean>>({});

  const renderedItems = useMemo(
    () =>
      items.map((item, index) => {
        const hasFailed = Boolean(failedIndexes[index]);
        const imageSrc = !hasFailed && item.imageUrl?.trim() ? item.imageUrl : FALLBACK_IMAGE_SVG;

        return {
          key: `${item.name}-${index}`,
          imageSrc,
          item,
          index,
        };
      }),
    [failedIndexes, items],
  );

  const safeExternalPaymentUrl = useMemo(
    () => normalizeExternalHttpUrl(externalPaymentUrl),
    [externalPaymentUrl],
  );

  const shouldShowExternalPaymentButton = externalPaymentEnabled && Boolean(safeExternalPaymentUrl);
  const externalPaymentButtonLabel =
    externalPaymentLabel?.trim() && externalPaymentLabel.trim().length > 0
      ? externalPaymentLabel.trim()
      : 'Inscrever-se';

  return (
    <ListWrapper>
      {shouldShowExternalPaymentButton && safeExternalPaymentUrl ? (
        <ListHeader>
          <ExternalPaymentButton href={safeExternalPaymentUrl} target="_blank" rel="noopener">
            {externalPaymentButtonLabel}
          </ExternalPaymentButton>
        </ListHeader>
      ) : null}

      <ListGrid>
        {renderedItems.map(({ key, imageSrc, item, index }) => (
          <Card key={key}>
            <Image
              src={imageSrc}
              alt={item.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailedIndexes((prev) => ({ ...prev, [index]: true }))}
            />
            <Content>
              <Name>{item.name}</Name>
              <Price>{formatPriceInBRL(item.priceInCents)}</Price>
              <Description>{item.description?.trim() || 'Sem descrição para este item.'}</Description>
            </Content>
          </Card>
        ))}
      </ListGrid>
    </ListWrapper>
  );
}
