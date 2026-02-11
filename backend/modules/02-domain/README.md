# 🥗 02-Domain Modülü

Uygulamanın **kalbi** ve iş zekasının bulunduğu merkezdir. Saf Java/Kotlin ile yazılır, teknik detaylardan (JSON, HTTP, DB) tamamen izole edilmiştir.

## 📦 Sorumluluklar
- **İş Kuralları (Business Rules):** Yemek önerisi, diyet uygunluğu ve envanter yönetimi kuralları.
- **Entities:** Veritabanı tablolarını değil, iş kavramlarını temsil eden nesneler (User, Recipe, Inventory).
- **Repositories:** Veri erişimi için arayüzler (Interface).
- **Strategies:** Farklı öneri algoritmaları (AI-based, Popularity-based).

## 📂 Paket Standartı
Her iş birimi (Domain) kendi içinde şunları barındırır:
- `entity/`: İş nesneleri.
- `repository/`: Veri erişim tanımları.
- `service/`: İş mantığını koordine eden Domain Servisleri.

## 🔗 Bağımlılıklar
Bu modül **hiçbir katmana bağımlı değildir**. En içteki halkadır.
