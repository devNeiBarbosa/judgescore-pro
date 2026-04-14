'use client';

import React from 'react';
import styled from 'styled-components';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme?.colors?.textSecondary ?? '#A0A0A0'};
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const IconWrapper = styled.span`
  position: absolute;
  left: 14px;
  color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const StyledInput = styled.input<{ $hasIcon: boolean; $hasError: boolean }>`
  width: 100%;
  padding: 12px 16px;
  padding-left: ${({ $hasIcon }) => ($hasIcon ? '44px' : '16px')};
  background: ${({ theme }) => theme?.colors?.surface ?? '#0F0F0F'};
  color: ${({ theme }) => theme?.colors?.text ?? '#fff'};
  border: 0.5px solid ${({ $hasError, theme }) =>
    $hasError ? (theme?.colors?.error ?? '#FF3D3D') : (theme?.colors?.border ?? '#222222')};
  border-radius: ${({ theme }) => theme?.radii?.md ?? '8px'};
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme?.colors?.textMuted ?? '#606060'};
  }

  &:focus {
    border-color: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    box-shadow: 0 0 0 3px ${({ theme }) => theme?.colors?.goldGlow ?? 'rgba(255,215,0,0.15)'};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme?.colors?.error ?? '#FF3D3D'};
`;

export default function Input({
  label,
  error,
  icon,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase()?.replace?.(/\s/g, '-') ?? undefined;
  return (
    <Wrapper>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <InputContainer>
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <StyledInput
          id={inputId}
          $hasIcon={!!icon}
          $hasError={!!error}
          {...props}
        />
      </InputContainer>
      {error && <ErrorText>{error}</ErrorText>}
    </Wrapper>
  );
}
