# ECOLIVE

ECOLIVE proje tanıtım sitesi. Lanserhof referansındaki geniş görseller, serif ve sans-serif tipografi ve sade menü yaklaşımı; ECOLIVE’ın özgün içerikleri, logosu ve proje görselleriyle uygulandı.

## Çalıştırma

Node.js 18 veya üzeri yeterlidir. Yayındaki site harici JavaScript çalışma zamanı gerektirmez; üretim derlemesi geliştirme bağımlılığı olan esbuild kullanır.

```sh
npm ci
npm run dev
```

Yerel adres: http://127.0.0.1:4173/

```sh
npm run check
npm run build
npm run verify:build
npm run preview
```

`dist/` dizini statik barındırma için hazır dosyaları içerir. `npm run preview` sıkıştırma ve önbellek ayarlarıyla bu üretim sürümünü sunar; `npm run dev` düzenlenebilir kaynak dosyalarını sunar. Aynı portta yalnızca birini çalıştırın; başka port için `PORT=4174 npm run preview` kullanın. Sunucu, klasörlerdeki `index.html` dosyalarını sunmalıdır. Üretilen HTML dosyaları JavaScript olmadan da içerikleri ve sayfa bağlantılarını sunar. Canlıya aktarımda `dist/` içeriği ve sunucu ayarları birlikte kullanılmalıdır; ayrıntılar `deploy/README.md` dosyasındadır.

## Sayfalar

- `/`: Kaydırmayla ilerleyen tam ekran video açılışı, büyük görsel/metin blokları, altı konulu seçici, kuşaklar, mekânlar, yaşam döngüsü ve proje bölümleri.
- `/proje-hakkinda/`: Vizyon, yerleşim planı, yaşam yaklaşımı ve sık sorulan sorular.
- `/yasam-ve-mimari/`: Mekânlar, erişilebilirlik ve ortak yaşam.
- `/saglik-ve-iyi-yasam/`: Sağlık, bakım, hareket ve sosyal bağlar.
- `/egitim-ve-kusaklar/`: Doğayla öğrenme ve kuşaklar arası paylaşım.
- `/tarim-ve-uretim/`: Bahçeler, seralar ve ortak üretim.
- `/doga-ve-peyzaj/`: Peyzaj, yürüyüş rotaları ve mevsimler.
- `/enerji-ve-kaynaklar/`: Enerji, su ve organik kaynakların ilişkisi.
- `/iletisim/`: Konuya göre e-posta bağlantıları ve adres kopyalama.

Konu sayfaları bağımsız adreslere, başlıklara ve açıklama metalarına sahiptir. Geniş görseller, bölümlü anlatım ve fotoğraflı tam ekran menü bütün sayfalarda ortak tasarım dilini sürdürür. Konu seçicisindeki “Yakından tanıyın”, mekân görselleri ve menü bağlantıları ayrı sayfalara açılır. Çok sayfalı geliştirme, ana sayfayı sade bir kart dizinine dönüştürmeden yapılır. Kavramsal plan büyütülebilir bir pencerede açılmaya devam eder.

## Dosyalar ve düzenleme

