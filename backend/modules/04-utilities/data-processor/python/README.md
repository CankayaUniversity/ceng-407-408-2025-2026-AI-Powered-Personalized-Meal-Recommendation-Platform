# MealAI Data Processor (Python)

Bu dizin, MealAI projesinin yemek tarifi ve malzeme verilerini işleyen Python tabanlı ETL (Extract, Transform, Load) araçlarını içerir. Excel dosyalarını temizler, mutfak standartlarına göre normalize eder (yoğunluk/density ataması) ve PostgreSQL veritabanına aktarır.

## Kurulum (Hızlı Başlangıç)

Gerekli Python ortamını (sanal ortam ve bağımlılıklar) otomatik olarak hazırlamak için işletim sisteminize uygun scripti çalıştırın:

### macOS / Linux (Bash)
```bash
# Dizine gidin: backend/modules/04-utilities/data-processor/python/
chmod +x setup_env.sh
./setup_env.sh
```

### Windows (CMD/PowerShell)
```cmd
setup_env.bat
```

Bu scriptler; `.venv` oluşturur, `pip`'i günceller ve `requirements.txt` içerisindeki (pandas, sqlalchemy, thefuzz, openpyxl vb.) tüm bağımlılıkları yükler.

---

## Önemli: "Module Not Found" Hataları

Eğer `No module named 'pandas'` gibi hatalar alıyorsanız:
1. **Sanal Ortamı Aktif Edin:** - macOS/Linux: `source .venv/bin/activate`
    - Windows: `.venv\Scripts\activate`
2. **Interpreter Kontrolü:** IDE'nizin (IntelliJ/PyCharm) bu dizindeki `.venv` içindeki Python'ı kullandığından emin olun.

---

## IDE Yapılandırması (Polyglot Yapı)

Proje ana motor olarak **Java 21 (Zulu)** kullanmaktadır. Python scriptlerinin Java yapısını bozmadan çalışması için:

### 1. Java SDK (Zulu 21)
`Project Structure` -> `Project` sekmesindeki SDK ayarı **Zulu 21** olarak kalmalıdır. Bunu değiştirmeyin.

