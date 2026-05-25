package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recommendation.MenuRecommendationHistoryResponse;
import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.service.RecommendationAppService;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import com.mealapp.infrastructure.test.AbstractMockMvcTest;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecommendationControllerTest extends AbstractMockMvcTest {

    @MockitoBean
    private RecommendationAppService recommendationAppService;

    @Test
    void shouldGetRecommendations() throws Exception {
        RecommendationRequest request = new RecommendationRequest();
        request.setUserId("user-1");
        request.setAvailableIngredients(List.of("Tomato"));
        request.setDislikedIngredients(List.of("Onion"));

        when(recommendationAppService.getRecommendations(any())).thenReturn(new RecommendationResponse());

        mockMvc.perform(post("/api/v1/recommendations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void shouldGetMenuRecommendationHistory() throws Exception {
        when(recommendationAppService.getMenuRecommendationHistory(eq("user-1")))
                .thenReturn(List.of(new MenuRecommendationHistoryResponse()));

        mockMvc.perform(get("/api/v1/recommendations/menu/history/user-1"))
                .andExpect(status().isOk());
    }
}