- `index.html`: Ana sayfa ve paylaşılan üstbilgi, menü, altbilgi.
- `styles.css`: Ortak stil sistemi ve ana sayfa.
- `pages.css`: İç sayfaların farklı masaüstü ve mobil düzenleri.
- `interior.css`: Genişletilen iç sayfalardaki görsel anlatılar, tasarım ayrıntıları ve kampüs dizini. Yalnızca iç sayfalarda yüklenir.
- `motion.js`, `motion.css`: İçeriklerin bir kez belirmesi, açılış görselinin yavaş yakınlaşması ve seçili görsellerin kaydırmaya verdiği hafif tepki.
- `hero-scroll.js`, `hero-scroll.css`: Ana sayfanın sabitlenen video açılışı, kaydırma konumuna bağlı ileri/geri video ve başlığın yukarı çekilmesi.
- `waves.js`, `waves.css`: Dokuz sayfadaki tüm ana bölüm sınırları, altbilgi ve mobilde alt alta gelen görsel/metin panelleri için sakin dalgalar.
- `interactions.css`: Buton okları, bağlantılar ve ana menünün açılış hareketleri.
- `app.js`: Sayfa menüsü, altı konulu görsel seçici, aktif sayfa işaretlemesi, açılır sorular, kampüs planı ve e-posta kopyalama.
- `content.js`: Altı keşif alanının temel tanımları ve görselleri.
- `focus-data.js`: Görsel seçici için üretilmiş küçük tarayıcı veri modülü. Tam iç sayfa metinlerini tarayıcıya taşımaz; doğrudan düzenlemeyin.
- `page-content.js`: Altı konu sayfasının ayrıntılı Türkçe metinleri.
- `page-enrichment.js`: Konu sayfalarının ek anlatıları, tasarım ayrıntıları ve soruları.
- `project-content.js`: Proje süreci, sık sorulan sorular ve iletişim konuları.
- `project-enrichment.js`: Kampüs işlevleri, proje anlatısı ve iletişim rehberi.
- `scripts/generate-pages.mjs`: Ortak HTML ile içeriklerden sekiz iç sayfa üretir.
- `scripts/enriched-sections.mjs`: Ek anlatı, bölüm kısayolları ve soru bölümlerinin ortak HTML şablonları.
- `partials/map-dialog.html`: İç proje sayfasındaki büyütülebilir kampüs planı; ana sayfada da aynı plan penceresi bulunur.
- `assets/`: Optimize görseller, özgün logo ve yerel yazı tipleri.
- `assets/responsive/`, `responsive-images.json`: İçerik hash’i taşıyan ekran boyutlarına uygun görseller, mobil açılış posteri, logo ve favicon.
- `scripts/prepare-images.py`: Pillow ile kaynakları değiştirmeden görsel varyantlarını yeniden üretir; normal derleme için tekrar çalıştırılması gerekmez.
- `scripts/responsive-html.mjs`: Görsel manifestinden `srcset`, boyut bilgileri ve eşleşen ön yükleme bağlantıları üretir. Yakın kırpılan fotoğrafların `sizes` değerleri gerçek görüntü ölçeğini korur.
- `deploy/`: Barındırma ayarları ve üretim doğrulama betiği.
- `asset-manifest.json`: Görsellerin kaynak belgeleri ve sayfa bilgileri.
- `extra-assets.json`: İç sayfalara eklenen altı özgün sunum görselinin kaynak slaytları, boyutları ve kırpma önerileri.
- `page-enrichment-sources.json`: Ek metinler için sunum ve belge kaynak notları; yayın dosyalarına kopyalanmaz.

İç sayfa metinlerini içerik modüllerinde; düzenlerini `scripts/generate-pages.mjs` ve `pages.css` içinde değiştirin. Sonra `npm run build` çalıştırın. `npm run dev` başlarken de sayfaları üretir. Çalışan sunucu sırasında içerik veya ortak HTML değişirse `node scripts/generate-pages.mjs` ile yeniden üretip tarayıcıyı yenileyin. Üretilen klasörlerdeki HTML dosyalarını doğrudan düzenlemeyin; sonraki üretimde yenilenirler.

## İçerik ve kaynaklar

Projelendirme tamamlanmış; tanıtım ve izin süreçleri devam etmektedir. Bu bilgi iç çalışma bağlamıdır; ziyaretçiye yönelik metinlerde tekrarlanan durum şeritleri, izin süreci açıklamaları ve belge kaynak notları kullanılmaz. İçerik, projenin yaşam yaklaşımını ve tasarımını anlatır. Kesin enerji/karbon sonuçları, işletmeye alınmış hizmetler veya doğrulanmamış ortaklıklar vaat edilmez.

Görseller kullanıcının sağladığı katalog ve enerji sunumundan hazırlanmıştır; kavramsal görselleştirmelerdir. Özgün ECOLIVE logosu `ECOLIVE SUNUM 1607.pptx` içindeki logo nesnesinden alınmıştır. `info@ecolive.com.tr` adresi aynı sunumun ve `ECOLIVE SUNUM 1607_TR.pdf` dosyasının 49. sayfasında yer alır. İletişim bağlantıları e-posta uygulamasını açar; sunucuya veri gönderen bir form bulunmaz.

