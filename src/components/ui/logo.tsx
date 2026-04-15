'use client';

import React from 'react';

type LogoVariant = 'primary-dark' | 'primary-light';

type LogoType = 'primary' | 'vertical' | 'icon';

interface LogoProps {
  variant?: LogoVariant;
  type?: LogoType;
  height?: number;
  className?: string;
  alt?: string;
}

const LOGO_MAP = {
  primary: {
    'primary-dark': '/assets/logo/logo-primary-dark.png',
    'primary-light': '/assets/logo/logo-primary-light.png',
  },
  vertical: {
    'primary-dark': '/assets/logo/logo-vertical-dark.png',
    'primary-light': '/assets/logo/logo-vertical-light.png',
  },
  icon: {
    'primary-dark': '/assets/logo/icon-symbol.png',
    'primary-light': '/assets/logo/icon-symbol.png',
  },
};

export default function Logo({
  variant = 'primary-dark',
  type = 'primary',
  height = 40,
  className,
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