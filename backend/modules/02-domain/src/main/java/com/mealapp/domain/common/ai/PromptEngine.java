package com.mealapp.domain.common.ai;

/**
 * AI modelleri için prompt oluşturma işlemlerini tanımlayan arayüz.
 * Bu arayüz sayesinde domain katmanı altyapı detaylarından bağımsız kalır.
 */
public interface PromptEngine {
    String generatePrompt(String template, Object... args);
}
