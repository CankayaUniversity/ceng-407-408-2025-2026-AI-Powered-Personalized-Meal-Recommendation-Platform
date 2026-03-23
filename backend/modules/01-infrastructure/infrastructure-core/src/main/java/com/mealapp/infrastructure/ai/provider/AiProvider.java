package com.mealapp.infrastructure.ai.provider;

/**
 * Farklı AI sağlayıcıları (OpenAI, Gemini, vb.) için ortak arayüz.
 */
public interface AiProvider {
    /**
     * AI servisine istek atar.
     * @param prompt Gönderilecek metin.
     * @return AI'dan dönen metin yanıtı.
     */
    String call(String prompt);

    /**
     * Sağlayıcı tipini döner (OPENAI, GEMINI vb.).
     */
    String getType();
}
