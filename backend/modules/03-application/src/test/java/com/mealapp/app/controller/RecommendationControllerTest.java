package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recommendation.MenuRecommendationHistoryResponse;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationRequest;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationResponse;
import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.service.RecommendationAppService;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import com.mealapp.infrastructure.test.AbstractMockMvcTest;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
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
    void shouldGetMenuRecommendationsForAuthenticatedUser() throws Exception {
        MenuRecommendationRequest request = new MenuRecommendationRequest();
        request.setInventoryGroupId(10L);
        request.setSelectedCategories(List.of(RecipeCategory.CORBALAR, RecipeCategory.ANA_YEMEKLER));
        request.setAiModel("FREE");

        when(recommendationAppService.getMenuRecommendations(eq("system-user"), any()))
                .thenReturn(new MenuRecommendationResponse());

        mockMvc.perform(post("/api/v1/recommendations/menu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(recommendationAppService).getMenuRecommendations(eq("system-user"), any());
    }

    @Test
    void shouldRejectMenuRecommendationsWithoutAuthenticatedUser() throws Exception {
        MenuRecommendationRequest request = new MenuRecommendationRequest();
        request.setSelectedCategories(List.of(RecipeCategory.CORBALAR));

        mockMvc.perform(post("/api/v1/recommendations/menu")
                        .with(anonymous())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldGetRecommendationHistory() throws Exception {
        when(recommendationAppService.getRecommendationHistory(eq("user-1")))
                .thenReturn(List.of(new RecommendationResponse()));

        mockMvc.perform(get("/api/v1/recommendations/history/user-1"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldGetMenuRecommendationHistory() throws Exception {
        when(recommendationAppService.getMenuRecommendationHistory(eq("user-1")))
                .thenReturn(List.of(new MenuRecommendationHistoryResponse()));

        mockMvc.perform(get("/api/v1/recommendations/menu/history/user-1"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldRateRecommendation() throws Exception {
        Map<String, Object> request = Map.of(
                "userId", "user-1",
                "recommendedRecipeId", 1L,
                "rating", 8,
                "comment", "Good"
        );

        mockMvc.perform(post("/api/v1/recommendations/rate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(recommendationAppService).rateRecommendation("user-1", 1L, 8, "Good");
    }

    @Test
    void shouldMarkRecommendationAsCooked() throws Exception {
        mockMvc.perform(post("/api/v1/recommendations/cook/1"))
                .andExpect(status().isOk());

        verify(recommendationAppService).markAsCooked(1L);
    }
}
