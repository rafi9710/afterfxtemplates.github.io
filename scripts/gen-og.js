// Generates one real HTML page per template at /t/<id>/index.html
// Each page carries its OWN og:image (that template's thumbnail) so WhatsApp/
// Telegram/Facebook show the right thumbnail in the link preview.
// Real visitors get redirected to the storefront focus mode (/?t=<id>).

const fs = require('fs');
const path = require('path');

const BASE = 'https://afterfxtemplates.com'; // <-- your live domain
const OUT  = 't';                            // output folder: /t/<id>/

const raw = JSON.parse(fs.readFileSync('templates.json', 'utf8'));
const templates = raw.templates || raw;

const esc = s => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function imageFor(t) {
  if (t.thumb && /^https?:\/\//.test(t.thumb)) return t.thumb;          // full URL already
  if (t.thumb) return `${BASE}/${t.thumb.replace(/^\//, '')}`;          // relative path on site
  return `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`;                // fallback: YouTube thumb
}

let count = 0;
for (const t of templates) {
  if (!t.id) continue;
  const title = esc(t.title || 'After Effects Template');
  const img   = esc(imageFor(t));
  const url   = `${BASE}/${OUT}/${t.id}/`;
  const price = t.price ? ` \u20B9${t.price}` : '';
  const desc  = esc(`${t.title || 'Template'} \u2014 Editable After Effects project file${price} \u00B7 AfterFX Templates`);
  const focus = `${BASE}/?t=${t.id}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} \u00B7 AfterFX Templates</title>
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="AfterFX Templates">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<script>location.replace(${JSON.stringify(focus)});</script>
</head>
<body style="background:#080810;color:#C9A84C;font-family:DM Sans,sans-serif;text-align:center;padding:48px 20px">
<p>Opening template\u2026</p>
<p><a style="color:#C9A84C" href="${focus}">Tap here if it doesn't open \u2192</a></p>
</body>
</html>`;

  const dir = path.join(OUT, t.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  count++;
}
console.log(`Generated ${count} template share pages in /${OUT}`);
