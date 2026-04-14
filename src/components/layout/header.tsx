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
  height: 68px;
`;

const LogoLink = styled.a`
  display: flex;
  align-items: center;
  cursor: pointer;
  text-decoration: none;
  flex-shrink: 0;
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
    $variant === 'primary' ? (theme?.colors?.background ?? '#050505') : (theme?.colors?.textSecondary ?? '#A0A0A0')};
  border-left: ${({ $active, theme }) =>
    $active ? `4px solid ${theme?.colors?.gold ?? '#FFD700'}` : '4px solid transparent'};

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === 'primary'
        ? (theme?.colors?.primaryDark ?? '#CCB000')
        : (theme?.colors?.surfaceLight ?? '#161616')};
    color: ${({ $variant, theme }) =>
      $variant === 'primary' ? (theme?.colors?.background ?? '#050505') : '#fff'};
    box-shadow: ${({ $variant, theme }) =>
      $variant === 'primary' ? (theme?.shadows?.glow ?? '0 0 20px rgba(255,215,0,0.25)') : 'none'};
  }

  @media (max-width: 767px) {
    width: 100%;
    justify-content: center;
    padding: 14px;
  }
`;

const MenuToggle = styled.button`
  display: none;
  background: none;
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  padding: 8px;

  @media (max-width: 767px) {
    display: flex;
    align-items: center;
  }
`;

const UserBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}15;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  text-transform: uppercase;
  border: 0.5px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}30;
`;

const ContextBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  border-radius: ${({ theme }) => theme?.radii?.full ?? '9999px'};
  background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}1A;
  color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
  border: 0.5px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'}40;
  text-transform: uppercase;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actingOrganizationName, setActingOrganizationName] = useState<string | null>(null);

  const isAuth = status === 'authenticated';
  const userRole = session?.user?.role ?? '';
  const userName = session?.user?.name ?? '';
  const actingOrganizationId = session?.user?.actingOrganizationId ?? null;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const routeContext = useMemo(() => {
    if (!pathname) return null;

    const segments = pathname.split('/').filter(Boolean);
    const championshipIndex = segments.indexOf('campeonatos');

    if (championshipIndex >= 0 && segments[championshipIndex + 1]) {
      const championshipId = segments[championshipIndex + 1];
      const categoryIndex = segments.indexOf('categories');
      const categoryId = categoryIndex >= 0 ? segments[categoryIndex + 1] : null;

      return {
        championshipId,
        categoryId,
      };
    }

    return null;
  }, [pathname]);

  useEffect(() => {
    if (!isSuperAdmin || !actingOrganizationId) {
      setActingOrganizationName(null);
      return;
    }

    let isMounted = true;

    fetch('/api/super-admin/organizations')
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        const organizations = Array.isArray(data?.organizations) ? data.organizations : [];
        return organizations.find((org: { id: string; name: string }) => org.id === actingOrganizationId) ?? null;
      })
      .then((organization) => {
        if (!isMounted) return;
        setActingOrganizationName(organization?.name ?? actingOrganizationId);
      })
      .catch(() => {
        if (!isMounted) return;
        setActingOrganizationName(actingOrganizationId);
      });

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin, actingOrganizationId]);

  const handleNav = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // intentionally non-blocking
    }
    await signOut({ callbackUrl: '/' });
  };

  return (
    <HeaderWrapper>
      <Container>
        <HeaderInner>
          <LogoLink onClick={() => handleNav('/')}>
            <Logo variant="primary-dark" height={36} />
          </LogoLink>
          <MenuToggle onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </MenuToggle>
          <Nav $open={menuOpen}>
            {isAuth ? (
              <>
                <UserBadge>
                  <User size={12} />
                  {userName || 'Usuário'}
                </UserBadge>
                {userRole && (
                  <UserBadge>{ROLE_LABELS[userRole] ?? userRole}</UserBadge>
                )}

                {isSuperAdmin && <ContextBadge>SUPER ADMIN</ContextBadge>}
                {isSuperAdmin && !actingOrganizationId && <ContextBadge>Global Mode</ContextBadge>}
                {isSuperAdmin && actingOrganizationId && (
                  <ContextBadge>{actingOrganizationName ? `Org: ${actingOrganizationName}` : `Org: ${actingOrganizationId}`}</ContextBadge>
                )}
                {isSuperAdmin && routeContext?.championshipId && (
                  <ContextBadge>Camp: {routeContext.championshipId}</ContextBadge>
                )}
                {isSuperAdmin && routeContext?.categoryId && (
                  <ContextBadge>Cat: {routeContext.categoryId}</ContextBadge>
                )}

                <NavButton $active onClick={() => handleNav('/dashboard')}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </NavButton>
                {(userRole === 'ARBITRO_AUXILIAR' || userRole === 'ARBITRO_CENTRAL') && (
                  <NavButton onClick={() => handleNav('/dashboard/judge')}>
                    <Shield size={16} />
                    Julgamento
                  </NavButton>
                )}
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <NavButton onClick={() => handleNav('/dashboard/admin')}>
                    <Shield size={16} />
                    Admin
                  </NavButton>
                )}
                {userRole === 'SUPER_ADMIN' && (
                  <NavButton onClick={() => handleNav('/super-admin')}>
                    <Shield size={16} />
                    Super Admin
                  </NavButton>
                )}
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