İç sayfaların ek görselleri, aynı sunumun gömülü özgün medya dosyalarından çıkarıldı; slayt üzerindeki metinler görsellere taşınmadı. Altı konu sayfasının her birine iki görsel anlatı, üç tasarım ayrıntısı ve üç soru eklendi. Proje sayfası altı kampüs işlevini birlikte açıklar; iletişim sayfası görüşmeye hazırlık bilgilerini içerir. Bu içerik genişletmesinde ana sayfanın bölüm sırası ve görsel ölçeği korunur.

## Hareket ve geçişler

Açılış görseli önceliklidir: poster çözümlenip ekrana çizildikten sonra video yüklenir; ilk kaydırma, belge veya fontların tamamlanması beklenmez. Kaydırma sırasında yalnızca indirilmiş karelere geçilir; hedef kare henüz yüklenmediyse mevcut görüntü korunur ve veri geldikçe en son kaydırma konumuna yetişilir. Yavaş indirme, sabit bir süre sonunda videoyu kalıcı olarak kapatmaz. Kaydırma alanı başlangıçta ayrıldığı için video yüklenirken bölüm yüksekliği değişmez. Mobil kategori seçeneklerinin metin kontrastı artırılmıştır.

Üretim derlemesi her sayfada tek CSS dosyası ve ortak bir JavaScript giriş modülü sunar. Galeri, kampüs keşfi, günün ritmi ve dekoratif ayrıntılar kendi bölümlerine yaklaşınca ayrı modüller olarak yüklenir. Açılış videosu ve sinematik yolculuğun kaydırma alanları, doğrudan bölüm bağlantılarının konumunu korumak için ilk yüklemede hazırlanır; medya yüklemesi kendi görünürlük kurallarını izler. Fontlar ve responsive görseller gibi bu dosyalar da içerik hash’i taşır; bir yıllık güvenli önbellek kullanabilir. HTML yeniden doğrulanır. Brotli/gzip sıkıştırması, kaynak dosyalarını düzenlenebilir bırakırken aktarım boyutunu azaltır. Ana sayfa iç sayfalara özgü `pages.css` dosyasını yüklemez. Görsel seçici, seçilen fotoğrafın `srcset` ve `sizes` bilgilerini birlikte günceller.

Ana sayfada kullanıcının sağladığı `Home Video (2).mp4` videosunun 10,04 saniyelik web sürümleri kullanılır. Masaüstünde yaklaşık 1,2 ekran, mobilde 0,7 ekran kaydırma boyunca görüntü sabitlenir; video konumu kaydırmayla ileri/geri değişir, başlık yukarı çekilip silinir ve ardından dalgalı bölüm görünür. Otomatik oynatma, ses veya kaydırmayı ele geçiren bir kontrol yoktur. `assets/video/` altında 1600×900 masaüstü MP4 (4,02 MB), 960×540 mobil MP4 (1,64 MB) ve aynı sahnenin mevcut ilk kare WebP görseli bulunur. Video adları içerik hash’i taşır; yeni yayında eski video önbelleği kullanılmaz. Bir ziyarette yalnızca uygun video sürümü yüklenir. H.264 dosyaları 24 fps, 12 karelik anahtar kare aralığı (0,5 saniye) ve faststart ile hazırlanmıştır. Yeni kaynakta yalnızca ilk kare anahtar kare olduğundan, kaydırmayla hızlı erişim için iki geçişli kodlama uygulanmıştır: masaüstü 3200 kbit/sn, mobil 1300 kbit/sn. Yerel sunucu video için byte-range isteklerini destekler; yayın sunucusu da MP4 MIME türünü ve byte-range isteklerini desteklemelidir. Azaltılmış hareket/veri tasarrufu tercihinde veya video yüklenemediğinde normal boydaki sabit görsel kullanılır. İç sayfalar video indirmez.

