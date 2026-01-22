package com.mealapp.infrastructure.ai.promptengine;

import org.springframework.stereotype.Component;

@Component
public class AiPromptEngine {
    public String generatePrompt(String template, Object... args) {
        // AI Prompt generation logic
        return String.format(template, args);
    }
}
