package com.mealapp.infrastructure.ai.promptengine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiPromptEngineTest {
    @Test
    void generatePrompt_formatsTemplate() {
        AiPromptEngine engine = new AiPromptEngine();
        String result = engine.generatePrompt("Hello, %s!", "World");
        assertEquals("Hello, World!", result);
    }
}
