interface ImportMeta {
  readonly env: {
    readonly NG_APP_SUPABASE_URL: string;
    readonly NG_APP_SUPABASE_ANON_KEY: string;
    readonly [key: string]: string | undefined;
  };
}
