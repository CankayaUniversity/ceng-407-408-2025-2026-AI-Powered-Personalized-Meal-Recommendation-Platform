package com.mealapp.infrastructure.ai.provider;

import com.mealapp.infrastructure.ai.provider.dto.gemini.GeminiRequest;
import com.mealapp.infrastructure.ai.provider.dto.gemini.GeminiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class GeminiProvider implements AiProvider {

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final String apiUrl;

    public GeminiProvider(WebClient.Builder webClientBuilder,
                          @Value("${com.mealapp.ai.service.gemini.api-key:your-key-here}") String apiKey,
                          @Value("${com.mealapp.ai.service.gemini.model:gemini-1.5-flash}") String model,
                          @Value("${com.mealapp.ai.service.gemini.url:https://generativelanguage.googleapis.com/v1beta/models/}") String apiUrl) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.apiUrl = apiUrl;
    }

    @Override
    public String call(String prompt, String userApiKey) {
        String effectiveApiKey = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : this.apiKey;

        if (effectiveApiKey == null || effectiveApiKey.equals("your-key-here")) {
            log.warn("Gemini API Key is missing, returning simulation response.");
            return "[{\"recipeTitle\": \"Lentil Soup (Simulated)\", \"insight\": \"Gemini simülasyon yanıtı. Envanterinizdeki bakliyatlarla besleyici bir çorba hazırlayabilirsiniz.\"}]";
        }

        String fullUrl = apiUrl + model + ":generateContent?key=" + effectiveApiKey;

        GeminiRequest request = GeminiRequest.builder()
                .contents(List.of(GeminiRequest.Content.builder()
                        .role("user")
                        .parts(List.of(new GeminiRequest.Part(prompt)))
                        .build()))
                .generationConfig(GeminiRequest.GenerationConfig.builder()
                        .temperature(0.7)
                        .responseMimeType("application/json")
                        .responseJsonSchema(Map.of(
                                "type", "array",
                                "items", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "recipeTitle", Map.of("type", "string"),
                                                "insight", Map.of("type", "string")
                                        ),
                                        "required", List.of("recipeTitle", "insight")
                                )
                        ))
                        .build())
                .build();

        GeminiResponse response = webClient.post()
                .uri(fullUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(GeminiResponse.class)
                .block();

        if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
            List<GeminiResponse.Part> parts = response.getCandidates().get(0).getContent().getParts();
            if (parts != null && !parts.isEmpty()) {
                return parts.get(0).getText();
            }
        }

        return "[]";
    }

    @Override
    public String getType() {
        return "GEMINI";
    }
}
