package com.mealapp.domain.recommendation.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import com.mealapp.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Kullanıcıya sunulan bir öneri seansını temsil eder.
 * AI'ya gönderilen kriterleri ve sonuçta dönen tarifleri bir arada tutar.
 */
@Entity
@Table(name = "recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recommendation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Öneri sırasında kullanıcının belirttiği özel istekler (aşerme).
     */
    private String cravings;

    /**
     * Kullanılan AI modeli.
     */
    private String aiModel;

    /**
     * Önerinin AI tarafından mı yoksa fallback mekanizması tarafından mı üretildiğini belirtir.
     */
    private boolean isAiGenerated;

    /**
     * Bu seans kapsamında önerilen tarifler.
     */
    @OneToMany(mappedBy = "recommendation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RecommendedRecipe> recommendedRecipes = new ArrayList<>();

    public void addRecommendedRecipe(RecommendedRecipe recommendedRecipe) {
        recommendedRecipes.add(recommendedRecipe);
        recommendedRecipe.setRecommendation(this);
    }
}
