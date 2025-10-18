# CSP & Integrity Recommendations (Standalone Public Widget)

When serving the new standalone public widget bundle (`public-widget.html` entry with routes like `/public-widget/book/:slug`), tighten security with a layered CSP:
Example strict CSP (adjust domains accordingly):

```
Content-Security-Policy: \
  default-src 'none'; \
  script-src 'self' https://cdn.your-analytics.example 'sha256-<INLINE_LOADER_HASH>' 'unsafe-inline'; \
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
  font-src https://fonts.gstatic.com; \
  img-src 'self' data: https://images.blunari-cdn.example; \
  connect-src 'self' https://<your-supabase-project>.supabase.co https://api.blunari.example; \
  frame-ancestors *; \
  frame-src 'self'; \
  base-uri 'none'; \
  form-action 'none'; \
  manifest-src 'self';
Notes:
1. frame-ancestors * allows tenants to embed the widget anywhere; restrict this if you want tenant-origin allowlists.
2. Avoid wildcard connect-src beyond required API + realtime origins.
3. If you externalize the inline loader script, remove its hash and prefer Subresource Integrity (SRI) on the script tag.

### Subresource Integrity (SRI)
If you host the widget runtime on a CDN (e.g. `/assets/public-widget-[hash].js`), publish its integrity hash. Sample tag:

```
<script 
  src="https://cdn.blunari.example/public-widget/public-widget-a1b2c3d4.js" 
  integrity="sha384-Base64DigestHere" 
  crossorigin="anonymous" 
  defer
></script>
### Async / Non-Blocking Loader Pattern

For customers that prefer a script-based embed instead of a plain iframe tag, supply a progressive enhancement loader:
```
<div id="blunari-booking" style="min-height:620px;position:relative">
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;color:#555">
    Loading availability…
  </div>
</div>
<script>
!function(){
  var c=document.getElementById('blunari-booking');
  if(!c) return;
  var f=document.createElement('iframe');
  f.title='Booking Widget';
  f.loading='lazy';
  f.referrerPolicy='strict-origin-when-cross-origin';
  f.sandbox='allow-scripts allow-forms allow-popups';
  f.style.cssText='border:0;width:100%;height:100%;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.08)';
  f.src='https://app.blunari.example/public-widget/book/restaurant-slug?token=...&embed=1';
  c.innerHTML='';
  c.appendChild(f);
}();
</script>
```

Provide production tenants a pre-generated snippet with slug + token replaced. This approach:
* Avoids blocking HTML parse.
* Shows a lightweight placeholder while the iframe initializes.
* Maintains sandbox isolation (no allow-same-origin).

### Hardening Checklist
| Concern | Mitigation |
|---------|------------|
| XSS inside host page | Iframe sandbox (no same-origin) + no inline JS inside widget document except minimal boot script. |
| Token leakage via referrer | `referrerpolicy="strict-origin-when-cross-origin"` on iframe. |
| Host page CSP interference | Standalone entry isolates scripts and styles. |
| Clickjacking of widget | Acceptable (embedding is intended) – do not add `X-Frame-Options`. |
| PostMessage abuse | Verify origin AND a widgetId/token namespace in handler; current script embed does origin check. |
| Supply chain (script tampering) | Use SRI + immutable versioned file names when serving from CDN. |

### Future Enhancements
* Signed short-lived booking tokens separate from configuration tokens.
* Origin allowlisting service returning a compact signed policy object.
* Optional COOP/COEP headers for performance isolation if needed.

# Embedding Securely

This document describes the hardened security posture for embedding Blunari widgets and provides recommended snippets & policies.

## Goals
- Prevent iframe sandbox escape (no privilege escalation via same-origin + script combo)
- Minimize sensitive data exposure inside third‑party pages
- Provide predictable, versioned integration surface
- Allow progressive enhancement (resize messaging, future postMessage API)

## Key Decisions
| Aspect | Decision | Rationale |
| ------ | -------- | --------- |
| `sandbox` | `allow-scripts allow-forms allow-popups` (no `allow-same-origin`) | Eliminates powerful same-origin + script escalation path. Prevents access to parent DOM / storage. |
| Storage inside iframe | Ephemeral (in-memory) when sandboxed | Avoids SecurityErrors and leaking persistent data in untrusted context. |
| Session persistence | Disabled in sandbox | Reduces token lifetime exposure & simplifies threat surface. |
| Referrer policy | `strict-origin-when-cross-origin` | Limits referer details while preserving origin for analytics. |
| Token parameter | Short-lived widget token (querystring) | Scopes access; can be rotated without breaking embed code. |

