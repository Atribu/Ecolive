import { readFile } from "node:fs/promises";
import { responsiveImage } from "./responsive-html.mjs";

const originalAssets = JSON.parse(await readFile(new URL("../asset-manifest.json", import.meta.url), "utf8")).assets;
const extraAssets = JSON.parse(await readFile(new URL("../extra-assets.json", import.meta.url), "utf8")).assets;
const assets = [...originalAssets, ...extraAssets];
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const sizes = "(max-width: 700px) 88vw, (max-width: 1000px) 44vw, 48vw";

const scenes = {
  living: ["assets/living.webp", "Bahçeyle bütünleşen konutlar", "YAŞAM ALANLARI", "Ahşap yüzeyler, yeşil çatılar ve bahçeye yönelen açıklıklar konutların mimari karakterini belirliyor. Yaşam birimleri, kişisel mahremiyeti korurken açık havaya doğrudan erişim sağlayacak biçimde tasarlandı."],
  lounge: ["assets/extra/shared-lounge.webp", "Paylaşıma açık ortak salon", "ORTAK MEKÂNLAR", "Gün ışığı alan ortak salon, bahçeyle görsel bütünlük içinde tasarlandı. Farklı oturma düzenleri; sohbet, okuma ve dinlenme için hem ortak hem de daha sakin kullanım seçenekleri sunuyor."],
  lake: ["assets/extra/lakeside-landscape.webp", "Gölet kıyısında dinlenme", "GÖLET KIYISI", "Gölet kıyısındaki ahşap platformlar, açık manzaraya yönelen dinlenme alanları oluşturuyor. Bahçe yollarıyla bağlantılı bu noktalar, yürüyüşe ara vermek ve açık havada zaman geçirmek için düzenlendi."],
  learning: ["assets/extra/learning-greenhouse.webp", "Serada uygulamalı öğrenme", "YAŞAYAN ÖĞRENME", "Seradaki yetiştirme masaları, bitkilerin gelişimini yakından izlemeye ve üretim süreçlerini deneyimlemeye olanak tanıyor. Mekân, çocuklarla yetişkinlerin bilgi ve deneyim paylaşabileceği bir uygulamalı öğrenme ortamı olarak tasarlandı."],
  botanic: ["assets/extra/botanic-workshop.webp", "Bahçede ortak üretim", "BAHÇE VE ATÖLYE", "Narenciye ağaçları arasındaki atölye alanı, bitki bakımı ve bahçecilik çalışmalarına ayrılıyor. Ortak çalışma düzeni, farklı yaş gruplarının üretime katılmasını ve deneyimlerini paylaşmasını destekliyor."],
  rehabilitation: ["assets/extra/rehabilitation-interior.webp", "Hareketi destekleyen tasarım", "BAKIM VE MEKÂN", "Bahçeye yönelen rehabilitasyon alanında gün ışığı, rahat dolaşım ve bireysel destek ihtiyaçları birlikte ele alındı. Mekânsal düzen, hareket ve bakım çalışmalarını günlük yaşam çevresiyle bütünleştirmeyi amaçlıyor."],
  wellness: ["assets/extra/wellness-treatment.webp", "Dinlenme ve kişisel bakım", "KİŞİSEL ZAMAN", "Doğal dokular ve bahçeye yönelen açıklıklar, iyi yaşam mekânlarında sakin bir atmosfer oluşturuyor. Mahremiyet ve konfor, dinlenme ve kişisel bakım alanlarının tasarımında öncelikli."],
  landscape: ["assets/hero.webp", "Peyzajla bütünleşen mimari", "PEYZAJLA BÜTÜNLÜK", "Bahçe yolları, ağaç grupları ve yeşil çatılar yerleşimin bütününde süreklilik oluşturuyor. Peyzaj, konutları ve ortak alanları birleştiren temel tasarım öğelerinden biri."],
  greenhouse: ["assets/greenhouses.webp", "Yaşamın parçası olan üretim", "SERA VE BAHÇE", "Seralar ve narenciye bahçeleri, tarımsal üretimi yerleşkenin günlük yaşamıyla bütünleştiriyor. Üretim alanlarının eğitim ve sosyal mekânlarla yakınlığı, ortak çalışmalar için farklı olanaklar sunuyor."],
  solar: ["assets/solar.webp", "Güneş enerjisine ayrılan alanlar", "KAYNAKLARA ÖZEN", "Güneş enerjisi sistemleri, konutların, ortak alanların ve seraların enerji ihtiyaçları birlikte değerlendirilerek projelendirildi. Sistemlerin yerleşimi, mimari ve üretim alanlarıyla bütünlük içinde ele alındı."],
};

