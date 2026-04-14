'use client';

import React from 'react';

type LogoVariant = 'primary-dark' | 'primary-light' | 'transparent-dark' | 'transparent-light';

interface LogoProps {
  variant?: LogoVariant;
  height?: number;
  className?: string;
  vertical?: boolean;
  alt?: string;
}

const LOGO_ASSET_BY_VARIANT: Record<LogoVariant, string> = {
  'primary-dark': '/assets/logo/logo-primary-dark.jpg',
  'primary-light': '/assets/logo/logo-primary-light.jpg',
  'transparent-dark': '/assets/logo/logo-transparent-dark.png',
  'transparent-light': '/assets/logo/logo-transparent-light.png',
};

const LOGO_VERTICAL_ASSET_BY_VARIANT: Partial<Record<LogoVariant, string>> = {
  'primary-dark': '/assets/logo/logo-vertical-dark.jpg',
};

const FALLBACK_ICON = '/assets/logo/icon-symbol.png';

export default function Logo({
  variant = 'primary-dark',
  height = 40,
  className,
  vertical = false,
  alt = 'JUDGESCORE PRO',
}: LogoProps) {
  const src =
    (vertical ? LOGO_VERTICAL_ASSET_BY_VARIANT[variant] : undefined) ??
    LOGO_ASSET_BY_VARIANT[variant] ??
    FALLBACK_ICON;

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
      onError={(event) => {
        const target = event.currentTarget;
        if (target.src.endsWith(FALLBACK_ICON)) return;
        target.src = FALLBACK_ICON;
      }}
      draggable={false}
    />
  );
}
