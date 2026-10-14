# ECOLIVE

ECOLIVE proje tanıtım sitesi. Lanserhof referansındaki geniş görseller, serif ve sans-serif tipografi ve sade menü yaklaşımı; ECOLIVE’ın özgün içerikleri, logosu ve proje görselleriyle uygulandı.

## Çalıştırma

Node.js 18 veya üzeri yeterlidir. Harici JavaScript bağımlılığı bulunmaz.

```sh
npm run dev
```

Yerel adres: http://127.0.0.1:4173/

```sh
npm run check
npm run build
```

`dist/` dizini statik barındırma için hazır dosyaları içerir. Sunucu, klasörlerdeki `index.html` dosyalarını sunmalıdır. Başka port kullanmak için `PORT=4174 npm run dev` komutunu çalıştırın. Üretilen HTML dosyaları JavaScript olmadan da içerikleri ve sayfa bağlantılarını sunar.

## Sayfalar

- `/`: Orijinal tam ekran açılış, büyük görsel/metin blokları, altı konulu seçici, kuşaklar, mekânlar, yaşam döngüsü ve proje bölümleri.
- `/proje-hakkinda/`: Vizyon, yerleşim planı, yaşam yaklaşımı ve sık sorulan sorular.
- `/yasam-ve-mimari/`: Mekânlar, erişilebilirlik ve ortak yaşam.
- `/saglik-ve-iyi-yasam/`: Sağlık, bakım, hareket ve sosyal bağlar.
- `/egitim-ve-kusaklar/`: Doğayla öğrenme ve kuşaklar arası paylaşım.
- `/tarim-ve-uretim/`: Bahçeler, seralar ve ortak üretim.
- `/doga-ve-peyzaj/`: Peyzaj, yürüyüş rotaları ve mevsimler.
- `/enerji-ve-kaynaklar/`: Enerji, su ve organik kaynakların ilişkisi.
- `/iletisim/`: Konuya göre e-posta bağlantıları ve adres kopyalama.

Konu sayfaları bağımsız adreslere, başlıklara ve açıklama metalarına sahiptir. Ana sayfanın ilk tasarımındaki görsel ölçeği, bölümlü akışı ve sade pill menü korunur. Konu seçicisindeki “Yakından tanıyın”, mekân görselleri ve menü bağlantıları ayrı sayfalara açılır. Çok sayfalı geliştirme, ana sayfayı sade bir kart dizinine dönüştürmeden yapılır. Kavramsal plan büyütülebilir bir pencerede açılmaya devam eder.

## Dosyalar ve düzenleme

- `index.html`: Ana sayfa ve paylaşılan üstbilgi, menü, altbilgi.
- `styles.css`: Ortak stil sistemi ve ana sayfa.
- `pages.css`: İç sayfaların farklı masaüstü ve mobil düzenleri.
- `interior.css`: Genişletilen iç sayfalardaki görsel anlatılar, tasarım ayrıntıları ve kampüs dizini. Yalnızca iç sayfalarda yüklenir.
- `motion.js`, `motion.css`: İçeriklerin bir kez belirmesi, açılış görselinin yavaş yakınlaşması ve seçili görsellerin kaydırmaya verdiği hafif tepki.
- `waves.js`, `waves.css`: Dokuz sayfadaki tüm ana bölüm sınırları, altbilgi ve mobilde alt alta gelen görsel/metin panelleri için sakin dalgalar.
- `interactions.css`: Buton okları, bağlantılar ve ana menünün açılış hareketleri.
- `app.js`: Sayfa menüsü, altı konulu görsel seçici, aktif sayfa işaretlemesi, açılır sorular, kampüs planı ve e-posta kopyalama.
- `content.js`: Altı keşif alanının temel tanımları ve görselleri.
- `page-content.js`: Altı konu sayfasının ayrıntılı Türkçe metinleri.
- `page-enrichment.js`: Konu sayfalarının ek anlatıları, tasarım ayrıntıları ve soruları.
- `project-content.js`: Proje süreci, sık sorulan sorular ve iletişim konuları.
- `project-enrichment.js`: Kampüs işlevleri, proje anlatısı ve iletişim rehberi.
- `scripts/generate-pages.mjs`: Ortak HTML ile içeriklerden sekiz iç sayfa üretir.
- `scripts/enriched-sections.mjs`: Ek anlatı, bölüm kısayolları ve soru bölümlerinin ortak HTML şablonları.
- `partials/map-dialog.html`: İç proje sayfasındaki büyütülebilir kampüs planı; ana sayfada da aynı plan penceresi bulunur.
- `assets/`: Optimize görseller, özgün logo ve yerel yazı tipleri.
- `asset-manifest.json`: Görsellerin kaynak belgeleri ve sayfa bilgileri.
- `extra-assets.json`: İç sayfalara eklenen altı özgün sunum görselinin kaynak slaytları, boyutları ve kırpma önerileri.
- `page-enrichment-sources.json`: Ek metinler için sunum ve belge kaynak notları; yayın dosyalarına kopyalanmaz.