const pages = {
  "": { intro: "Konutlardan ortak salonlara, öğrenme ortamlarından gölet kıyısına: ECOLIVE’ın mimari karakterini ve günlük yaşama yaklaşımını dört farklı mekân üzerinden keşfedin.", line: "Işık. Doku. Yaşam.", items: ["living", "lounge", "learning", "lake"] },
  "proje-hakkinda": { intro: "Konutlar, bahçeler, atölyeler ve ortak salonlar aynı yerleşim anlayışını tamamlıyor. Projenin mimari ve sosyal yaklaşımını seçili mekânlar üzerinden inceleyin.", line: "Mimari ve doğa.", items: ["landscape", "living", "botanic", "lounge"] },
  "yasam-ve-mimari": { intro: "Gün ışığı, doğal malzemeler ve bahçeye açılan mekânlar ECOLIVE’ın mimarisine yön veriyor. Konutlarla ortak alanlar arasındaki geçişleri yakından inceleyin.", line: "İçeriden dışarıya.", items: ["living", "lounge", "landscape", "lake"] },
  "saglik-ve-iyi-yasam": { intro: "Rehabilitasyon, kişisel bakım, sosyal yaşam ve dinlenme alanlarını keşfedin. Her mekân, bireysel ihtiyaçları ve günlük yaşama katılımı gözeten tasarım anlayışını yansıtıyor.", line: "Kendinize zaman.", items: ["rehabilitation", "wellness", "lounge", "lake"] },
  "egitim-ve-kusaklar": { intro: "Sera, bahçe atölyesi ve ortak salonlar farklı öğrenme biçimlerini destekliyor. Gözlem, uygulama ve deneyim paylaşımına ayrılan bu ortamları keşfedin.", line: "Birlikte öğrenmek.", items: ["learning", "lounge", "botanic", "landscape"] },
  "tarim-ve-uretim": { intro: "Seralar, narenciye bahçeleri ve botanik atölyeleri yerleşkenin üretim çevresini oluşturuyor. Tarımın öğrenme ve ortak etkinliklerle nasıl bütünleştiğini inceleyin.", line: "Topraktan yaşama.", items: ["greenhouse", "learning", "botanic", "landscape"] },
  "doga-ve-peyzaj": { intro: "Gölet kıyıları, gölgeli bahçeler ve konutlara ulaşan yaya yolları yerleşkeyi birleştiriyor. Açık alanların farklı kullanım olanaklarını seçili manzaralar üzerinden keşfedin.", line: "Doğanın içinde.", items: ["lake", "landscape", "botanic", "living"] },
  "enerji-ve-kaynaklar": { intro: "Enerji sistemleri, seralar, konutlar ve peyzaj aynı kaynak yönetimi yaklaşımı içinde ele alınıyor. Bu yaklaşımın yerleşim planına nasıl yansıdığını inceleyin.", line: "Kaynaklara özen.", items: ["solar", "greenhouse", "living", "lake"] },
  "iletisim": { intro: "ECOLIVE hakkında görüşmeden önce yaşam alanlarını, ortak mekânları ve üretim ortamlarını tanıyın. İlgilendiğiniz konuya ilişkin sorularınızı bizimle paylaşabilirsiniz.", line: "Yakından tanıyın.", items: ["lounge", "living", "learning", "lake"] },
};

