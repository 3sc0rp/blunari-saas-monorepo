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
