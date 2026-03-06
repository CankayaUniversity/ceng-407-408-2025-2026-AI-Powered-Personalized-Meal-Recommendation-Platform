package com.mealapp.infrastructure.ai.promptengine;

import com.mealapp.domain.common.ai.PromptEngine;
import org.springframework.stereotype.Component;

@Component
public class AiPromptEngine implements PromptEngine {
    @Override
    public String generatePrompt(String template, Object... args) {
        // AI Prompt generation logic
        return String.format(template, args);
    }
}
