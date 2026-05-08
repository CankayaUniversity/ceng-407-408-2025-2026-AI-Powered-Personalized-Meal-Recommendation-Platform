package com.mealapp.infrastructure.ai.provider;

import com.mealapp.infrastructure.network.client.dto.OpenAiRequest;
import com.mealapp.infrastructure.network.client.dto.OpenAiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/**
 * OpenAI uyumlu API sunan diğer sağlayıcılar (Mistral, DeepSeek, Perplexity, Local LLM vb.) için ortak sağlayıcı.
 */
@Slf4j
@Service
public class GenericOpenAiProvider implements AiProvider {

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final String apiUrl;
    private final String providerType;

    public GenericOpenAiProvider(WebClient.Builder webClientBuilder,
                                 @Value("${com.mealapp.ai.service.generic.api-key:your-key-here}") String apiKey,
                                 @Value("${com.mealapp.ai.service.generic.model:default-model}") String model,
                                 @Value("${com.mealapp.ai.service.generic.url:http://localhost:8080/v1/chat/completions}") String apiUrl,
                                 @Value("${com.mealapp.ai.service.generic.provider-name:GENERIC}") String providerType) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.apiUrl = apiUrl;
        this.providerType = providerType.toUpperCase();
    }

    @Override
    public String call(String prompt, String customApiKey) {
        String effectiveApiKey = (customApiKey != null && !customApiKey.isBlank()) ? customApiKey : apiKey;

        if (effectiveApiKey == null || effectiveApiKey.equals("your-key-here")) {
            log.warn("{} API Key is missing, returning simulation response.", providerType);
            return "[{\"recipeTitle\": \"Generic AI Recipe (Simulated)\", \"insight\": \""+ providerType +" simülasyon yanıtı. Bu jenerik sağlayıcı üzerinden dönen bir tariftir.\"}]";
        }

        OpenAiRequest request = OpenAiRequest.builder()
                .model(model)
                .messages(List.of(new OpenAiRequest.Message("user", prompt)))
                .temperature(0.7)
                .build();

        OpenAiResponse response = webClient.post()
                .uri(apiUrl)
                .header("Authorization", "Bearer " + effectiveApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(OpenAiResponse.class)
                .block();

        if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
            return response.getChoices().get(0).getMessage().getContent();
        }

        return "[]";
    }

    @Override
    public String call(String prompt) {
        return call(prompt, null);
    }

    @Override
    public String getType() {
        return providerType;
    }
}
