# 🚀 03-Application Modülü

Uygulamanın giriş kapısı ve dış dünya ile iletişim katmanıdır. Spring Boot burada başlar.

## 📦 Sorumluluklar
- **REST API (Controllers):** HTTP isteklerini karşılar ve yanıtları döner.
- **DTO (Data Transfer Objects):** Dış dünyaya veri sunarken kullanılan modeller.
- **Mappers:** Domain Entity'leri ile API DTO'ları arasındaki dönüşümler.
- **Orchestration:** Birden fazla Domain servisini çağırarak karmaşık API akışlarını yönetir.

## 📂 Önemli Birimler
- `controller/`: API uç noktaları.
- `model.dto/`: Request ve Response nesneleri.
- `exception/`: Global hata yönetimi.

## 🔗 Bağımlılıklar
Bu modül **Domain** ve **Infrastructure** modüllerini kullanır. Sistemin orkestra şefidir.