İç sayfa metinlerini içerik modüllerinde; düzenlerini `scripts/generate-pages.mjs` ve `pages.css` içinde değiştirin. Sonra `npm run build` çalıştırın. `npm run dev` başlarken de sayfaları üretir. Çalışan sunucu sırasında içerik veya ortak HTML değişirse `node scripts/generate-pages.mjs` ile yeniden üretip tarayıcıyı yenileyin. Üretilen klasörlerdeki HTML dosyalarını doğrudan düzenlemeyin; sonraki üretimde yenilenirler.

## İçerik ve kaynaklar

Projelendirme tamamlanmış; tanıtım ve izin süreçleri devam etmektedir. Bu bilgi iç çalışma bağlamıdır; ziyaretçiye yönelik metinlerde tekrarlanan durum şeritleri, izin süreci açıklamaları ve belge kaynak notları kullanılmaz. İçerik, projenin yaşam yaklaşımını ve tasarımını anlatır. Kesin enerji/karbon sonuçları, işletmeye alınmış hizmetler veya doğrulanmamış ortaklıklar vaat edilmez.

Görseller kullanıcının sağladığı katalog ve enerji sunumundan hazırlanmıştır; kavramsal görselleştirmelerdir. Özgün ECOLIVE logosu `ECOLIVE SUNUM 1607.pptx` içindeki logo nesnesinden alınmıştır. `info@ecolive.com.tr` adresi aynı sunumun ve `ECOLIVE SUNUM 1607_TR.pdf` dosyasının 49. sayfasında yer alır. İletişim bağlantıları e-posta uygulamasını açar; sunucuya veri gönderen bir form bulunmaz.

İç sayfaların ek görselleri, aynı sunumun gömülü özgün medya dosyalarından çıkarıldı; slayt üzerindeki metinler görsellere taşınmadı. Altı konu sayfasının her birine iki görsel anlatı, üç tasarım ayrıntısı ve üç soru eklendi. Proje sayfası altı kampüs işlevini birlikte açıklar; iletişim sayfası görüşmeye hazırlık bilgilerini içerir. Bu içerik genişletmesinde ana sayfanın bölüm sırası ve görsel ölçeği korunur.

## Hareket ve geçişler

Animasyon katmanı, onaylanan sayfa yerleşimlerini ve içerikleri korur. Açılışta yalnızca fotoğraf yavaşça yakınlaşır; başlıklar ve paragraflar ilk kez görünürken kısa aralıklarla belirir. Kaydırma sırasında ana sayfa ve iç sayfalardaki fotoğraflar ile bölüm dalgaları küçük hareketlerle tepki verir. Plan ve şema görselleri sabit kalır. Dalga, yeni bölümün gerçek yüzeyine uygulanan bir maske ile oluşturulur; yan yana fotoğraflar ve renk geçişli zeminler aynı eğriyi izler. Dokuz sayfadaki tüm ana bölüm sınırları, altbilgi geçişleri dahil kapsanır. Ayrıca tam genişlikteki kart alanları ve mobilde alt alta gelen görsel/metin panelleri de dalgayla bağlanır. Kısa yönlendirme alanlarında, yazıların eğriler tarafından örtülmemesi için ek boşluk bırakılır. Kartların ve bağlantıların metinleri ayrı olarak belirir; kontroller kullanılabilir kalır.

Kaydırma takibi pasif dinleyiciler ve tek planlanan animasyon karesiyle yapılır. Mobilde hareket mesafeleri küçülür. `prefers-reduced-motion` tercihinde içerikler doğrudan görünür ve dekoratif hareketler kapatılır. JavaScript çalışmadığında metinler varsayılan olarak görünür kalır.

Cormorant Garamond ve DM Sans yerel font dosyalarıyla sunulur; OFL lisansları `assets/fonts/` içindedir. Lanserhof’un ticari yazı tipleri veya görselleri kullanılmamıştır.

Genel yayına geçerken kesin alan adı, sosyal paylaşım adresleri ve kurumun gerekli yasal metinleri ayrıca tamamlanmalıdır.
