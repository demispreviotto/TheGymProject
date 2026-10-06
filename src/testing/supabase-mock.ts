export interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

export type QueryMock = Record<string, jasmine.Spy> & PromiseLike<QueryResult>;

/**
 * Chainable, awaitable stand-in for a Supabase query builder. Every method
 * (select, eq, insert, ...) returns the same builder; awaiting it yields `result`.
 * Spies are cached per method name so tests can assert on the arguments.
 *
 * Pass an array to script successive awaits on the same builder (e.g. an update
 * followed by a reload of the same table); the last entry repeats once exhausted.
 */
export function createQueryMock(
  result: QueryResult | QueryResult[] = { data: null, error: null },
): QueryMock {
  const queue = Array.isArray(result) ? [...result] : [result];
  const spies = new Map<string, jasmine.Spy>();
  const next = (): QueryResult => (queue.length > 1 ? queue.shift()! : queue[0]);

  const proxy: QueryMock = new Proxy({} as QueryMock, {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (value: QueryResult) => unknown) => resolve(next());
      }
      let spy = spies.get(prop);
      if (!spy) {
        spy = jasmine.createSpy(prop).and.callFake(() => proxy);
        spies.set(prop, spy);
      }
      return spy;
    },
  });
  return proxy;
}

/** Supabase client double whose `from(table)` returns the builder registered for that table. */
export function createClientMock(
  tables: Record<string, QueryMock>,
  extras: Record<string, unknown> = {},
): { from: jasmine.Spy } & Record<string, unknown> {
  return {
    from: jasmine.createSpy('from').and.callFake((table: string) => tables[table]),
    ...extras,
  };
}
