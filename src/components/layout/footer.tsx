'use client';

import React from 'react';
import styled from 'styled-components';
import Container from '@/src/components/ui/container';
import Logo from '@/src/components/ui/logo';

const FooterWrapper = styled.footer`
  border-top: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  background: ${({ theme }) => theme?.colors?.background ?? '#050505'};
  padding: 32px 0;
  margin-top: auto;
`;

const FooterInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 640px) {
    flex-direction: column;
    text-align: center;
  }
`;

const FooterText = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  letter-spacing: 1px;
  text-transform: uppercase;
`;

export default function Footer() {
  return (
    <FooterWrapper>
      <Container>
        <FooterInner>
          {/* 🔥 CORRETO */}
          <Logo type="primary" height={42} />

          <FooterText>
            Gestão profissional de campeonatos de fisiculturismo
          </FooterText>
        </FooterInner>
      </Container>
    </FooterWrapper>
  );
}