Animasyon katmanı, onaylanan sayfa yerleşimlerini ve içerikleri korur. İç sayfaların açılış fotoğrafı yavaşça yakınlaşır; başlıklar ve paragraflar ilk kez görünürken kısa aralıklarla belirir. Kaydırma sırasında ana sayfa ve iç sayfalardaki fotoğraflar ile bölüm dalgaları küçük hareketlerle tepki verir. Plan ve şema görselleri sabit kalır. Dalga, yeni bölümün gerçek yüzeyine uygulanan bir maske ile oluşturulur; yan yana fotoğraflar ve renk geçişli zeminler aynı eğriyi izler. Dokuz sayfadaki tüm ana bölüm sınırları, altbilgi geçişleri dahil kapsanır. Ayrıca tam genişlikteki kart alanları ve mobilde alt alta gelen görsel/metin panelleri de dalgayla bağlanır. Kısa yönlendirme alanlarında, yazıların eğriler tarafından örtülmemesi için ek boşluk bırakılır. Kartların ve bağlantıların metinleri ayrı olarak belirir; kontroller kullanılabilir kalır.

Kaydırma takibi pasif dinleyiciler ve tek planlanan animasyon karesiyle yapılır. Mobilde hareket mesafeleri küçülür. `prefers-reduced-motion` tercihinde içerikler doğrudan görünür ve dekoratif hareketler kapatılır. JavaScript çalışmadığında metinler varsayılan olarak görünür kalır.

Cormorant Garamond ve DM Sans yerel font dosyalarıyla sunulur; OFL lisansları `assets/fonts/` içindedir. Lanserhof’un ticari yazı tipleri veya görselleri kullanılmamıştır.

Genel yayına geçerken kesin alan adı, sosyal paylaşım adresleri ve kurumun gerekli yasal metinleri ayrıca tamamlanmalıdır.
# Yaşayan tasarım katmanı

`organic.js` / `organic.css`, yalnızca işaretlenmiş metin yüzeylerine organik SVG çizgileri ve imleçle değişen hafif aydınlık ekler. Fotoğraf/video içeren yüzeyler bu katmana alınmaz. `living-cycle.js` / `living-cycle.css`, ana sayfadaki `#yasayan-dongu` bölümünü ve enerji sayfasındaki kaynak diyagramını geliştirir. `living-campus.js` / `living-campus.css`, mevcut kampüs planı penceresine beş seçilebilir alan ve ilgili içerikleri ekler.

Sağ alttaki hareket kontrolü, tarayıcıda saklanan tercihi bütün sayfalarda uygular. İşletim sisteminin azaltılmış hareket tercihi önceliklidir. Döngü çizimleri ekran dışında ve gizli sekmede durur; metin yüzeylerinin animasyonları da görünürlükle duraklatılır. Scroll videosu duraklatıldığında mevcut sahne ve sayfa yüksekliği korunur, başlık ve bağlantılar görünür kalır.

İç sayfalarda `living-experiences-life.js`, `living-experiences-nature.js` ve `living-experiences-project.js` içerik modülleri, yedi konuya özgü keşif bölümü tanımlar. `scripts/living-experiences.mjs` bu bölümleri derleme sırasında HTML ve yalnız ilgili sayfanın seçim verileri olarak üretir; tüm sayfa metinleri ortak JavaScript paketine girmez. İlk fotoğraf ve metin statiktir; JavaScript kapalıyken diğer içerikler de bağlantılarıyla gösterilir. Seçimler görsel, açıklama ve bağlantıyı birlikte günceller. Ok tuşları, Home/End ve önceki/sonraki kontrolleri desteklenir. İletişimde seçim yalnız e-posta konusu hazırlar.

Yerel kontrol: `npm run check`, `npm run build`, `npm run verify:build`, `npm run verify:hero`, `npm run verify:cycle`. Önizleme: `npm run preview` → `http://127.0.0.1:4173/#yasayan-dongu`.


