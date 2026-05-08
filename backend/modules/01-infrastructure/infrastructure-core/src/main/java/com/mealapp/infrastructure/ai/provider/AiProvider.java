package com.mealapp.infrastructure.ai.provider;

/**
 * Farklı AI sağlayıcıları (OpenAI, Gemini, vb.) için ortak arayüz.
 */
public interface AiProvider {
    /**
     * AI servisine istek atar.
     * @param prompt Gönderilecek metin.
     * @param apiKey Opsiyonel API anahtarı.
     * @return AI'dan dönen metin yanıtı.
     */
    String call(String prompt, String apiKey);

    default String call(String prompt) {
        return call(prompt, null);
    }

    /**
     * Sağlayıcı tipini döner (OPENAI, GEMINI vb.).
     */
    String getType();
}
