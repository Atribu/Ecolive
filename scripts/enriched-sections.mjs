const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export function renderPageGuide(items) {
  return `<nav class="page-guide" aria-label="Bu sayfadaki bölümler"><span class="micro">BU SAYFADA</span><div>${items.map((item) => `<a href="#${esc(item.id)}">${esc(item.label)}<span aria-hidden="true">↘</span></a>`).join("")}</div></nav>`;
}
export function renderFeature(feature, visual, { id, reverse = false } = {}) {
  return `<section class="deep-feature${reverse ? " deep-feature-reverse" : ""}"${id ? ` id="${esc(id)}"` : ""}><figure class="deep-image"><img src="/${esc(visual.image)}" alt="${esc(visual.alt)}" width="${visual.width}" height="${visual.height}" loading="lazy" style="object-position:${esc(visual.position || "50% 50%")}"/></figure><div class="deep-copy" data-surface-art><span class="micro">${esc(feature.eyebrow)}</span><h2>${esc(feature.title)}</h2>${feature.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div></section>`;
}
export function renderEssentials(section) {
  return `<section class="deep-essentials" data-surface-art id="ayrintilar"><div class="deep-essentials-heading"><span class="micro">${esc(section.eyebrow)}</span><h2>${esc(section.title)}</h2></div><div class="deep-essentials-list">${section.items.map((item, i) => `<article><span class="chapter-number">0${i + 1}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join("")}</div></section>`;
}
export function renderQuestions(
  faqs,
  {
    label = "MERAK ETTİKLERİNİZ",
    title = "Biraz daha",
    emphasis = "yakından.",
  } = {},
) {
  return `<section class="faq-section deep-faq" id="sorular"><div><span class="micro">${esc(label)}</span><h2>${esc(title)} <em>${esc(emphasis)}</em></h2></div><div class="cycle-accordion">${faqs.map((faq, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(faq.question)}<span class="plus"></span></summary><p>${esc(faq.answer)}</p></details>`).join("")}</div></section>`;
}
export function renderCampus(campus, routes) {
  return `<section class="campus-directory" data-surface-art="terrain" id="kampuste-yasam"><div class="campus-directory-heading"><div><span class="micro">${esc(campus.eyebrow)}</span><h2>${esc(campus.title)}</h2></div><p>${esc(campus.intro)}</p></div><div class="campus-directory-grid">${campus.items.map((item, i) => `<article><span class="micro">0${i + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a class="text-link" href="${routes[i]}">Yakından tanıyın <span aria-hidden="true">↗</span></a></article>`).join("")}</div></section>`;
}
export function renderContactGuide(data, visual) {
  return `<section class="contact-guide" id="gorusmeye-hazirlik"><figure class="deep-image"><img src="/${esc(visual.image)}" alt="${esc(visual.alt)}" width="${visual.width}" height="${visual.height}" loading="lazy"/></figure><div class="contact-guide-copy" data-surface-art><span class="micro">${esc(data.eyebrow)}</span><h2>${esc(data.title)}</h2><p>${esc(data.intro)}</p><ol>${data.steps.map((step, i) => `<li><span class="chapter-number">0${i + 1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></div></li>`).join("")}</ol><a class="text-link" href="mailto:info@ecolive.com.tr">info@ecolive.com.tr <span>↗</span></a></div></section>`;
}
