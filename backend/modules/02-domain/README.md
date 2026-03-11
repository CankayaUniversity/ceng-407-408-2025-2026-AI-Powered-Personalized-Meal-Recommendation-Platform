# 🥗 02-Domain Module / 02-Domain Modülü

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

The **heart** of the application and the center where business intelligence resides. It is written in pure Java/Kotlin and is completely isolated from technical details (JSON, HTTP, DB).

### 📦 Responsibilities
- **Business Rules:** Meal recommendation, diet suitability, and inventory management rules.
- **Entities:** Objects representing business concepts, not database tables (User, Recipe, Inventory).
- **Repositories:** Interfaces for data access.
- **Strategies:** Different recommendation algorithms (AI-based, Popularity-based).

### 📂 Package Standard
Each business unit (Domain) contains the following within itself:
- `entity/`: Business objects.
- `repository/`: Data access definitions.
- `common/storage/`: File storage interfaces (`FileStorageService`). Provides infrastructure-independent file management.
- `service/`: Domain Services that coordinate business logic.

### 🔗 Dependencies
This module **does not depend on any layer**. It is the innermost circle.

---

<a name="türkçe"></a>
## Türkçe

Uygulamanın **kalbi** ve iş zekasının bulunduğu merkezdir. Saf Java/Kotlin ile yazılır, teknik detaylardan (JSON, HTTP, DB) tamamen izole edilmiştir.

### 📦 Sorumluluklar
- **İş Kuralları (Business Rules):** Yemek önerisi, diyet uygunluğu ve envanter yönetimi kuralları.
- **Entities:** Veritabanı tablolarını değil, iş kavramlarını temsil eden nesneler (User, Recipe, Inventory).
- **Repositories:** Veri erişimi için arayüzler (Interface).
- **Strategies:** Farklı öneri algoritmaları (AI-based, Popularity-based).

### 📂 Paket Standartı
Her iş birimi (Domain) kendi içinde şunları barındırır:
- `entity/`: İş nesneleri.
- `repository/`: Veri erişim tanımları.
- `common/storage/`: Dosya depolama arayüzleri (`FileStorageService`). Altyapıdan bağımsız dosya yönetimi sağlar.
- `service/`: İş mantığını koordine eden Domain Servisleri.

### 🔗 Bağımlılıklar
Bu modül **hiçbir katmana bağımlı değildir**. En içteki halkadır.
