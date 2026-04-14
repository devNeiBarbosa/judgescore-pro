'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';
import { theme } from '@/lib/theme';
import { GlobalStyles } from '@/lib/global-styles';
import StyledComponentsRegistry from '@/lib/styled-registry';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StyledComponentsRegistry>
        <SCThemeProvider theme={theme}>
          <GlobalStyles />
          {children}
        </SCThemeProvider>
      </StyledComponentsRegistry>
    </SessionProvider>
  );
}
