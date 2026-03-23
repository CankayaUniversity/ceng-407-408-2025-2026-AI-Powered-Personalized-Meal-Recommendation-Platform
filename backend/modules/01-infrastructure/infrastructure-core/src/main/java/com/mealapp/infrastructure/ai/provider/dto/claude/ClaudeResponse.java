package com.mealapp.infrastructure.ai.provider.dto.claude;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Anthropic (Claude) API yanıtı için DTO.
 */
@Data
public class ClaudeResponse {
    private List<Content> content;
    private Usage usage;

    @Data
    public static class Content {
        private String text;
        private String type;
    }

    @Data
    public static class Usage {
        @JsonProperty("input_tokens")
        private int inputTokens;
        @JsonProperty("output_tokens")
        private int outputTokens;
    }
}
