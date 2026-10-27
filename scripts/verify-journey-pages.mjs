import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { journeys, renderImmersiveJourney } from './immersive-journey.mjs';

const routes = ['', 'proje-hakkinda', 'yasam-ve-mimari', 'saglik-ve-iyi-yasam', 'egitim-ve-kusaklar', 'tarim-ve-uretim', 'doga-ve-peyzaj', 'enerji-ve-kaynaklar', 'iletisim'];
const pages = new Map(await Promise.all(routes.map(async slug => [slug, await readFile(join('dist', slug, 'index.html'), 'utf8')])));
const story = html => {
  const sections = [...html.matchAll(/<section\b[^>]*\bdata-journey(?:\s|>)[\s\S]*?<\/section>/g)];
  assert.equal(sections.length, 1, 'exactly one cinematic story per page');
  const section = sections[0][0];
  const raw = section.match(/<script type="application\/json" data-journey-items>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(raw, 'per-page story data exists');
  return { section, items: JSON.parse(raw) };
};

test('all nine production routes include their own story and correctly associated controls', () => {
  assert.deepEqual(journeys.map(item => item.slug).sort(), [...routes].sort());
  for (const slug of routes) {
    const { section, items } = story(pages.get(slug));
    const config = journeys.find(item => item.slug === slug);
    assert.ok(section.includes(`id="${config.id}"`), `${slug} uses its own section anchor`);
    assert.equal(items.length, 4);
    assert.deepEqual(items.map(item => item.id), config.chapters.map(item => item.id));
    assert.equal(new Set(items.map(item => item.id)).size, 4);
    assert.equal((section.match(/data-journey-choice="\d+"/g) || []).length, 4);
    assert.equal((section.match(/aria-pressed="true"/g) || []).length, 1);
    const ids = new Set([...section.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const [, target] of section.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) assert.ok(ids.has(target), `${slug}: associated element ${target} exists`);
    if (!['', 'proje-hakkinda', 'iletisim'].includes(slug)) assert.ok(pages.get(slug).includes(`href="#${config.id}"`), `${slug}: page guide reaches its story`);
  }
});

test('every cinematic image candidate and local destination exists, including anchors and contact intent', async () => {
  for (const slug of routes) {
    const { items } = story(pages.get(slug));
    for (const item of items) {
      assert.ok(item.image.alt && item.image.width > 0 && item.image.height > 0, `${slug}: accessible image metadata`);
      const images = [item.image.src, ...item.image.srcset.split(',').map(candidate => candidate.trim().split(/\s+/)[0])];
      for (const image of images) assert.ok((await stat(join('dist', image))).isFile(), `${slug}: ${image} exists`);
      const destination = new URL(item.href, `https://ecolive.invalid/${slug ? `${slug}/` : ''}`);
      if (destination.protocol === 'mailto:') {
        assert.equal(slug, 'iletisim');
        assert.equal(destination.pathname, 'info@ecolive.com.tr');
        assert.ok(destination.searchParams.get('subject'));
        continue;
      }
      assert.equal(destination.origin, 'https://ecolive.invalid');
      const targetSlug = destination.pathname.replace(/^\/|\/$/g, '');
      assert.ok(pages.has(targetSlug), `${slug}: destination route ${targetSlug} exists`);
      if (destination.hash) assert.ok(pages.get(targetSlug).includes(`id="${decodeURIComponent(destination.hash.slice(1))}"`), `${slug}: ${destination.href} anchor exists`);
    }
  }
});

test('stories have a visible initial scene, lazy images and linked fallback chapters without JavaScript', () => {
  for (const [slug, html] of pages) {
    const { section } = story(html);
    const images = [...section.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
    assert.equal(images.length, 2);
    assert.match(images[0], /class="journey-image is-current"/);
    assert.match(images[0], /loading="lazy"/);
    assert.doesNotMatch(images[1], /\ssrc(?:set)?=/);
    const fallback = section.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1];
    assert.ok(fallback, `${slug}: readable no-JS content`);
    assert.equal((fallback.match(/<li>/g) || []).length, 3);
    assert.equal((fallback.match(/<a href=/g) || []).length, 3);
  }
});

test('missing stories fail during generation instead of silently copying unrelated content', () => {
  assert.throws(() => renderImmersiveJourney('unconfigured-page'), /Missing immersive journey/);
  const topicTitles = journeys.filter(item => !['', 'proje-hakkinda'].includes(item.slug)).flatMap(item => item.chapters.map(chapter => chapter.title));
  assert.equal(new Set(topicTitles).size, topicTitles.length, 'all 28 topic chapters have distinct headlines');
});
