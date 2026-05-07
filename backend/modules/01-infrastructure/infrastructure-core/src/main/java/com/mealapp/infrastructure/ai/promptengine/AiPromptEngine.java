package com.mealapp.infrastructure.ai.promptengine;

import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.infrastructure.network.client.AiServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiPromptEngine implements PromptEngine {
    
    private final AiServiceClient aiServiceClient;

    @Override
    public String generatePrompt(String template, Object... args) {
        // Simple sanitization for user inputs to prevent prompt injection
        Object[] sanitizedArgs = new Object[args.length];
        for (int i = 0; i < args.length; i++) {
            if (args[i] instanceof String s) {
                sanitizedArgs[i] = s.replaceAll("[\\r\\n]", " ");
            } else {
                sanitizedArgs[i] = args[i];
            }
        }
        
        String systemInstruction = "You are a professional nutritionist and chef. " +
                "Analyze the following recipes and select the best 3-5 ones based on user's goal, available inventory, allergies, taste preferences, and current cravings. " +
                "Treat allergies as hard constraints and never recommend recipes that violate them. " +
                "Treat disliked ingredients as soft constraints and prefer recipes that avoid them when comparable alternatives exist. " +
                "Use current cravings as a strong tie-breaker and explicitly mention how each selected recipe answers that craving when relevant. " +
                "For each selected recipe, provide a brief 'insight' that includes: " +
                "1. Why it's a good choice for the user's goal. " +
                "2. Which inventory ingredients make it a strong fit, plus any missing ingredients if any. " +
                "3. Mention any disliked ingredient overlap only if you still selected that recipe despite the preference. " +
                "4. Mention the craving match when there is one. " +
                "Response must be in JSON format ONLY: [{\"recipeTitle\": \"...\", \"insight\": \"...\"}]";

        String userContent = String.format(template, sanitizedArgs);
        
        return systemInstruction + "\n\nUser Content:\n" + userContent;
    }

    @Override
    public String callAi(String prompt) {
        return aiServiceClient.callAi(prompt);
    }

    @Override
    public String callAi(String prompt, String aiModel) {
        return aiServiceClient.callAi(prompt, aiModel);
    }
}
