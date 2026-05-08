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
        return callAi(prompt, activeProviderType, null);
    }

    /**
     * Belirtilen AI sağlayıcısına istek atar.
     */
    @Retryable(
            retryFor = { Exception.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public String callAi(String prompt, String providerType) {
        return callAi(prompt, providerType, null);
    }

    /**
     * Belirtilen AI sağlayıcısına ve API anahtarı ile istek atar.
     */
    @Retryable(
            retryFor = { Exception.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public String callAi(String prompt, String providerType, String apiKey) {
        String targetProvider = (providerType == null || providerType.isBlank()) ? activeProviderType : providerType.toUpperCase();
        AiProvider provider = providers.get(targetProvider);
        
        if (provider == null) {
            log.error("AI provider '{}' not found. Falling back to active provider '{}'.", targetProvider, activeProviderType);
            provider = providers.get(activeProviderType);
        }

        if (provider == null) {
            log.error("No valid AI provider found. Falling back to any available or empty.");
            return providers.values().stream()
                    .findFirst()
                    .map(p -> p.call(prompt, apiKey))
                    .orElse("[]");
        }

        log.debug("Calling AI provider: {} with user-provided key: {}", provider.getType(), apiKey != null);
        return provider.call(prompt, apiKey);
    }
}
