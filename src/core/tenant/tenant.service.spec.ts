import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import type { Tenant } from '../auth/auth.types';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { ThemeService } from '../theme/theme.service';
import { createClientMock, createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { TenantService } from './tenant.service';

const tenant = { id: 't1', name: 'Old', primary_hex: '#111111' } as Tenant;

describe('TenantService', () => {
  let service: TenantService;
  let tenants: QueryMock;
  let tenantSignal: ReturnType<typeof signal<Tenant | null>>;
  let patchTenant: jasmine.Spy;
  let theme: jasmine.SpyObj<ThemeService>;

  const setup = (initial: Tenant | null, result: Parameters<typeof createQueryMock>[0] = { error: null }) => {
    tenants = createQueryMock(result);
    tenantSignal = signal(initial);
    patchTenant = jasmine.createSpy('patchTenant').and.callFake((patch: Partial<Tenant>) =>
      tenantSignal.update(t => (t ? { ...t, ...patch } : t)),
    );
    theme = jasmine.createSpyObj('ThemeService', ['applyFromTenant']);
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: createClientMock({ tenants }) },
        { provide: AuthService, useValue: { tenant: tenantSignal, patchTenant } },
        { provide: ThemeService, useValue: theme },
      ],
    });
    service = TestBed.inject(TenantService);
  };

  it('exposes the tenant held by AuthService', () => {
    setup(tenant);
    expect(service.tenant()).toEqual(tenant);
  });

  it('refuses to update when no tenant is loaded', async () => {
    setup(null);
    expect(await service.update({ name: 'X' })).toBe('No tenant loaded');
    expect(tenants['update']).not.toHaveBeenCalled();
  });

  it('writes the patch, updates auth state and re-applies the theme', async () => {
    setup(tenant);
    expect(await service.update({ primary_hex: '#222222' })).toBeNull();
    expect(tenants['update']).toHaveBeenCalledWith({ primary_hex: '#222222' });
    expect(tenants['eq']).toHaveBeenCalledWith('id', 't1');
    expect(patchTenant).toHaveBeenCalledWith({ primary_hex: '#222222' });
    expect(theme.applyFromTenant).toHaveBeenCalledWith(jasmine.objectContaining({ primary_hex: '#222222' }));
  });

  it('leaves auth state and theme untouched when the write fails', async () => {
    setup(tenant, { error: { message: 'rls' } });
    expect(await service.update({ name: 'New' })).toBe('rls');
    expect(patchTenant).not.toHaveBeenCalled();
    expect(theme.applyFromTenant).not.toHaveBeenCalled();
  });
});
