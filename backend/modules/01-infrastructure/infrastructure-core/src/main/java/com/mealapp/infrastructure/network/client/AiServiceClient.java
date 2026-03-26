package com.mealapp.infrastructure.network.client;

import com.mealapp.infrastructure.ai.provider.AiProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI servisleri (OpenAI, Gemini vb.) ile yapılacak dış dünya iletişimini yönetir.
 * Aktif sağlayıcıya göre isteği yönlendirir.
 */
@Slf4j
@Service
public class AiServiceClient {

    private final Map<String, AiProvider> providers;
    private final String activeProviderType;

    public AiServiceClient(List<AiProvider> providerList,
                           @Value("${com.mealapp.ai.provider-type:OPENAI}") String activeProviderType) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(p -> p.getType().toUpperCase(), p -> p));
        this.activeProviderType = activeProviderType.toUpperCase();
        log.info("AiServiceClient initialized with providers: {} and active provider: {}", 
                providers.keySet(), activeProviderType);
    }

    /**
     * Aktif AI sağlayıcısına istek atar ve cevabı döner.
     * Retry mekanizması @Retryable ile Spring Retry üzerinden yönetilir.
     */
    @Retryable(
            retryFor = { Exception.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public String callAi(String prompt) {
        AiProvider provider = providers.get(activeProviderType);
        
        if (provider == null) {
            log.error("Active AI provider '{}' not found. Falling back to any available or empty.", activeProviderType);
            return providers.values().stream()
                    .findFirst()
                    .map(p -> p.call(prompt))
                    .orElse("[]");
        }

        log.debug("Calling AI provider: {}", activeProviderType);
        return provider.call(prompt);
    }
}
