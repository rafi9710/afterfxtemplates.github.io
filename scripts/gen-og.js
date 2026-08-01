// Generates the site's static pages from templates.json:
//   /t/<id>/index.html   one real page per template  (share preview + SEO)
//   /c/<cat>/index.html  one page per category
//   /sitemap.xml         every URL on the site
//
// Run:  node scripts/gen-og.js      (from the repo root)

const fs = require('fs');
const path = require('path');

const BASE = 'https://afterfxtemplates.com';
const WA   = '918971738710';
const TODAY = new Date().toISOString().slice(0, 10);

const raw = JSON.parse(fs.readFileSync('templates.json', 'utf8'));
const templates = (raw.templates || raw).filter(t => t && t.id);
const labels = Object.fromEntries((raw.categories || []).map(c => [c.id, c.label]));

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- THE FIX -------------------------------------------------------------
// thumb is usually a base64 data: URI. A data: URI can never be an og:image,
// and prefixing it with BASE produced the broken
// "https://afterfxtemplates.com/data:image/jpeg;base64,..." URLs.
// Social crawlers need a real, fetchable https URL -> use the YouTube thumb.
// A few templates were added manually in admin, so their id looks like
// "custom_1782192554698" instead of a YouTube video id. Asking YouTube for
// i.ytimg.com/vi/custom_.../hqdefault.jpg returns the grey placeholder.
// Those rows DO carry the real link in `url`, so parse the video id out of it.
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function ytIdOf(t) {
  if (YT_ID.test(String(t.id || ''))) return t.id;
  const m = String(t.url || '').match(
    /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const ytThumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// og:image must be an absolute, fetchable https URL - never a data: URI.
function imageFor(t) {
  const yt = ytIdOf(t);
  if (yt) return ytThumb(yt);
  const thumb = String(t.thumb || '');
  if (/^https?:\/\//.test(thumb)) return thumb;
  if (thumb && !/^data:/i.test(thumb)) return `${BASE}/${thumb.replace(/^\//, '')}`;
  return `${BASE}/logo.png`;
}

// An in-page <img> CAN use a data: URI, so cards still show the admin
// thumbnail even when there is no video behind the template.
function cardImageFor(t) {
  const yt = ytIdOf(t);
  if (yt) return ytThumb(yt);
  return String(t.thumb || '') || `${BASE}/logo.png`;
}

// -------------------------------------------------------------------------

// Some rows are a DONE-FOR-YOU SERVICE, not a project file: the buyer gets a
// finished personalised video and never opens After Effects. Saying "buy the
// project file / here are the fonts and PSDs" on those pages is simply untrue
// and is exactly the kind of mismatch that turns into a refund request.
const isService = t => !!t.customizeOnly;

const ORIENT = { v: 'Vertical (9:16)', h: 'Horizontal (16:9)', both: 'Horizontal &amp; Vertical' };
const orientOf = t => ORIENT[t.orient] || 'Horizontal &amp; Vertical';
const priceOf  = t => t.price || 300;
const waLink   = txt => `https://wa.me/${WA}?text=${encodeURIComponent(txt)}`;

const INTRO = {
  wedding: 'Cinematic After Effects wedding invitation video templates for South Indian weddings. Telugu and English text support, horizontal and vertical output from the same project file.',
  muslimwedding: 'Nikah and Walima invitation video templates with Islamic geometric patterns and calligraphy-friendly layouts. Urdu, Telugu and English text support.',
  christian: 'Church wedding invitation video templates with cross motifs and clean typographic layouts, built for Indian Christian weddings.',
  engagement: 'Engagement and ring ceremony (nischitartham) invitation video templates — shorter and softer than the wedding sets, made to go out weeks before the main function.',
  cradle: 'Barasala, namakaranam and cradle ceremony invitation video templates. Soft palettes and cradle motifs with room for the baby name, ceremony date and family names.',
  babyshower: 'Seemantham, valakappu and baby shower invitation video templates with warm floral South Indian motifs.',
  halfsaree: 'Half saree ceremony (langa voni, ritu kala samskara) invitation video templates with silk textures and temple jewellery detail.',
  birthday: 'Birthday invitation video templates from first birthdays through milestone celebrations, with space for name, age, date and venue.',
  housewarming: 'Gruhapravesam and house warming invitation video templates with kalasham, mango leaf toran and rangoli motifs.',
  namereveal: 'Cinematic baby name reveal videos built around Indian mythological themes, where the name meaning drives the story.',
  saree: 'Saree ceremony invitation video templates with traditional South Indian textile and jewellery detail.',
  others: 'Invitation video templates for anniversaries, family functions and one-off celebrations.',
};

// ---------- FAQ ----------
// Real buyer questions. Google can show these directly under the result, which
// makes the listing taller and answers the "do I need After Effects?" doubt
// before the click. Answers must match what the page actually sells.
function faqFor(t, label) {
  const service = isService(t);
  const price = priceOf(t);
  const q = [];

  if (service) {
    q.push(['Do I need After Effects to use this?',
      'No. This one is a done-for-you video. You send us the names, date and venue on WhatsApp and we personalise the video and send you the finished file, ready to share.']);
  } else {
    q.push(['Do I need After Effects to use this template?',
      'Yes. This is an editable Adobe After Effects project file, so you need After Effects CC 2020 or above to open it and render your video. If you do not use After Effects, message us on WhatsApp and we can personalise it for you instead.']);
    q.push(['What is included in the download?',
      'The After Effects project file, the fonts used in the design, PNG footage, audio and music files, Telugu and English PSD files, and the remaining design assets.']);
    q.push(['Can I change the names, date and venue?',
      'Yes. Every text layer is editable. Open the project, type in your own names, wedding or ceremony date and venue, then render the video.']);
  }

  // The remaining three used to be shared, but every one of them talked about
  // a download, a file and fonts — all meaningless on a service page, where the
  // customer never receives anything except the finished video.
  if (service) {
    q.push(['Can the video be in Telugu?',
      'Yes. Tell us the names and wording you want in Telugu or English and we set the text for you — you do not have to type or install anything.']);

    q.push(['How much does it cost?',
      'Every one of these is made from scratch for your family, so the price depends on the length, the theme and how much custom work it needs. Message us on WhatsApp with what you have in mind and we will quote you.']);

    q.push(['How do I order?',
      'Send us a message on WhatsApp with the names, date and venue and the style you like. We confirm the price, make the video and send you the finished file.']);

    q.push(['Can I share the video wherever I want?',
      'Yes. Once you have your video you can share it with family and friends on WhatsApp, Instagram or anywhere else. It may not be resold or redistributed.']);
  } else {
    q.push(['Does it support Telugu text?',
      'Yes. The templates are built for Telugu and English text, and the fonts used are included in the download.']);

    q.push(['How much does it cost and how do I get it?',
      `This template is Rs ${price}. Pay online and the download link is emailed to you automatically — usually within a minute.`]);

    q.push(['Can I use it for more than one function?',
      'Yes. Once you have the file you can reuse it for your own family functions. It may not be resold or redistributed.']);
  }

  return q;
}

const faqJsonLd = q => `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: q.map(([name, text]) => ({
    '@type': 'Question', name,
    acceptedAnswer: { '@type': 'Answer', text },
  })),
})}</script>`;

const faqHtml = q =>
  `<h2>Common questions</h2><div class="faq">` +
  q.map(([name, text]) => `<details><summary>${esc(name)}</summary><p>${esc(text)}</p></details>`).join('') +
  `</div>`;

const STYLE = `
*{box-sizing:border-box}
body{margin:0;background:#080810;color:#f2ede2;font-family:"DM Sans",system-ui,sans-serif;line-height:1.65}
a{color:#e6c76a;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1020px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid #241f33;padding:16px 0}
header .wrap{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.brand{font-size:1.1rem;color:#f2ede2}.brand b{color:#C9A84C}
nav a{margin-left:16px;font-size:.9rem;color:#9b93ad}
.crumb{font-size:.82rem;color:#9b93ad;margin:26px 0 8px}.crumb a{color:#9b93ad}
h1{font-weight:500;font-size:clamp(1.6rem,4vw,2.4rem);line-height:1.22;margin:.2em 0 .4em}
h2{font-weight:500;font-size:1.3rem;color:#e6c76a;margin:2em 0 .5em}
p{max-width:70ch}.lede{font-size:1.05rem;color:#ddd6ea}
ul.meta{display:flex;gap:9px;flex-wrap:wrap;list-style:none;padding:0;margin:18px 0 24px}
ul.meta li{border:1px solid #241f33;border-radius:999px;padding:5px 13px;font-size:.82rem;color:#9b93ad}
ul.meta li b{color:#C9A84C}
.player{position:relative;padding-top:56.25%;border:1px solid #241f33;border-radius:10px;overflow:hidden;background:#000}
.player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.cta{display:flex;gap:11px;flex-wrap:wrap;margin:24px 0}
.btn{padding:12px 22px;border-radius:8px;font-weight:600;font-size:.94rem;border:1px solid #C9A84C;color:#C9A84C;display:inline-block}
.btn.solid{background:#C9A84C;color:#16120a}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;list-style:none;padding:0;margin:20px 0}
.card{border:1px solid #241f33;border-radius:10px;overflow:hidden;background:#0f0d18}
.card:hover{border-color:#C9A84C}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}
.card .t{padding:10px 12px 13px;font-size:.88rem;color:#f2ede2}
.card .t span{display:block;margin-top:4px;font-size:.77rem;color:#9b93ad}
.cats{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:14px 0}
.cats a{border:1px solid #241f33;border-radius:999px;padding:6px 14px;font-size:.85rem;color:#9b93ad;display:inline-block}
.faq{max-width:70ch;margin:14px 0 0}
.faq details{border-bottom:1px solid #241f33;padding:2px 0}
.faq summary{cursor:pointer;padding:13px 0;font-size:.96rem;color:#f2ede2;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:right;color:#C9A84C;font-size:1.15rem;line-height:1}
.faq details[open] summary::after{content:"−"}
.faq details p{margin:0 0 15px;color:#bdb5cc;font-size:.93rem}
footer{border-top:1px solid #241f33;margin-top:56px;padding:26px 0 44px;font-size:.85rem;color:#9b93ad}
footer a{color:#9b93ad}
`;

function shell({ title, desc, canonical, image, body, jsonld = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="AfterFX Templates">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="${BASE}/favicon.ico">
<style>${STYLE}</style>
${jsonld}
</head>
<body>
<header><div class="wrap">
<a class="brand" href="${BASE}/">AfterFX <b>Templates</b></a>
<nav><a href="${BASE}/">All templates</a><a href="${BASE}/wedding-cards.html">Cards</a><a href="${BASE}/fonts.html">Fonts</a><a href="${BASE}/about.html">About</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
AfterFX Templates — Mohammad Rafi, VFX &amp; Motion Graphics Artist, Bengaluru.<br>
<a href="${BASE}/">Templates</a> · <a href="${BASE}/about.html">About</a> ·
<a href="${BASE}/terms.html">Terms</a> · <a href="${BASE}/privacy.html">Privacy</a> ·
<a href="https://wa.me/${WA}">WhatsApp</a>
</div></footer>
</body>
</html>`;
}

const card = (t, label) =>
  `<li class="card"><a href="${BASE}/t/${t.id}/">` +
  `<img src="${esc(cardImageFor(t))}" loading="lazy" alt="${esc(t.title)} invitation video template">` +
  `<div class="t">${esc(t.title)}<span>${esc(label)} · ${isService(t) ? 'Made to order' : '₹' + priceOf(t)}</span></div></a></li>`;

// ---------- group ----------
const byCat = {};
for (const t of templates) (byCat[t.cat || 'others'] ||= []).push(t);
const cats = Object.keys(byCat).sort((a, b) => byCat[b].length - byCat[a].length);
const labelOf = c => labels[c] || c.charAt(0).toUpperCase() + c.slice(1);

// ---------- template pages ----------
let nT = 0;
for (const c of cats) {
  const label = labelOf(c);
  for (const t of byCat[c]) {
    const title = esc(t.title || 'After Effects Template');
    const price = priceOf(t);
    const img = esc(imageFor(t));
    const url = `${BASE}/t/${t.id}/`;
    const own = String(t.desc || '').trim();
    const lede = own || `${t.title} — an editable After Effects invitation video template for ${label.toLowerCase()} celebrations. Telugu and English text support, ${orientOf(t).toLowerCase()} output, with every font, audio file, PNG asset and PSD included.`;
    const metaDesc = esc(lede.length > 155 ? lede.slice(0, 150).replace(/\s\S*$/, '') + '…' : lede);

    const service = isService(t);
    const faq = faqFor(t, label);

    // A made-to-order video has no fixed price, so publishing price: 300 in the
    // Offer would put a wrong number straight into Google's rich result. Emit a
    // Service with a quote-based offer instead of a priced Product.
    const jsonld = `<script type="application/ld+json">${JSON.stringify(service ? {
      '@context': 'https://schema.org', '@type': 'Service',
      name: t.title, description: lede,
      image: imageFor(t),
      serviceType: `${label} video creation`,
      areaServed: 'IN', url,
      provider: { '@type': 'Organization', name: 'AfterFX Templates', url: BASE },
      offers: { '@type': 'Offer', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url,
        priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'INR', valueAddedTaxIncluded: true } },
    } : {
      '@context': 'https://schema.org', '@type': 'Product',
      name: t.title, description: lede,
      image: imageFor(t),
      brand: { '@type': 'Brand', name: 'AfterFX Templates' },
      category: label, url,
      offers: { '@type': 'Offer', price: String(price), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url },
    })}</script>` + faqJsonLd(faq);

    const yt = ytIdOf(t);
    const playerHtml = yt
      ? `<div class="player"><iframe src="https://www.youtube.com/embed/${yt}" title="${title} preview" loading="lazy" allowfullscreen allow="encrypted-media; picture-in-picture"></iframe></div>`
      : `<img src="${esc(cardImageFor(t))}" alt="${title}" style="width:100%;border:1px solid #241f33;border-radius:10px;display:block">`;

    // Same-category first. Christian Wedding has 4 templates and Others has 1,
    // so those pages were dead ends with 3 links or none — top them up from the
    // rest of the catalogue so every page gives the reader (and the crawler)
    // somewhere to go.
    const sameCat = byCat[c].filter(x => x.id !== t.id).slice(0, 8);
    const relHtml = sameCat.length
      ? `<h2>More ${esc(label.toLowerCase())} templates</h2><ul class="grid">${sameCat.map(x => card(x, label)).join('')}</ul>` +
        `<p><a href="${BASE}/c/${c}/">View all ${byCat[c].length} ${esc(label.toLowerCase())} templates →</a></p>`
      : '';

    let alsoHtml = '';
    if (sameCat.length < 4) {
      const seen = new Set([t.id, ...sameCat.map(x => x.id)]);
      const fill = [];
      for (const oc of cats) {                      // widest categories first
        if (oc === c) continue;
        for (const x of byCat[oc]) {
          if (seen.has(x.id)) continue;
          fill.push([x, labelOf(oc)]);
          seen.add(x.id);
          break;                                     // one per category, mixed
        }
        if (fill.length >= 8) break;
      }
      if (fill.length) {
        alsoHtml = `<h2>Also popular</h2><ul class="grid">${fill.map(([x, l]) => card(x, l)).join('')}</ul>`;
      }
    }

    const body = `
<p class="crumb"><a href="${BASE}/">Templates</a> › <a href="${BASE}/c/${c}/">${esc(label)}</a> › ${title}</p>
<h1>${title}</h1>
<p class="lede">${esc(lede)}</p>
<ul class="meta"><li>Category <b>${esc(label)}</b></li><li>Format <b>${orientOf(t)}</b></li>${service ? `<li>Made to order <b>Price on request</b></li>` : `<li>Price <b>₹${price}</b></li>`}<li>Languages <b>Telugu + English</b></li></ul>
${playerHtml}
<div class="cta">${service
  ? `<a class="btn solid" href="${esc(waLink(`Hi AfterFX Templates! I want this video made for me: ${t.title} (${url})`))}">Enquire on WhatsApp</a>`
  : `<a class="btn solid" href="${BASE}/?t=${t.id}">Buy the project file — ₹${price}</a>
  <a class="btn" href="${esc(waLink(`Hi AfterFX Templates! I want a ready-made personalised video of: ${t.title} (${url})`))}">Get a ready-made video</a>`}
</div>
<h2>What you get</h2>
<p>${service
  ? 'A finished, personalised video — not a project file. You do not need After Effects. Message us on WhatsApp with the names, date and venue, we confirm the price, and we deliver the ready-to-share video to you.'
  : 'The After Effects project file, the fonts used in the design, PNG footages, audio and music files, Telugu and English PSD files, and all remaining design assets. Nothing is held back.'}</p>
<h2>About ${esc(label.toLowerCase())} templates</h2>
<p>${esc(INTRO[c] || INTRO.others)}</p>
${faqHtml(faq)}
${relHtml}
${alsoHtml}`;

    const dir = path.join('t', t.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'),
      shell({
        title: service
          ? `${title} — Custom ${esc(label)} Video Made For You | AfterFX Templates`
          : `${title} — After Effects Invitation Video Template | ₹${price}`,
        desc: metaDesc, canonical: url, image: img, body, jsonld }));
    nT++;
  }
}

// ---------- category pages ----------
let nC = 0;
for (const c of cats) {
  const label = labelOf(c), items = byCat[c];
  const url = `${BASE}/c/${c}/`;
  const intro = INTRO[c] || INTRO.others;
  // A category where EVERY item is made to order (name reveal) must not claim
  // "from Rs 300" or "instant to your email" — there is no fixed price and
  // nothing is auto-delivered.
  const allService = items.every(isService);
  const others = cats.filter(x => x !== c).map(x => `<li><a href="${BASE}/c/${x}/">${esc(labelOf(x))}</a></li>`).join('');
  const body = `
<p class="crumb"><a href="${BASE}/">Templates</a> › ${esc(label)}</p>
<h1>${esc(label)} ${allService ? 'Videos' : 'Invitation Video Templates'}</h1>
<p class="lede">${esc(intro)}</p>
<ul class="meta"><li>${allService ? 'Videos' : 'Templates'} <b>${items.length}</b></li>${allService
  ? `<li>Made to order <b>Price on request</b></li>`
  : `<li>From <b>₹300</b></li>`}<li>Languages <b>Telugu + English</b></li>${allService
  ? `<li>Made by <b>our team, for you</b></li>`
  : `<li>Delivery <b>Instant to your email</b></li>`}</ul>
<div class="cta">${allService
  ? `<a class="btn solid" href="${esc(waLink(`Hi AfterFX Templates! I want a custom ${label} video made.`))}">Enquire on WhatsApp</a>
  <a class="btn" href="${BASE}/">Browse all templates</a>`
  : `<a class="btn solid" href="${BASE}/">Browse all templates</a>
  <a class="btn" href="${esc(waLink(`Hi AfterFX Templates! I am looking for a ${label} invitation video.`))}">Ask on WhatsApp</a>`}
</div>
<h2>All ${esc(label.toLowerCase())} ${allService ? 'videos' : 'templates'}</h2>
<ul class="grid">${items.map(t => card(t, label)).join('')}</ul>
${allService ? `<h2>How these videos work</h2>
<p>These are made for you, not sold as project files. Pick the style you like, message us on WhatsApp with the name, date and other details, and we confirm a price for your video.</p>
<p>You do not need After Effects or any editing skill. We build the video and send you the finished file, ready to share on WhatsApp, Instagram or a big screen at the function.</p>` : `<h2>How these templates work</h2>
<p>Each template is an editable After Effects project file. Replace the names, dates and venue, then render horizontal for the function screen and vertical for WhatsApp. Fonts, PNG footage, audio and layered PSD files are all included in the download.</p>
<p>If you do not use After Effects, we can personalise the template for you and deliver a finished video — message us on WhatsApp with the template you like.</p>`}
<h2>Other categories</h2>
<ul class="cats">${others}</ul>`;

  fs.mkdirSync(path.join('c', c), { recursive: true });
  fs.writeFileSync(path.join('c', c, 'index.html'),
    shell({
      title: allService
        ? `${label} Videos — ${items.length} Custom Designs Made For You | AfterFX Templates`
        : `${label} Invitation Video Templates — ${items.length} Designs from ₹300 | AfterFX Templates`,
      desc: esc(intro.slice(0, 150).replace(/\s\S*$/, '') + '…'),
      canonical: url,
      image: imageFor(items[0]),
      body,
    }));
  nC++;
}

// ---------- sitemap ----------
const STATIC = [['/', '1.0', 'weekly'], ['/wedding-cards.html', '0.8', 'monthly'],
  ['/fonts.html', '0.7', 'monthly'], ['/about.html', '0.5', 'yearly'],
  ['/terms.html', '0.3', 'yearly'], ['/privacy.html', '0.3', 'yearly']];

const entry = (loc, mod, freq, pri) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>\n`;

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const [p, pri, freq] of STATIC) xml += entry(BASE + p, TODAY, freq, pri);
for (const c of cats) xml += entry(`${BASE}/c/${c}/`, TODAY, 'weekly', '0.9');
for (const t of templates) {
  const mod = /^\d{4}-\d{2}-\d{2}$/.test(String(t.addedAt || '').slice(0, 10)) ? String(t.addedAt).slice(0, 10) : TODAY;
  xml += entry(`${BASE}/t/${t.id}/`, mod, 'monthly', '0.7');
}
xml += '</urlset>\n';
fs.writeFileSync('sitemap.xml', xml);

console.log(`Generated ${nT} template pages, ${nC} category pages, sitemap with ${STATIC.length + nC + templates.length} URLs`);
