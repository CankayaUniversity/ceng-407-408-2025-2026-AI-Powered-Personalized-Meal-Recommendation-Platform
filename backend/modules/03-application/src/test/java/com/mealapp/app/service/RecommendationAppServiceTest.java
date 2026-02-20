package com.mealapp.app.service;

import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.model.mapper.recommendation.RecommendationMapper;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recommendation.service.RecommendationService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationAppServiceTest {

    @Mock
    private RecommendationService recommendationService;
    @Mock
    private UserService userService;
    @Mock
    private RecommendationMapper recommendationMapper;

    @InjectMocks
    private RecommendationAppService recommendationAppService;

    @Test
    void shouldGetRecommendations() {
        RecommendationRequest request = new RecommendationRequest();
        request.setUserId(1L);
        request.setAvailableIngredients(List.of("Tomato", "Onion"));

        User user = User.builder().id(1L).build();
        when(userService.findById(1L)).thenReturn(Optional.of(user));
        when(recommendationService.getRecommendations(any(), anyList())).thenReturn(List.of(new Recipe()));
        when(recommendationMapper.toResponse(anyList())).thenReturn(new RecommendationResponse());

        RecommendationResponse response = recommendationAppService.getRecommendations(request);

        assertNotNull(response);
    }
}
