# Data Processor (Python)

Bu dizin, yemek tarifi ve malzeme verilerini içeren Excel dosyalarını temizlemek, normalize etmek ve veritabanına aktarıma hazır hale getirmek için kullanılan Python scriptlerini içerir.

## Kurulum (Hızlı Kurulum Scriptleri)

Gerekli Python ortamını (sanal ortam, bağımlılıklar vb.) otomatik olarak hazırlamak için işletim sisteminize uygun olan scripti çalıştırın:

### macOS / Linux (Bash)
```bash
# Scriptin bulunduğu dizine gidin (backend/modules/04-utilities/data-processor/python/)
chmod +x setup_env.sh
./setup_env.sh
```

### Windows (CMD/PowerShell)
Klasöre gidin ve `setup_env.bat` dosyasına çift tıklayın veya terminalden çalıştırın:
```cmd
setup_env.bat
```

Bu scriptler; sanal bir ortam (`.venv`) oluşturur, `pip`'i günceller ve tüm bağımlılıkları (`requirements.txt`) otomatik olarak yükler.

---

## IDE Yapılandırması (Önemli - Polyglot Yapı)

Proje ana SDK olarak **Java 21 (Zulu)** kullanmaktadır. Python scriptlerinin bu yapıyı bozmadan çalışması için IntelliJ IDEA içerisinde "Facet" veya "Module SDK" mantığı kullanılmalıdır.

### 1. Java SDK'yı Korumak (Project SDK)
`File` -> `Project Structure` -> `Project` sekmesindeki **Project SDK** ayarının **Zulu 21** olarak kaldığından emin olun. Bu ayarı kesinlikle değiştirmeyin.

### 2. Python'u Ek SDK Olarak Tanımlamak (Kalıcı Çözüm)
Java ve Python'un aynı modül içerisinde sorunsuz çalışması için:

1.  **Python Plugin:** IntelliJ'de "Python" eklentisinin kurulu olduğundan emin olun.
2.  **SDK Ekleme:** `File` -> `Project Structure` -> `Platform Settings` -> **SDKs** kısmına gidin.
    - `+` butonuna basın -> `Add Python SDK`.
    - `Virtualenv Environment` -> `Existing environment` seçin.
    - `Interpreter` yoluna oluşturduğumuz `.venv` içerisindeki python dosyasını gösterin:
        - **macOS/Linux:** `backend/modules/04-utilities/data-processor/python/.venv/bin/python`
        - **Windows:** `backend\modules\04-utilities\data-processor\python\.venv\Scripts\python.exe`
3.  **Facet Ekleme (Modül Bazlı):** `File` -> `Project Structure` -> `Project Settings` -> **Modules** sekmesine gidin.
    - `04-utilities` (veya ilgili alt modül) modülünü seçin.
    - Üstteki `+` işaretine (veya modüle sağ tıklayıp) basarak **Python** facet'ini ekleyin.
    - Python Interpreter olarak az önce eklediğimiz `.venv` SDK'sını seçin.

Bu sayede projenin ana motoru Java 21 olarak kalırken, Python scriptlerini açtığınızda IDE otomatik olarak doğru interpreter'ı kullanacak ve "No Python interpreter configured" uyarısı kaybolacaktır.

### 3. Ekip İçi Kurulum
Her çalışma arkadaşı projeyi klonladığında:
1. `setup_env.sh` (veya `.bat`) scriptini bir kez çalıştırmalı.
2. Yukarıdaki IDE adımlarını izleyerek kendi yerel `.venv` yolunu IDE'ye bir kez tanıtmalıdır.
    - `.venv` dizini `.gitignore` içerisindedir, bu yüzden her kullanıcı kendi yerel ortamını oluşturmalıdır.

---

## Scriptler

### 1. `clean_and_merge.py`

Bu script, malzeme isimlerindeki yazım hatalarını ve benzerlikleri (Fuzzy Matching) tespit ederek mükerrer kayıtları birleştirir.

**Kullanım:**
```bash
python scripts/clean_and_merge.py --input <input_path.xlsx> --output <output_path.xlsx> --threshold 90
```

- `--threshold`: Benzerlik eşiği (0-100). Varsayılan 90'dır.

### 2. `generalize_ingredients.py`

Bu script, malzeme isimlerinden hazırlık ve durum belirten kelimeleri ("fresh", "chopped", "sliced" vb.) temizleyerek malzemeleri daha genel kategorilerde birleştirir.

**Kullanım:**
```bash
python scripts/generalize_ingredients.py --input <input_path.xlsx> --output <output_path.xlsx>
```

### 3. `import_data.py`

Bu script, temizlenmiş ve genelleştirilmiş Excel dosyasındaki verileri PostgreSQL veritabanına aktarır. Aktarım sırasında veritabanı şemasına uygun sütun isimlendirmelerini yapar ve sequence (ID) değerlerini günceller.

**Kullanım:**
```bash
python scripts/import_data.py --file <final_excel_path.xlsx> --db-url "postgresql://user:pass@localhost:5432/dbname"
```

- `--file`: Aktarılacak nihai Excel dosyası. (Varsayılan olarak bu dizindeki `final_food_database.xlsx` kullanılır).
- `--db-url`: Veritabanı bağlantı adresi (Varsayılan: `postgresql://postgres:postgres@localhost:5432/meal_app_db`).

### 4. Tek Tıkla Veri Aktarımı (Hızlı Başlangıç)
Tüm hazırlıklar (sanal ortam ve DB bağlantısı) tamamlandıktan sonra verileri aktarmak için:
```bash
# Python dizinindeyken
source .venv/bin/activate
python scripts/import_data.py
```
Bu komut, projenin içindeki `final_food_database.xlsx` dosyasını kullanarak yerel veritabanınıza tüm malzemeleri ve tarifleri otomatik olarak yükleyecektir.

## İş Akışı Önerisi

1. Önce `clean_and_merge.py` çalıştırılarak yazım hataları ve çok yakın isimler temizlenir.
2. Ardından `generalize_ingredients.py` çalıştırılarak hazırlık farkları normalize edilir.
3. Son olarak `import_data.py` ile veriler veritabanına aktarılır.