`day-rhythm.js` / `day-rhythm.css`, ana sayfa ve proje sayfasındaki `#gunun-ritmi` bölümünün dört seçilebilir anını yönetir. Metin ve görseller `day-rhythm-content.js` ile `scripts/day-rhythm.mjs` üzerinden statik üretilir. Saat çizelgesi veya hizmet programı sunmaz; kampüsün yaşam yaklaşımını gündelik anlarla anlatır. Görseller seçilince yüklenir, çözümlenen yeni fotoğraf hazır olduğunda geçiş yapılır. Hızlı seçimlerde eski isteklerin sonucu uygulanmaz. Klavye ve native range kontrolü desteklenir; otomatik ilerleme yoktur. Davranış kontrolü: `npm run verify:day`.

`living-details.js` / `living-details.css`, tasarım ayrıntıları ve proje yaklaşımındaki numaralara kaydırmayla ilerleyen ince halkalar ekler. Görünür gruplar tek scroll karesinde değerlendirilir; boşta sürekli çizim yapılmaz. Fotoğrafların üzerine katman eklenmez. İlgili sayfa kartlarının okları hover ve klavye odağında bir çevre çizgisiyle belirginleşir. Bütün bu hareketler ortak duraklatma ve azaltılmış hareket tercihini izler.

`immersive-journey.js` / `immersive-journey.css`, dokuz sayfadaki dört sahneli görsel yolculukları yönetir. Ana sayfa ve proje sayfasının `#yasamin-izinde` anlatısı `journey-content.js` içinde kalır. Diğer yedi sayfanın 28 özgün sahnesi `journey-content-life.js`, `journey-content-nature.js` ve `journey-content-contact.js` dosyalarında düzenlenir. `scripts/immersive-journey.mjs` yalnız ilgili sayfanın anlatısını statik HTML ve seçim verisi olarak üretir; bütün sayfa içerikleri ortak JavaScript paketine eklenmez. Konu sayfalarının bölüm menüsündeki “Görsel yolculuk” bağlantısı ilgili anlatıya gider. Geniş ve yeterince yüksek ekranlarda doğal sayfa kaydırması, sabit fotoğraf penceresindeki sahneleri değiştirir; tekerlek ve dokunma olayları engellenmez. Dar veya kısa ekranlarda ve azaltılmış hareket tercihinde bölüm seçilerek gezilir. Fotoğraf çözümlenmeden mevcut görsel ve açıklaması kaldırılmaz; eski isteklerin sonuçları uygulanmaz. Duraklatma masaüstündeki sayfa yüksekliğini korur. Davranış kontrolü: `npm run verify:journey`. Derleme sonrasında sayfa, görsel, bağlantı, erişilebilir ilişkilendirme ve JavaScript olmadan içerik kontrolleri: `npm run verify:journey-pages`.

`cinematic-details.js` / `cinematic-details.css`, statik anlatı fotoğraflarının çerçevesini ilk görünüşte kavisle açar ve konu sayfalarındaki büyük alıntılara çizilen bir vurgu ekler. `ambient-details.js` / `ambient-details.css`, yalnız metin zeminlerinde imlece tepki veren ince izler, bağlantı oklarında küçük yön hareketleri ve dokunmada yayılan halkalar oluşturur. Fotoğrafların renkleri ve yerleşimleri, metinlerin konumu ve bağlantıların tıklama alanları korunur. Hareketler ortak duraklatma, azaltılmış hareket, görünürlük ve sayfa yaşam döngüsüyle birlikte yönetilir; yeni katmanlar boşta sürekli animasyon karesi çalıştırmaz.


## Yaşamın İçine — ortak site tasarımı

Dokuz sayfanın yeni görsel dili `experience.css` içinde tanımlanır. `experience-content.js` konuya özgü açılış başlıklarını, açıklamalarını ve görsellerini; `scripts/scene-layout.mjs` bu sahnelerin HTML yapısını içerir. Ana sayfanın video açılışı `index.html` içinde kalır. Serif başlıkların normal ve italik yüzleri yerel font dosyalarıyla sunulur.

