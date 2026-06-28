// Guards against open redirects: only allow same-origin, root-relative paths.
// Rejects absolute URLs (https://evil.com), protocol-relative (//evil.com), and
// backslash tricks (/\evil.com) that browsers normalize to an external host.
export function safeNext(next: string | null | undefined, fallback = '/app'): string {
  if (!next || !next.startsWith('/')) return fallback
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
