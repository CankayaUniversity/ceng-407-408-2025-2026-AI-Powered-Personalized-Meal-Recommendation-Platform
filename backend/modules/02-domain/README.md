# 🥗 02-Domain Module / 02-Domain Modülü

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

The **heart** of the application and the center where business intelligence resides. It is written in pure Java/Kotlin and is completely isolated from technical details (JSON, HTTP, DB).

### 📦 Responsibilities
- **Business Logic:** Core logic for meal recommendations, diet suitability, and nutrient calculations.
- **Inventory & Consumption:** Advanced logic for tracking food intake. Supports automatic ingredient deduction from inventory when "home-made" flag is set.
- **Entities:** Pure business objects (User, Recipe, Inventory, DailyConsumption).
- **Domain Services:**
  - `UserService`: Calorie goal calculation based on physical profile and activity level.
  - `DailyConsumptionService`: Coordination of consumption logs and inventory updates.
  - `RecipeService`: Nutritional value aggregation and diet compatibility filtering.
- **Strategies:** Pluggable recommendation algorithms (AI-based vs. Rule-based).

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
- **İş Mantığı (Business Logic):** Yemek önerileri, diyet uygunluğu ve besin değeri hesaplamaları için temel mantık.
- **Envanter ve Tüketim:** Gelişmiş öğün takip mantığı. "Ev yapımı" olarak işaretlenen öğünlerde malzemelerin envanterden otomatik düşülmesini destekler.
- **Entities:** Saf iş nesneleri (User, Recipe, Inventory, DailyConsumption).
- **Domain Servisleri:**
  - `UserService`: Fiziksel profil ve aktivite seviyesine göre kalori hedefi hesaplama.
  - `DailyConsumptionService`: Tüketim kayıtları ve envanter güncellemelerinin koordinasyonu.
  - `RecipeService`: Besin değeri toplama ve diyet uyumluluk filtrelemesi.
- **Strategies:** Değiştirilebilir öneri algoritmaları (AI-tabanlı vs. Kural-tabanlı).

### 📂 Paket Standartı
Her iş birimi (Domain) kendi içinde şunları barındırır:
- `entity/`: İş nesneleri.
- `repository/`: Veri erişim tanımları.
- `common/storage/`: Dosya depolama arayüzleri (`FileStorageService`). Altyapıdan bağımsız dosya yönetimi sağlar.
- `service/`: İş mantığını koordine eden Domain Servisleri.

### 🔗 Bağımlılıklar
Bu modül **hiçbir katmana bağımlı değildir**. En içteki halkadır.
