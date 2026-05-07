package com.mealapp.domain.common.ai;


/**
 * AI modelleri için prompt oluşturma işlemlerini tanımlayan arayüz.
 * Bu arayüz sayesinde domain katmanı altyapı detaylarından bağımsız kalır.
 */
public interface PromptEngine {
    String generatePrompt(String template, Object... args);
    
    /**
     * AI servisine (örn: OpenAI chat completion) istek atar ve cevabı döner.
     */
    String callAi(String prompt);

    /**
     * Belirli bir model ile AI servisine istek atar.
     */
    String callAi(String prompt, String aiModel);

    /**
     * AI'dan dönen JSON cevabını (recipeTitle ve insight) modelleyen yardımcı sınıf.
     */
    @lombok.Data
    class AiResponse {
        private String recipeTitle;
        private String insight;
    }
}
