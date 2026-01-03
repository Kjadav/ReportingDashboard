'use client';

import Image from 'next/image';
import { cn } from '@/src/lib/utils';

interface MedulaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function MedulaLogo({ className, size = 'md' }: MedulaLogoProps) {
  const sizes = {
    sm: { width: 100, height: 24 },
    md: { width: 130, height: 32 },
    lg: { width: 160, height: 40 },
    xl: { width: 200, height: 50 },
  };

  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/medula-logo.png"
        alt="Medula"
        width={sizes[size].width}
        height={sizes[size].height}
        className="object-contain"
        priority
      />
    </div>
  );
}

export function MedulaLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-8 h-8', className)}
    >
      <defs>
        <linearGradient id="medula-m-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" fill="#1a1625" />
      <path
        d="M8 30V14L14 22L20 14L20 30"
        stroke="url(#medula-m-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20 30V14L26 22L32 14V30"
        stroke="url(#medula-m-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
