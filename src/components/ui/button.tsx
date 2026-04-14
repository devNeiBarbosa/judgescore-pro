'use client';

import React from 'react';
import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    color: ${({ theme }) => theme?.colors?.background ?? '#050505'};
    font-weight: 700;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme?.colors?.primaryDark ?? '#CCB000'};
      box-shadow: ${({ theme }) => theme?.shadows?.glow ?? '0 0 20px rgba(255,215,0,0.25)'};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
    color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
    border: 0.5px solid ${({ theme }) => theme?.colors?.border ?? '#222222'};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme?.colors?.surfaceHover ?? '#1C1C1C'};
      border-color: ${({ theme }) => theme?.colors?.borderLight ?? '#333333'};
    }
  `,
  outline: css`
    background: transparent;
    color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    border: 1px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
      color: ${({ theme }) => theme?.colors?.background ?? '#050505'};
      box-shadow: ${({ theme }) => theme?.shadows?.glow ?? '0 0 20px rgba(255,215,0,0.25)'};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme?.colors?.surfaceLight ?? '#161616'};
      color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
    color: #fff;
    &:hover:not(:disabled) {
      background: #E02020;
      box-shadow: 0 0 20px rgba(255, 61, 61, 0.3);
    }
  `,
};

const sizeStyles = {
  sm: css`
    padding: 8px 16px;
    font-size: 0.75rem;
  `,
  md: css`
    padding: 10px 24px;
    font-size: 0.8125rem;
  `,
  lg: css`
    padding: 14px 32px;
    font-size: 0.9375rem;
  `,
};

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  ${({ $variant }) => (variantStyles as Record<string, any>)[$variant] ?? variantStyles.primary}
  ${({ $size }) => (sizeStyles as Record<string, any>)[$size] ?? sizeStyles.md}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    outline-offset: 2px;
  }
`;

const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : icon}
      {children}
    </StyledButton>
  );
}
