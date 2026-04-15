'use client';

import React from 'react';

type LogoVariant = 'dark' | 'light';
type LogoType = 'primary' | 'vertical' | 'icon';

interface LogoProps {
  variant?: LogoVariant;
  type?: LogoType;
  height?: number;
  className?: string;
  alt?: string;
}

const LOGO_MAP: Record<LogoType, Record<LogoVariant, string>> = {
  primary: {
    dark: '/assets/logo/logo-primary-dark.png',
    light: '/assets/logo/logo-primary-light.jpg',
  },
  vertical: {
    dark: '/assets/logo/logo-vertical-dark.png',
    light: '/assets/logo/logo-vertical-dark.png',
  },
  icon: {
    dark: '/assets/logo/icon-symbol.png',
    light: '/assets/logo/icon-symbol.png',
  },
};

export default function Logo({
  variant = 'dark',
  type = 'primary',
  height = 40,
  className = '',
  alt = 'JUDGESCORE PRO',
}: LogoProps) {
  const src = LOGO_MAP[type][variant];

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      height={height}
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
      draggable={false}
    />
  );
}