`scene-navigation.js/css` mevcut native menü penceresini tam ekran görsel navigasyona dönüştürür. Önizlemeler, hedef sayfaların gerçek açılış görsellerinden `scene-images.js` dosyasına otomatik üretilir. Bu dosyayı doğrudan düzenlemeyin. Destekleyen masaüstü tarayıcılarda yerel sayfa geçişi, seçilen fotoğrafı hedef açılışa taşır; diğer tarayıcılarda bağlantılar normal çalışır.

`scripts/campus-explorer.mjs` ana sayfa ve proje sayfasına açıklamalı, beş bölgeli kampüs keşfini ekler. `campus-explorer.js/css` planın yakınlaşmasını, seçimleri ve eşzamanlı detay değişimini yönetir. Koordinatlar mevcut Türkçe planla aynıdır. Büyütülmüş plan penceresi ayrıca kullanılabilir.

`scripts/spatial-gallery.mjs` her sayfaya konuya özgü dört görsellik seçki üretir. `spatial-gallery.js/css` masaüstünde değişken ölçekte kompozisyon, mobilde doğal yatay kaydırma ve fotoğrafın bulunduğu yerden açılan native dialog kullanır. Escape veya kapatma düğmesi fotoğrafı yerine, klavye odağını ilgili bağlantıya döndürür. JavaScript olmadan görseller doğrudan açılabilir. Tüm yeni hareketler ortak duraklatma ve azaltılmış hareket tercihini izler.

Bu tasarım, 21st.dev üzerindeki [Immersive Full Screen Navigation](https://21st.dev/@hyperiux/components/immersive-full-screen-nav), [Immersive Scroll Gallery](https://21st.dev/@ishamsu/components/immersive-scroll-gallery) ve [Okuda Vale](https://21st.dev/@neebarp/templates/okuda-vale-architecture-studio-template) etkileşim araştırmasından geliştirildi. Bileşen kodu aktarılmadı; mevcut bağımsız HTML/JS yapısına özgü uygulandı.

Yeni bütünlük kontrolü: `npm run build && npm run verify:experience`. Dokuz sayfanın başlık, kimlik, yerel bağlantı, görsel, galeri ve menü-açılış eşleşmelerini doğrular. Önceki `verify:journey`, `verify:journey-pages`, `verify:hero` ve `verify:build` kontrolleri de geçerlidir. Önizleme: `http://127.0.0.1:4173/`.

## Performans ve içerik düzenlemesi

- `deferred-features.js`: Görünmeye yaklaşan bileşenleri yükler; klavye odağını da izler. Başarısız indirme, statik içeriği korur ve sonraki etkileşimde yeniden denenebilir. Davranış kontrolü: `npm run verify:loading`.
- Derleme, kullanılmayan kampüs ve gün bileşenlerinin CSS dosyalarını ilgili sayfalardan çıkarır. Dinamik sınıfları silen genel bir CSS temizliği uygulanmaz. İlk girişin ortak bağımlılığı `modulepreload` ile sunulur; isteğe bağlı modüller önden indirilmez.
- Kaydırma sırasında metin, görsel ve dalga ölçümleri görünür alana yakın öğelerle sınırlıdır. İmleç hareketleri tek animasyon karesinde birleştirilir. Sayfa yüksekliği değişmedikçe okuma ilerlemesi yeniden düzen ölçümü istemez.
- Dalga animasyonu yalnızca üst kenar görünürken güncellenir; aynı konumdaki tekrarlar stil yazmaz. Sinematik yolculuk ve galeri, uzun bölümün tamamı yerine yalnızca sığ dalga kenarını maskeler. Görünürlük, ileri/geri giriş, duraklatma ve mobil davranış kontrolü: `npm run verify:scroll`.
- Ana içerik, SSS, görsel altyazıları, menü, etkileşim açıklamaları ve iletişim metinleri profesyonel Türkçeyle düzenlendi. Proje verileri ve bağlantılar korundu.
- Yayına aktarılırken HTML, ana modül ve bütün hashli parçalar birlikte aktarılmalıdır. Açık oturumların eski parçaları yükleyebilmesi için eski hashli dosyalar dağıtım sırasında hemen silinmemelidir.
