export async function shareOrCopy(url: string, title: string, text: string): Promise<void> {
  if (navigator.share) {
    await navigator.share({ title, text, url });
  } else {
    await navigator.clipboard.writeText(url);
  }
}

export async function copyWithTimeout(
  value: string,
  setter: (v: string | null) => void,
  ms = 2000,
): Promise<void> {
  await navigator.clipboard.writeText(value);
  setter(value);
  setTimeout(() => setter(null), ms);
}
