# 🛠️ 04-Utilities Module / 04-Utilities Modülü

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

Utility tools used throughout the application and development conveniences are located in this module.

### 📦 Responsibilities
- **Data Processor:** Python scripts for cleaning, merging, and importing large recipe datasets (50,000+ items) from Excel/CSV to PostgreSQL.
- **Data Populator:** Java services to fill the database with initial/test data on application startup.
- **Common Helpers:** Shared utility classes used across the project.

### 📂 Key Components
- `datapopulator/`: Test data loading services.

### 🔗 Dependencies
Usually works dependent on **Domain** models.

---

<a name="türkçe"></a>
## Türkçe

Uygulama genelinde kullanılan yardımcı araçlar ve geliştirme kolaylıkları bu modülde yer alır.

### 📦 Sorumluluklar
- **Veri İşleyici (Data Processor):** Büyük yemek tarifi veri setlerini (50.000+ öğe) Excel/CSV formatından PostgreSQL'e temizlemek, birleştirmek ve aktarmak için Python betikleri.
- **Veri Doldurucu (Data Populator):** Uygulama başlangıcında veritabanını başlangıç/test verileriyle dolduran Java servisleri.
- **Ortak Yardımcılar (Common Helpers):** Proje genelinde paylaşılan yardımcı sınıflar.

### 📂 Önemli Birimler
- `datapopulator/`: Test verisi yükleme servisleri.

### 🔗 Bağımlılıklar
Genellikle **Domain** modellerine bağımlı çalışır.
