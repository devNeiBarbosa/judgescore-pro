'use client';

import React from 'react';
import styled from 'styled-components';
import Header from './header';
import Footer from './footer';

const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
`;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper>
      <Header />
      <Main>{children}</Main>
      <Footer />
    </LayoutWrapper>
  );
}
