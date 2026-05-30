import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Tenant } from '../auth/auth.types';

interface Hsl {
  h: number;
  s: number;
  l: number;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  applyFromTenant(tenant: Tenant | null): void {
    this.applyHex(tenant?.primary_hex ?? '#EF4444');
  }

  applyHex(hex: string): void {
    const { h, s, l } = this.hexToHsl(hex);
    const root = this.document.documentElement;

    root.style.setProperty('--tenant-primary',   `${h} ${s}% ${l}%`);
    root.style.setProperty('--tenant-hover',      `${h} ${s}% ${Math.max(0, l - 10)}%`);
    root.style.setProperty('--tenant-highlight',  `${h} ${s}% ${Math.min(100, l + 40)}%`);
    root.style.setProperty('--tenant-shadow',     `${h} ${s}% ${Math.max(0, l - 30)}%`);
    root.style.setProperty('--tenant-contrast',   l > 60 ? '0 0% 0%' : '0 0% 100%');
  }

  hexToHsl(hex: string): Hsl {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const l = (max + min) / 2;

    if (delta === 0) return { h: 0, s: 0, l: Math.round(l * 100) };

    const s = delta / (1 - Math.abs(2 * l - 1));

    let h = 0;
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
  }
}
