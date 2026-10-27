import { sceneHeroes } from "../experience-content.js";
import { responsiveImage } from "./responsive-html.mjs";

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function renderSceneHero(slug) {
  const hero = sceneHeroes[slug];
  if (!hero) throw new Error(`Scene hero missing for ${slug}`);
  const image = responsiveImage(hero.image, "100vw");
  const ratio = image.width / image.height;
  const sizes = `max(100vw, ${Math.round(100 * ratio)}svh, ${Math.round(770 * ratio)}px)`;
  return `<section class="page-hero scene-hero" data-scene-hero${hero.water ? ' data-water-scene' : ''} aria-labelledby="scene-title">
    <div class="hero-photo scene-photo" data-scene-destination><img src="${esc(image.src)}" srcset="${esc(image.srcset)}" sizes="${sizes}" width="${image.width}" height="${image.height}" alt="${esc(hero.alt)}" fetchpriority="high" decoding="async" style="object-position:${esc(hero.position)}"/></div>
    <div class="scene-shade" aria-hidden="true"></div>
    <div class="scene-topline"><nav class="breadcrumb" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span aria-hidden="true">/</span><span aria-current="page">${esc(hero.label)}</span></nav><span class="scene-edition">ECOLIVE · ANTALYA</span></div>
    <div class="scene-heading"><span class="micro">${esc(hero.eyebrow)}</span><h1 class="page-title" id="scene-title"><span>${esc(hero.title)}</span><em>${esc(hero.emphasis)}</em></h1></div>
    <div class="scene-bottom"><p>${esc(hero.text)}</p><a class="scene-explore" href="${esc(hero.href)}"><span>${esc(hero.link)}</span><span class="scene-arrow" aria-hidden="true">↓</span></a><span class="scene-number" aria-hidden="true">${hero.number}<span> / 08</span></span></div>
  </section>`;
}
