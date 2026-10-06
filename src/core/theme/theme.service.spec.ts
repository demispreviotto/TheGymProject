import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import type { Tenant } from '../auth/auth.types';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let root: HTMLElement;
  const prop = (name: string) => root.style.getPropertyValue(name);

  beforeEach(() => {
    service = TestBed.inject(ThemeService);
    root = TestBed.inject(DOCUMENT).documentElement;
  });

  afterEach(() => {
    for (const k of ['primary', 'hover', 'highlight', 'shadow', 'contrast']) {
      root.style.removeProperty(`--tenant-${k}`);
    }
  });

  describe('hexToHsl', () => {
    it('converts primary colours', () => {
      expect(service.hexToHsl('#FF0000')).toEqual({ h: 0, s: 100, l: 50 });
      expect(service.hexToHsl('#00FF00')).toEqual({ h: 120, s: 100, l: 50 });
      expect(service.hexToHsl('#0000FF')).toEqual({ h: 240, s: 100, l: 50 });
    });

    it('accepts hex with or without #, any case', () => {
      expect(service.hexToHsl('ef4444')).toEqual(service.hexToHsl('#EF4444'));
    });

    it('returns zero hue and saturation for greys, black and white', () => {
      expect(service.hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 });
      expect(service.hexToHsl('#FFFFFF')).toEqual({ h: 0, s: 0, l: 100 });
      expect(service.hexToHsl('#808080')).toEqual({ h: 0, s: 0, l: 50 });
    });

    it('wraps negative hues into 0-359', () => {
      // #FF0080 is rose: raw hue is negative before wrapping
      expect(service.hexToHsl('#FF0080').h).toBe(330);
    });

    it('converts the default tenant red', () => {
      expect(service.hexToHsl('#EF4444')).toEqual({ h: 0, s: 84, l: 60 });
    });
  });

  describe('applyHex', () => {
    it('sets all tenant tokens from the HSL value', () => {
      service.applyHex('#EF4444'); // h0 s84 l60
      expect(prop('--tenant-primary')).toBe('0 84% 60%');
      expect(prop('--tenant-hover')).toBe('0 84% 50%');
      expect(prop('--tenant-highlight')).toBe('0 84% 100%');
      expect(prop('--tenant-shadow')).toBe('0 84% 30%');
    });

    it('clamps hover/shadow at 0 and highlight at 100', () => {
      service.applyHex('#000000');
      expect(prop('--tenant-hover')).toBe('0 0% 0%');
      expect(prop('--tenant-shadow')).toBe('0 0% 0%');
      expect(prop('--tenant-highlight')).toBe('0 0% 40%');
      service.applyHex('#FFFFFF');
      expect(prop('--tenant-highlight')).toBe('0 0% 100%');
    });

    it('uses dark contrast text only when lightness is above 60', () => {
      service.applyHex('#FFFFFF');
      expect(prop('--tenant-contrast')).toBe('0 0% 0%');
      service.applyHex('#000000');
      expect(prop('--tenant-contrast')).toBe('0 0% 100%');
      service.applyHex('#EF4444'); // l = 60 exactly -> not > 60
      expect(prop('--tenant-contrast')).toBe('0 0% 100%');
    });
  });

  describe('applyFromTenant', () => {
    it('uses the tenant primary colour', () => {
      service.applyFromTenant({ primary_hex: '#0000FF' } as Tenant);
      expect(prop('--tenant-primary')).toBe('240 100% 50%');
    });

    it('falls back to the default red when there is no tenant', () => {
      service.applyFromTenant(null);
      expect(prop('--tenant-primary')).toBe('0 84% 60%');
    });
  });
});
