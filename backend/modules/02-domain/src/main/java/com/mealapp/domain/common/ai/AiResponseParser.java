package com.mealapp.domain.common.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Iterator;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.function.ObjIntConsumer;
import java.util.regex.Pattern;

public final class AiResponseParser {

    private static final Pattern OPENING_CODE_FENCE = Pattern.compile("(?is)^\\s*```(?:json)?\\s*");
    private static final Pattern CLOSING_CODE_FENCE = Pattern.compile("(?is)\\s*```\\s*$");
    private static final Pattern ZERO_WIDTH_CHARS = Pattern.compile("[\\u200B-\\u200D\\u2060]");

    private AiResponseParser() {
    }

    public static String sanitizeJsonArray(String response) {
        if (response == null || response.isBlank()) {
            throw new IllegalArgumentException("AI response is empty.");
        }

        String sanitized = response.replace("\uFEFF", "");
        sanitized = ZERO_WIDTH_CHARS.matcher(sanitized).replaceAll("").trim();
        sanitized = OPENING_CODE_FENCE.matcher(sanitized).replaceFirst("");
        sanitized = CLOSING_CODE_FENCE.matcher(sanitized).replaceFirst("");
        sanitized = sanitized.replace("`", "").trim();

        int firstArrayBracket = sanitized.indexOf('[');
        int lastArrayBracket = sanitized.lastIndexOf(']');
        if (firstArrayBracket < 0 || lastArrayBracket < firstArrayBracket) {
            throw new IllegalArgumentException("AI response does not contain a JSON array.");
        }

        return sanitized.substring(firstArrayBracket, lastArrayBracket + 1).trim();
    }

    public static <T> List<T> parseStrictJsonArray(
            String sanitizedJson,
            ObjectMapper objectMapper,
            TypeReference<List<T>> targetType,
            ObjIntConsumer<JsonNode> itemValidator
    ) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(sanitizedJson);
        if (!root.isArray()) {
            throw new IllegalArgumentException("AI response root must be a JSON array.");
        }

        int index = 0;
        for (JsonNode item : root) {
            itemValidator.accept(item, index);
            index++;
        }

        return objectMapper.readValue(sanitizedJson, targetType);
    }

    public static void requireExactObject(JsonNode node, Set<String> requiredFields, String context) {
        if (node == null || !node.isObject()) {
            throw new IllegalArgumentException(context + " must be a JSON object.");
        }

        Set<String> actualFields = fieldNames(node);
        if (!actualFields.equals(requiredFields)) {
            throw new IllegalArgumentException(context + " must contain exactly fields " + requiredFields + ", got " + actualFields + ".");
        }
    }

    public static void requireTextField(JsonNode node, String fieldName, String context) {
        JsonNode value = node.get(fieldName);
        if (value == null || !value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException(context + "." + fieldName + " must be a non-empty string.");
        }
    }

    public static void requirePositiveIntField(JsonNode node, String fieldName, String context) {
        JsonNode value = node.get(fieldName);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalArgumentException(context + "." + fieldName + " must be a positive integer.");
        }
    }

    public static JsonNode requireObjectField(JsonNode node, String fieldName, String context) {
        JsonNode value = node.get(fieldName);
        if (value == null || !value.isObject()) {
            throw new IllegalArgumentException(context + "." + fieldName + " must be a JSON object.");
        }
        return value;
    }

    public static void requireExactObjectKeys(JsonNode node, Set<String> expectedKeys, String context) {
        Set<String> actualKeys = fieldNames(node);
        if (!actualKeys.equals(expectedKeys)) {
            throw new IllegalArgumentException(context + " must contain exactly keys " + expectedKeys + ", got " + actualKeys + ".");
        }
    }

    public static void requirePositiveLongValues(JsonNode node, String context) {
        Iterator<String> fieldNames = node.fieldNames();
        while (fieldNames.hasNext()) {
            String fieldName = fieldNames.next();
            JsonNode value = node.get(fieldName);
            if (value == null || !value.isIntegralNumber() || !value.canConvertToLong() || value.asLong() <= 0) {
                throw new IllegalArgumentException(context + "." + fieldName + " must be a positive recipe id.");
            }
        }
    }

    private static Set<String> fieldNames(JsonNode node) {
        Iterator<String> fieldNames = node.fieldNames();
        Set<String> names = new LinkedHashSet<>();
        while (fieldNames.hasNext()) {
            names.add(fieldNames.next());
        }
        return names;
    }
}