### 2. Python SDK Tanımlama
- `File` -> `Project Structure` -> `Platform Settings` -> **SDKs** kısmına gidin.
- `+` -> `Add Python SDK` -> `Existing Environment` seçin.
- Yol olarak bu dizindeki `.venv/bin/python` (veya Windows'ta `Scripts/python.exe`) dosyasını gösterin.

### 3. Modül Facet Ayarı
- `Project Structure` -> `Modules` sekmesinde `data-processor` modülünü seçin.
- `+` butonuna basarak **Python** facet'ini ekleyin ve az önce tanımladığınız `.venv` interpreter'ını seçin.

---

## Scriptler ve Kullanım

### 🛠 V2 Sürümü (Güncel Mimari)
V2 sürümü, uygulamanın yeni nesil birim dönüştürme (`UnitConverter`) motoruyla tam uyumlu çalışır. Bu sürümde veritabanı şeması ve malzeme özellikleri (yoğunluk, fiziksel durum) daha akıllı hale getirilmiştir.

#### 1. `scripts/v2/DataProcessorExcelV2.py`
Bu script; yazım hatalarını düzeltir, malzemeleri kategorize eder ve otomatik **yoğunluk (density)** değerlerini atar.
- **Özellik:** Fındık/Fındık İçi gibi anlamsal farkları koruyan karakter uzunluğu filtreli akıllı benzerlik kontrolüne sahiptir.
- **Kullanım:**
  ```bash
  python scripts/v2/DataProcessorExcelV2.py
  ```
  *Çıktı:* `mealai_database_cleaned.xlsx`

#### 2. `scripts/v2/DatabaseImporterV2.py`
Temizlenmiş Excel verisini PostgreSQL'e aktarır. 

**V2 Yenilikleri ve Akıllı Özellikler:**
- **Akıllı Yoğunluk (Smart Density):** Malzemenin adı, kategorisi ve fiziksel durumuna göre bilimsel verilere dayalı yoğunluk ataması yapar.
  - *Örn:* Süt: 1.03, Bal: 1.40, Un: 0.60, Yağ: 0.92, Bakliyat: 0.80.
- **Fiziksel Durum Tahmini:** `physical_state` kolonu boşsa, malzemenin kategorisine göre otomatik (SOLID/LIQUID) atama yapar.
- **Veri Temizliği:** Excel'deki virgüllü sayıları (örn: `1,5`) otomatik olarak veritabanı formatına (`1.5`) dönüştürür.
- **Pre-flight Check:** Veritabanına yazmadan önce tüm ID ilişkilerini (Foreign Key) kontrol eder ve tutarsız verileri raporlar.
- **Atomik İşlem (Transaction):** Veritabanına aktarım sırasında bir hata oluşursa tüm işlemleri geri alır (Rollback).
- **Zorunlu Alan Doldurma:** Veritabanında `NOT NULL` olan ancak Excel'de bulunmayan teknik alanları (timestamps, active=true, status=APPROVED vb.) otomatik doldurur.

**Kullanım:**
  ```bash
  # Standart kullanım (varsayılan ayarlarla)
  python scripts/v2/DatabaseImporterV2.py

  # Özelleştirilmiş kullanım
  python scripts/v2/DatabaseImporterV2.py --file "dosya_yolu.xlsx" --db-url "postgresql://user:pass@localhost:5432/meal_app_db"

  # Sadece test amaçlı (veritabanına yazmadan kontrol eder)
  python scripts/v2/DatabaseImporterV2.py --dry-run
  ```

---

### ⚠️ V1 Sürümü (Eski/Arşiv)
Klasik gramaj odaklı sistem için kullanılan eski scriptlerdir.

1. **`clean_and_merge.py`**: Basit Fuzzy Matching ile malzeme birleştirme.
2. **`generalize_ingredients.py`**: Hazırlık durumlarını (doğranmış, taze vb.) temizleme.
3. **`import_data.py`**: Eski şemaya göre DB aktarımı.

---

## Yeni Veri Ekleme İş Akışı (Rehber)

Yeni bir geliştirici olarak 0'dan veri import etmek veya mevcut veriyi güncellemek için şu adımları izleyin:

### 1. Hazırlık
- `mealai_database.xlsx` dosyasını `modules/04-utilities/data-processor/python/` dizinine yerleştirin.
- Excel sekmelerinin (`ingredients`, `recipes`, `recipe_ingredients`, `ingredient_units`, `ingredient_nutrition`) doğru isimlendirildiğinden emin olun.

### 2. Veri Temizleme (Opsiyonel ama Önerilen)
Excel'deki verileri standardize etmek için:
```bash
python scripts/v2/DataProcessorExcelV2.py
```
Bu adım `mealai_database_cleaned.xlsx` dosyasını oluşturacaktır.

### 3. Veritabanına Import
Veritabanına aktarmadan önce bir "dry-run" yaparak hataları kontrol edin:
```bash
python scripts/v2/DatabaseImporterV2.py --dry-run
```
Hata yoksa gerçek import işlemini başlatın:
```bash
python scripts/v2/DatabaseImporterV2.py
```
**Not:** Bu işlem veritabanındaki mevcut malzeme ve tarif tablolarını **TRUNCATE** (temizler) ve sıfırdan Excel'deki verilerle doldurur.

### 4. Backend Senkronizasyonu
Import bittikten sonra Java uygulamasını başlattığınızda:
- `UnitConverterServiceImpl` sınıfı, Python tarafından atanan `density` değerlerini kullanarak `su bardağı`, `paket`, `demet` gibi birimleri otomatik olarak gramaja çevirir.
- Malzeme bazlı özel birimler (`ingredient_units` tablosu) öncelikli olarak kullanılır.
- Uygulama içindeki tüm kalori hesaplamaları bu yeni ve tutarlı veri seti üzerinden yapılır.

---

**Önemli Hatırlatma:** `DatabaseImporterV2.py` scripti, backend servisindeki `UnitConverter` mantığı ile senkronize edilmiştir. Python tarafında yapılan her "Akıllı Yoğunluk" güncellemesi, backend tarafında da karşılık bulmaktadır.

---

**Not:** `.venv` dizini `.gitignore` içerisindedir. Her ekip üyesi kurulum adımındaki scriptleri kendi yerel makinesinde bir kez çalıştırmalıdır.