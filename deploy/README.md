# Production build and hosting

Run `npm ci` once, then `npm run build`. Publish **the contents of `dist/`**, including `.htaccess` where supported. No Node runtime is required by the published website. `npm run dev` continues to serve readable authoring files for development.

`npm run build` combines styles in their original order, splits browser modules into a shared entry and on-demand feature chunks, minifies both, fingerprints CSS/JS/fonts, and writes compressed text sidecars. Responsive images carry their own content hashes. `build-manifest.json` records generated URLs for diagnostics. New builds update HTML references automatically; never edit the generated files.

For an accurate local production preview, run `npm run preview` (port 4173, or `PORT=4174 npm run preview`). It serves `dist/`, negotiates Brotli/gzip for text, preserves video byte ranges, and applies the same cache rules as the supplied hosting configuration. Run `npm run verify:build` after a build to check all page resources and the HTTP behavior; it launches and stops a temporary preview server on an available port.

Run `npm run verify:hero` for the scroll-video controller regressions: delayed first frame, partial buffering, the latest scroll target, reverse seeking, reduced motion/data saving, media errors, and cleanup. The controller keeps the poster/last decoded frame while the requested time is still downloading; slow transfers do not permanently disable the animation. Verify forward/backward scrolling on the published URL as well, since browser preload behavior and network speed remain environment-dependent.

## Hosting configuration

- Apache: `dist/.htaccess` sets caching and text compression when the corresponding modules and `AllowOverride FileInfo` are enabled. Compression uses Brotli when available, otherwise gzip. Apache itself serves video byte ranges.
- Netlify or Cloudflare Pages: `dist/_headers` sets explicit cache rules. Their platform normally negotiates text compression automatically. Other providers may ignore this file and need equivalent settings in their control panel or server configuration.
- HTML revalidates. Hashed CSS, JS, fonts and responsive images use one-year immutable caching. Original images and videos use seven-day caching and revalidate after expiry. Replacing an unversioned video may therefore require a CDN purge or a renamed URL.
- Text sidecars (`.br`/`.gz`) are used by the local preview. A custom reverse proxy may also serve them with the matching `Content-Encoding`, original MIME type and `Vary: Accept-Encoding`; never enable this for MP4 or byte-range responses.

Deploy HTML and its referenced assets together. If the host supports atomic releases, use them; otherwise retain old hashed files during upload so open pages can still fetch their resources. Hosting/CDN settings must be verified on the live URL after deployment; source changes alone cannot enable server modules or override platform headers.
