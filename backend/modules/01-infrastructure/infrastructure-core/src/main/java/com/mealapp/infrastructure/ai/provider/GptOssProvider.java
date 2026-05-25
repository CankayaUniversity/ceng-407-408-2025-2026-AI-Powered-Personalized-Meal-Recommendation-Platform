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
public class GptOssProvider implements AiProvider {

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final String apiUrl;
    private final String referer;
    private final String title;

    public GptOssProvider(WebClient.Builder webClientBuilder,
                          @Value("${com.mealapp.ai.service.gpt-oss.api-key:your-key-here}") String apiKey,
                          @Value("${com.mealapp.ai.service.gpt-oss.model:openai/gpt-oss-120b:free}") String model,
                          @Value("${com.mealapp.ai.service.gpt-oss.url:https://openrouter.ai/api/v1/chat/completions}") String apiUrl,
                          @Value("${com.mealapp.ai.service.gpt-oss.referer:http://localhost:3030}") String referer,
                          @Value("${com.mealapp.ai.service.gpt-oss.title:Meal Recommendation Platform}") String title) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.model = model;
        this.apiUrl = apiUrl;
        this.referer = referer;
        this.title = title;
    }

    @Override
    public String call(String prompt, String userApiKey) {
        String effectiveApiKey = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : this.apiKey;

        if (effectiveApiKey == null || effectiveApiKey.equals("your-key-here")) {
            log.warn("GPT-OSS API Key is missing, returning simulation response.");
            return "[{\"recipeTitle\": \"GPT-OSS Recipe (Simulated)\", \"insight\": \"GPT-OSS simülasyon yanıtı. OpenRouter anahtarı yapılandırılmadığı için gerçek model çağrısı yapılmadı.\"}]";
        }

        OpenAiRequest request = OpenAiRequest.builder()
                .model(model)
                .messages(List.of(new OpenAiRequest.Message("user", prompt)))
                .temperature(0.7)
                .build();

        OpenAiResponse response = webClient.post()
                .uri(apiUrl)
                .header("Authorization", "Bearer " + effectiveApiKey)
                .header("HTTP-Referer", referer)
                .header("X-Title", title)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(OpenAiResponse.class)
                .block();

        if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
            if (response.getUsage() != null) {
                log.info("GPT-OSS Usage - Prompt: {}, Completion: {}, Total: {}",
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
        return "GPT_OSS";
    }
}