## Recommended Iframe Embed (Simple)
```html
<!-- Blunari Widget Embed (Secure) -->
<iframe
  src="https://app.your-blunari-domain.com/book/{tenantSlug}?token={WIDGET_TOKEN}&embed=1"
  width="400"
  height="600"
  style="border:0;max-width:100%;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,.1);"
  title="Blunari Booking Widget"
  loading="lazy"
  sandbox="allow-scripts allow-forms allow-popups"
  referrerpolicy="strict-origin-when-cross-origin"
  data-widget-type="booking"
></iframe>
```

### Notes
- No `allow-same-origin`: widget cannot read parent cookies, DOM, or storage.
- Add `allow-popups` only if you use flows that open new windows (payments, auth handoff). Remove if not needed.

## Script Embed (Enhanced, Resizable)
The script approach injects the iframe and enables resize / lifecycle messaging.
```html
<div id="blunari-booking" style="width:400px;height:600px;max-width:100%;border-radius:8px;overflow:hidden;"></div>
<script>(function(){
  var el=document.getElementById('blunari-booking'); if(!el) return;
  var src='https://app.your-blunari-domain.com/book/{tenantSlug}?token={WIDGET_TOKEN}&embed=1&parent_origin='+encodeURIComponent(window.location.origin);
  var f=document.createElement('iframe');
  f.src=src; f.loading='lazy'; f.title='Blunari Booking Widget';
  f.setAttribute('sandbox','allow-scripts allow-forms allow-popups');
  f.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
  f.style.cssText='width:100%;height:100%;border:0;display:block;background:#fff';
  el.appendChild(f);
  window.addEventListener('message',function(e){
    if(!e.data||e.data.type!=='widget_resize') return;
    if(e.data.height){ f.style.height=e.data.height+'px'; el.style.height=e.data.height+'px'; }
  });
})();</script>
```

## Content Security Policy (Optional but Recommended)
Provide guidance to integrators to explicitly allow the widget origin while restricting others.
```http
Content-Security-Policy: \
  default-src 'self'; \
  script-src 'self' https://app.your-blunari-domain.com; \
  frame-src https://app.your-blunari-domain.com; \
  img-src 'self' https://app.your-blunari-domain.com data:; \
  style-src 'self' 'unsafe-inline'; /* inline styles only if necessary */
```
Adjust directives if you serve assets (fonts, media) from different subdomains.

## Future: postMessage API (Planned)
Reserved event types:
- `widget_loaded` – iframe finished initial render
- `widget_resize` – notify parent of dynamic height changes
- `widget_error` – non-fatal error surfaced (optional)
- `widget_event` – generic analytics / interaction envelope (future)

Parent can safely ignore unknown events.

## Handling The Ephemeral Preview
Inside the Blunari dashboard preview:
- Storage may be in-memory only (`safeStorage.persistent === false`).
- A banner informs users that persistence is disabled.
- This mirrors worst-case 3rd-party host constraints.

## Migration From Legacy Embeds
If older snippets used `allow-same-origin`:
1. Replace with the secure snippet above.
2. Verify no reliance on reading parent cookies or DOM (unsupported now).
3. If sandbox persistence was expected, update logic to use postMessage once available.

## FAQ
**Q: Why not include `allow-same-origin` for easier storage?**  
A: Combining `allow-scripts` + `allow-same-origin` voids most sandbox isolation (equivalent to running first-party). We prioritize tenant & host security.

**Q: How do I persist user preferences inside the widget?**  
A: Use server-side state (tenant config) or future signed ephemeral state passed via query params; do not depend on localStorage in untrusted embeds.

**Q: Can I style the iframe container directly?**  
A: Yes. All visual customization lives outside; internal widget styles are self-contained. Keep border-radius & box-shadow on the host container.

**Q: How do I rotate tokens?**  
A: Generate a new widget token server-side; embeds using the old token will continue until expiry (short TTL recommended). Replace `token` param in the snippet.

## Checklist For Integrators
- [ ] Use provided iframe or script snippet (no modifications to sandbox attr except removing unused permissions)  
- [ ] Set a fixed starting height; allow script to resize dynamically  
- [ ] Apply CSP including `frame-src` + `script-src` for the widget origin  
- [ ] Do not inject 3rd-party scripts inside the widget iframe (blocked anyway)  
- [ ] Monitor console for `widget_error` events (future)  

---
Last updated: {{DATE}}
