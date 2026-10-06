export interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

export type QueryMock = Record<string, jasmine.Spy> & PromiseLike<QueryResult>;

/**
 * Chainable, awaitable stand-in for a Supabase query builder. Every method
 * (select, eq, insert, ...) returns the same builder; awaiting it yields `result`.
 * Spies are cached per method name so tests can assert on the arguments.
 */
export function createQueryMock(result: QueryResult = { data: null, error: null }): QueryMock {
  const spies = new Map<string, jasmine.Spy>();
  const proxy: QueryMock = new Proxy({} as QueryMock, {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (value: QueryResult) => unknown) => resolve(result);
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
