'use client';

import React from 'react';
import styled from 'styled-components';

interface CardProps {
  children: React.ReactNode;
  padding?: string;
  hoverable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const StyledCard = styled.div<{ $hoverable: boolean; $padding: string }>`
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  padding: ${({ $padding }) => $padding};
  transition: all 0.25s ease;
  ${({ $hoverable, theme }) =>
    $hoverable
      ? `
    cursor: pointer;
    &:hover {
      border-color: ${theme?.colors?.borderLight ?? '#333333'};
      background: ${theme?.colors?.surfaceLight ?? '#161616'};
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
  `
      : ''}
`;

export default function Card({
  children,
  padding = '24px',
  hoverable = false,
  className,
  style,
  onClick,
}: CardProps) {
  return (
    <StyledCard $hoverable={hoverable} $padding={padding} className={className} style={style} onClick={onClick}>
      {children}
    </StyledCard>
  );
}
