/**
 * URL safety helpers (OWASP A03 / A05).
 *
 * window.open(url, "_blank") with a javascript: or data: URL executes code in
 * the current origin's context. All server-provided URLs (citations, heading
 * paths) must be validated before being passed to window.open.
 */

const SAFE_SCHEMES = new Set(["https:", "http:"]);

/**
 * Return true only when url starts with http: or https:.
 * Rejects javascript:, data:, vbscript:, blob:, etc.
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return SAFE_SCHEMES.has(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Open a server-provided URL in a new tab only when the scheme is safe.
 * Always sets noopener,noreferrer so the new tab cannot access window.opener.
 */
export function safeOpen(url: string | null | undefined): void {
    if (!isSafeExternalUrl(url)) return;
    window.open(url!, "_blank", "noopener,noreferrer");
}
