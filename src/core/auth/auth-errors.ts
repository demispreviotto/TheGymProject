export interface AuthFailure {
  message: string;
  name?: string;
  status?: number;
}

/**
 * True when the auth call failed because the backend could not be reached or
 * answered with a server error (5xx / network failure), as opposed to a
 * rejection of the user's input. supabase-js reports gateway errors as
 * `AuthRetryableFetchError` and, for a 504, stringifies the Response so the raw
 * `message` is just "{}" — never show it to the user.
 */
export function isServiceUnavailable(error: AuthFailure): boolean {
  return error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500;
}
