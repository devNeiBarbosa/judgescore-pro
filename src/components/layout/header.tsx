'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, User, LayoutDashboard, Shield } from 'lucide-react';
import Container from '@/src/components/ui/container';
import Logo from '@/src/components/ui/logo';
import { ROLE_LABELS } from '@/lib/types';

const HeaderWrapper = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  background: #000000;
  border-bottom: 1px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
`;

const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
`;

const LogoLink = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 767px) {
    position: fixed;
    top: 68px;
    left: 0;
    right: 0;
    bottom: 0;
    flex-direction: column;
    background: ${({ theme }) => theme?.colors?.background ?? '#050505'}F5;
    padding: 24px;
    gap: 12px;
    transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
    transition: transform 0.3s ease;
  }
`;

const NavButton = styled.button<{ $variant?: 'primary' | 'ghost'; $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.2s ease;

  background: ${({ $variant, theme }) =>
    $variant === 'primary' ? (theme?.colors?.gold ?? '#FFD700') : 'transparent'};

  color: ${({ $variant, theme }) =>
    $variant === 'primary'
      ? (theme?.colors?.background ?? '#050505')
      : (theme?.colors?.textSecondary ?? '#A0A0A0')};

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === 'primary'
        ? (theme?.colors?.primaryDark ?? '#CCB000')
        : (theme?.colors?.surfaceLight ?? '#161616')};
    color: ${({ $variant, theme }) =>
      $variant === 'primary'
        ? (theme?.colors?.background ?? '#050505')
        : '#fff'};
  }
`;

const MenuToggle = styled.button`
  display: none;
  background: none;
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  padding: 8px;

  @media (max-width: 767px) {
    display: flex;
  }
`;

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuth = status === 'authenticated';

  const handleNav = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  return (
    <HeaderWrapper>
      <Container>
        <HeaderInner>
          <LogoLink onClick={() => handleNav('/')}>
            {/* 🔥 CORRETO */}
            <Logo type="primary" height={46} />
          </LogoLink>

          <MenuToggle onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </MenuToggle>

          <Nav $open={menuOpen}>
            {isAuth ? (
              <>
                <NavButton onClick={() => handleNav('/dashboard')}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </NavButton>

                <NavButton onClick={handleLogout}>
                  <LogOut size={16} />
                  Sair
                </NavButton>
              </>
            ) : (
              <>
                <NavButton onClick={() => handleNav('/login')}>
                  Entrar
                </NavButton>

                <NavButton $variant="primary" onClick={() => handleNav('/registro')}>
                  Cadastrar
                </NavButton>
              </>
            )}
          </Nav>
        </HeaderInner>
      </Container>
    </HeaderWrapper>
  );
}