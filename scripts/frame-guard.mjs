// Anti-framing for the built app. Allowed embedding sites come from ALLOWED_FRAME_ANCESTORS in .env (comma-separated origins).
// Two layers, because a static site can only be fully protected by response headers:
//   1. Headers: `vite preview` sends them, and the build writes a `_headers` file (Netlify / Cloudflare Pages style). Copy the same
//      two lines into nginx / Apache for other hosts (see docs/RELEASING.md). These are the real protection.
//   2. frame-guard.js: a blocking script that blanks the page when it is framed by a site that is not allowed, which covers hosts where
//      you cannot set headers. A <meta> Content-Security-Policy cannot carry frame-ancestors, so this is the only in-page option.

/** "https://a.com, https://b.org" -> ['https://a.com', 'https://b.org']. Anything that is not a plain http(s) origin is an error. */
export function parseAllowed(text) {
  const out = []
  for (const raw of String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    let u
    try { u = new URL(raw) } catch { throw new Error(`ALLOWED_FRAME_ANCESTORS: “${raw}” is not a URL. Use origins such as https://example.com`) }
    if (!/^https?:$/.test(u.protocol) || u.origin !== raw.replace(/\/$/, '')) throw new Error(`ALLOWED_FRAME_ANCESTORS: “${raw}” must be just an origin (scheme and host, e.g. https://example.com)`)
    if (!out.includes(u.origin)) out.push(u.origin)
  }
  return out
}

/** Response headers that stop framing, or allow only the listed origins (and this site itself). */
export function frameHeaders(allowed) {
  return allowed.length
    ? { 'Content-Security-Policy': `frame-ancestors 'self' ${allowed.join(' ')}` } // X-Frame-Options cannot express an allow-list, so it is left out
    : { 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'DENY' }
}

export function guardSource(allowed) {
  return `(function (w, d, l) {
  try { if (w.top === w.self) return } catch (e) { /* cross-origin top: we are framed */ }
  var ok = ${JSON.stringify(allowed)}.concat([l.origin]), a = l.ancestorOrigins, good = false;
  if (a && a.length) { good = true; for (var i = 0; i < a.length; i++) if (ok.indexOf(a[i]) < 0) good = false }
  else { try { good = ok.indexOf(new URL(d.referrer).origin) >= 0 } catch (e) { good = false } }
  if (good) return;
  w.__hrtBlocked = true;
  d.documentElement.innerHTML = '<body style="margin:0;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#11161b;color:#e8e6df;text-align:center;padding:1rem"><p>Ham Radio Tools cannot be shown inside another site.<br><a style="color:#f2b84b" target="_blank" rel="noopener" href="' + l.href + '">Open it in its own tab</a></p></body>';
})(window, document, location);
`
}

/** Netlify / Cloudflare Pages `_headers` file. */
export const headersFile = (allowed) => `/*\n${Object.entries(frameHeaders(allowed)).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`
