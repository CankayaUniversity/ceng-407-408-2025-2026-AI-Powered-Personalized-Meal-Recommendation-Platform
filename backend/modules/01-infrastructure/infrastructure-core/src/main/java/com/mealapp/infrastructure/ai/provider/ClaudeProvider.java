package com.mealapp.infrastructure.ai.provider;

import com.mealapp.infrastructure.ai.provider.dto.claude.ClaudeRequest;
import com.mealapp.infrastructure.ai.provider.dto.claude.ClaudeResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Slf4j
@Service
public class ClaudeProvider implements AiProvider {

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final String apiUrl;
    private final String anthropicVersion;

    public ClaudeProvider(WebClient.Builder webClientBuilder,
                           @Value("${com.mealapp.ai.service.claude.api-key:your-key-here}") String apiKey,
                           @Value("${com.mealapp.ai.service.claude.model:claude-3-5-sonnet-20240620}") String model,
                           @Value("${com.mealapp.ai.service.claude.url:https://api.anthropic.com/v1/messages}") String apiUrl,
                           @Value("${com.mealapp.ai.service.claude.anthropic-version:2023-06-01}") String anthropicVersion) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.apiUrl = apiUrl;
        this.anthropicVersion = anthropicVersion;
    }

    @Override
    public String call(String prompt, String userApiKey) {
        String effectiveApiKey = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : this.apiKey;

        if (effectiveApiKey == null || effectiveApiKey.equals("your-key-here")) {
            log.warn("Claude API Key is missing, returning simulation response.");
            return "[{\"recipeTitle\": \"Baked Salmon with Asparagus (Simulated)\", \"insight\": \"Claude simülasyon yanıtı. Omega-3 zengini bir akşam yemeği sizi bekliyor.\"}]";
        }

        ClaudeRequest request = ClaudeRequest.builder()
                .model(model)
                .messages(List.of(new ClaudeRequest.Message("user", prompt)))
                .maxTokens(1024)
                .temperature(0.7)
                .build();

        ClaudeResponse response = webClient.post()
                .uri(apiUrl)
                .header("x-api-key", effectiveApiKey)
                .header("anthropic-version", anthropicVersion)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ClaudeResponse.class)
                .block();

        if (response != null && response.getContent() != null && !response.getContent().isEmpty()) {
            if (response.getUsage() != null) {
                log.info("Claude Usage - Input: {}, Output: {}",
                        response.getUsage().getInputTokens(),
                        response.getUsage().getOutputTokens());
            }
            return response.getContent().get(0).getText();
        }

        return "[]";
    }

    @Override
    public String getType() {
        return "CLAUDE";
    }
}
