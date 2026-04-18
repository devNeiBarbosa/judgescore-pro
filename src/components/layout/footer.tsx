'use client';

import React from 'react';
import styled from 'styled-components';
import Container from '@/src/components/ui/container';
import Logo from '@/src/components/ui/logo';

const FooterWrapper = styled.footer`
  border-top: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
  background: ${({ theme }) => theme?.colors?.background ?? '#050505'};
  padding: 40px 0 30px;
  margin-top: auto;
`;

const FooterInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;

  @media (max-width: 640px) {
    align-items: center;
    text-align: center;
  }
`;

const FooterInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CompanyName = styled.strong`
  font-size: 0.95rem;
  color: ${({ theme }) => theme?.colors?.text ?? '#FFFFFF'};
  letter-spacing: 0.8px;
`;

const FooterText = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  letter-spacing: 0.8px;
  text-transform: uppercase;
`;

const FooterMeta = styled.p`
  font-size: 0.78rem;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

export default function Footer() {
  return (
    <FooterWrapper>
      <Container>
        <FooterInner>
          <Logo type="primary" height={48} />

          <FooterInfo>
            <CompanyName>JUDGESCORE PRO</CompanyName>
            <FooterMeta>Todos os direitos reservados © 2024</FooterMeta>
            <FooterMeta>CNPJ: [preencher]</FooterMeta>
            <FooterText>Gestão profissional de campeonatos de fisiculturismo</FooterText>
          </FooterInfo>
        </FooterInner>
      </Container>
    </FooterWrapper>
  );
}
