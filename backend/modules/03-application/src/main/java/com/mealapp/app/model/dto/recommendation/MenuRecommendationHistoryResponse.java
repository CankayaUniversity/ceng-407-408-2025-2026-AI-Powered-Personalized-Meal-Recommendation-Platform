package com.mealapp.app.model.dto.recommendation;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class MenuRecommendationHistoryResponse {
    private Long id;
    private LocalDateTime createdAt;
    private String cravings;
    private String aiModel;
    private boolean isAiGenerated;
    private List<MenuRecommendationResponse.MenuDto> menus;
}