function resolveScene(key) {
  const [file, title, label, text] = scenes[key];
  const source = assets.find(asset => (asset.file || asset.filename) === file);
  const image = responsiveImage(file, sizes);
  if (!source || !image.srcset) throw new Error(`Missing spatial gallery image: ${file}`);
  return { title, label, text, image: { ...image, alt: source.alt_tr, position: source.suggested_object_position || "50% 45%" } };
}

export function renderSpatialGallery(slug = "") {
  const page = pages[slug];
  if (!page) throw new Error(`Missing spatial gallery page: ${slug}`);
  const items = page.items.map(resolveScene);
  const id = `mekanin-ruhu${slug ? `-${slug}` : ""}`;
  return `<section class="spatial-gallery" id="${id}" data-spatial-gallery aria-labelledby="${id}-title">
    <header class="spatial-heading"><div><span class="micro">MEKÂNLARDAN BİR SEÇKİ</span><h2 id="${id}-title">Mekânın <em>ruhu.</em></h2></div><div class="spatial-intro"><p>${esc(page.intro)}</p><span class="spatial-invitation">Bir görsel seçin, yakından keşfedin <span aria-hidden="true">↗</span></span></div></header>
    <div class="spatial-composition" data-spatial-composition><span class="spatial-whisper" aria-hidden="true">${esc(page.line)}</span>${items.map((item, index) => `<figure class="spatial-card spatial-card-${index + 1}" data-spatial-card>
      <a class="spatial-image-link" href="${esc(item.image.src)}" data-spatial-open="${index}" aria-label="${esc(item.title)} — görseli büyüt" aria-haspopup="dialog" aria-controls="${id}-dialog"><div class="spatial-image-window"><img src="${esc(item.image.src)}" srcset="${esc(item.image.srcset)}" sizes="${sizes}" width="${item.image.width}" height="${item.image.height}" alt="${esc(item.image.alt)}" loading="lazy" decoding="async" style="object-position:${esc(item.image.position)}"></div><span class="spatial-open-mark" aria-hidden="true">↗</span><span class="spatial-image-label" aria-hidden="true">${esc(item.label)}</span></a>
      <figcaption><span class="spatial-number">0${index + 1}</span><h3>${esc(item.title)}</h3><span class="spatial-caption-arrow" aria-hidden="true">↗</span></figcaption>
    </figure>`).join("")}</div>
    <div class="spatial-bottom"><span>ECOLIVE / MEKÂN SEÇKİSİ</span><span>04 BAKIŞ, BİR YAŞAM FİKRİ</span></div>
    <dialog class="spatial-dialog" id="${id}-dialog" aria-labelledby="${id}-dialog-title" aria-describedby="${id}-dialog-copy" data-spatial-dialog>
      <div class="spatial-dialog-veil" data-spatial-veil aria-hidden="true"></div>
      <div class="spatial-dialog-top"><span>ECOLIVE <span aria-hidden="true">/</span> MEKÂNIN RUHU</span><button type="button" class="spatial-close" data-spatial-close autofocus aria-label="Görseli kapat ve galeriye dön"><span>KAPAT</span><span aria-hidden="true">×</span></button></div>
      <div class="spatial-dialog-image" data-spatial-target><img data-spatial-detail-image alt="" decoding="async"></div>
      <div class="spatial-dialog-caption" data-spatial-caption><div><span class="micro" data-spatial-detail-label></span><h3 id="${id}-dialog-title" data-spatial-detail-title></h3></div><p id="${id}-dialog-copy" data-spatial-detail-copy></p><span class="spatial-dialog-count" data-spatial-detail-count></span></div>
    </dialog>
    <script type="application/json" data-spatial-items>${JSON.stringify(items).replaceAll("<", "\\u003c")}</script>
  </section>`;
}
