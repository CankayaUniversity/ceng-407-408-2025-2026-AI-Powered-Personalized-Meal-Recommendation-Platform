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
V2 sürümü, uygulamanın yeni nesil birim dönüştürme (`UnitConverter`) motoruyla tam uyumlu çalışır.

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
- **Özellik:** `amount`, `unit`, `density` ve `ingredient_units` tablosunu destekler. Atomik (Transaction) yapısı sayesinde hata anında işlemi geri alır ve ID dizilerini (sequence) otomatik günceller.
- **Kullanım:**
  ```bash
  python scripts/v2/DatabaseImporterV2.py --db-url "postgresql://user:pass@localhost:5432/meal_app_db"
  ```

---

### ⚠️ V1 Sürümü (Eski/Arşiv)
Klasik gramaj odaklı sistem için kullanılan eski scriptlerdir.

1. **`clean_and_merge.py`**: Basit Fuzzy Matching ile malzeme birleştirme.
2. **`generalize_ingredients.py`**: Hazırlık durumlarını (doğranmış, taze vb.) temizleme.
3. **`import_data.py`**: Eski şemaya göre DB aktarımı.

---

## Yeni Veri Ekleme İş Akışı (Önerilen)

Yeni bir tarif seti eklemek istediğinizde izlemeniz gereken rota:

1. Verileri `mealai_database.xlsx` dosyasına ilgili sekmelere (`recipes`, `ingredients`, `recipe_ingredients`, `ingredient_units`) ekleyin.
2. `DataProcessorExcelV2.py` scriptini çalıştırarak veriyi valide edin ve temizleyin.
3. Oluşan `cleaned` dosyasını `DatabaseImporterV2.py` ile veritabanına aktarın.
4. Java uygulamasını başlatın; backend üzerindeki `UnitConverter` ve `@PrePersist` mantığı, aktarılan `amount/unit` ikililerini otomatik olarak gramaja çevirip `grams` sütununu güncelleyecektir.

---

**Not:** `.venv` dizini `.gitignore` içerisindedir. Her ekip üyesi kurulum adımındaki scriptleri kendi yerel makinesinde bir kez çalıştırmalıdır.