import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createClientMock, createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { ClientService } from './client.service';

describe('ClientService', () => {
  let service: ClientService;
  let tables: Record<string, QueryMock>;

  beforeEach(() => {
    tables = { profiles: createQueryMock({ data: [{ id: 'c1' }, { id: 'c2' }] }) };
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: createClientMock(tables) }],
    });
    service = TestBed.inject(ClientService);
  });

  it('loads the profiles whose tenant_id is the trainer user id', async () => {
    const clients = await service.loadForTrainer('trainer-1');

    expect(clients.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(tables['profiles']['eq']).toHaveBeenCalledWith('tenant_id', 'trainer-1');
  });

  it('leaves the trainer out and orders by name', async () => {
    await service.loadForTrainer('trainer-1');

    expect(tables['profiles']['neq']).toHaveBeenCalledWith('id', 'trainer-1');
    expect(tables['profiles']['order']).toHaveBeenCalledWith('name');
  });

  it('returns an empty list when the query yields nothing', async () => {
    tables['profiles'] = createQueryMock({ data: null });

    expect(await service.loadForTrainer('trainer-1')).toEqual([]);
  });
});
