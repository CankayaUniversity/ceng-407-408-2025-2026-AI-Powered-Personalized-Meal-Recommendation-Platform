# 🏗️ 01-Infrastructure Modülü

Bu modül, uygulamanın dış dünyaya açılan teknik pencerelerini ve altyapı detaylarını yönetir. **Domain** katmanının "ne yapılması gerektiğini" bildiği durumlarda, bu modül "nasıl yapılacağını" teknik olarak çözer.

## 📦 Sorumluluklar
- **AI Prompt Engine:** Yapay zeka modellerine gönderilecek promptların şablonlanması ve yönetimi.
- **External Clients:** OpenAI, Gemini gibi dış servislerle HTTP iletişimi.
- **Persistence:** İlişkisel (PostgreSQL) ve Vektör (pgvector) veritabanı spesifik implementasyonları.

## 📂 Önemli Birimler
- `ai.promptengine`: Prompt şablonları ve mantığı.
- `network.client`: Dış API istemcileri.

## 📝 AI Geliştirme Hedef Listesi (Yol Haritası)
- [ ] **Prompt Templates:** Diyet hedefi, zaman kısıtı ve eldeki malzemeleri harmanlayan "Akıllı Asistan" promptları oluşturulacak.
- [ ] **Calorie Estimator:** Kullanıcının manuel girdiği dış mekan yemeklerini (örn: "Mercimek Çorbası") analiz edip yaklaşık kalori tahmini üreten mantık kurulacak.
- [ ] **Recipe Analyzer:** Veritabanındaki tariflerin kullanıcının o günkü "Kalan Kalori Bütçesine" uygunluğunu puanlayacak.
- [ ] **Response Parser:** LLM'den gelen serbest metin yanıtlarını Domain nesnelerine (Recipe, Insight) hatasız dönüştürecek yapı kurulacak.

## 🔗 Bağımlılıklar
Bu modül teknik detayları içerir ve Domain katmanındaki arayüzleri (interface) implemente ederek sisteme hizmet sağlar.
