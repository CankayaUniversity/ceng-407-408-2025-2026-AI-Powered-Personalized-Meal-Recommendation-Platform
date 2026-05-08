package com.mealapp.infrastructure.ai.provider;

import com.mealapp.infrastructure.network.client.dto.OpenAiRequest;
import com.mealapp.infrastructure.network.client.dto.OpenAiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Slf4j
@Service
public class OpenAiProvider implements AiProvider {

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final String apiUrl;

    public OpenAiProvider(WebClient.Builder webClientBuilder,
                           @Value("${com.mealapp.ai.service.openai.api-key:your-key-here}") String apiKey,
                           @Value("${com.mealapp.ai.service.openai.model:gpt-4o-mini}") String model,
                           @Value("${com.mealapp.ai.service.openai.url:https://api.openai.com/v1/chat/completions}") String apiUrl) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.apiUrl = apiUrl;
    }

    @Override
    public String call(String prompt, String userApiKey) {
        String effectiveApiKey = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : this.apiKey;

        if (effectiveApiKey == null || effectiveApiKey.equals("your-key-here")) {
            log.warn("OpenAI API Key is missing, returning simulation response.");
            return "[{\"recipeTitle\": \"Chicken Salad (Simulated)\", \"insight\": \"OpenAI simülasyon yanıtı. Envanterinizdeki malzemelerle harika bir salata yapabilirsiniz.\"}]";
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
            if (response.getUsage() != null) {
                log.info("OpenAI Usage - Prompt: {}, Completion: {}, Total: {}",
                        response.getUsage().getPromptTokens(),
                        response.getUsage().getCompletionTokens(),
                        response.getUsage().getTotalTokens());
            }
            return response.getChoices().get(0).getMessage().getContent();
        }

        return "[]";
    }

    @Override
    public String getType() {
        return "OPENAI";
    }
}
