package com.mealapp.app.controller;

import com.mealapp.infrastructure.network.client.AiServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI servislerinin (OpenAI, Gemini vb.) konfigürasyonunu ve bağlantısını test etmek için kullanılan uç nokta.
 * Sadece geliştirme/test aşamasında kullanılmalıdır.
 */
@RestController
@RequestMapping("/api/test/ai")
@RequiredArgsConstructor
public class AiTestController {

    private final AiServiceClient aiServiceClient;

    /**
     * Aktif AI sağlayıcısına doğrudan bir prompt gönderir.
     * API anahtarı girilmemişse simülasyon yanıtı döner.
     */
    @GetMapping("/call")
    public String testCall(@RequestParam(defaultValue = "Merhaba, bana hızlıca 1 tane sağlıklı yemek ismi söyler misin?") String prompt) {
        return aiServiceClient.callAi(prompt);
    }
}
