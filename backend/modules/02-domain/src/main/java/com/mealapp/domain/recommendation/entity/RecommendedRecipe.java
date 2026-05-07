package com.mealapp.domain.recommendation.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import com.mealapp.domain.recipe.entity.Recipe;
import jakarta.persistence.*;
import lombok.*;

/**
 * Bir öneri seansı içindeki tek bir tarifi temsil eder.
 * AI tarafından bu tarif için üretilen özel içgörüyü ve kullanıcının bu öneriye özel geri bildirimini tutar.
 */
@Entity
@Table(name = "recommended_recipes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendedRecipe extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommendation_id", nullable = false)
    private Recommendation recommendation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    /**
     * AI tarafından bu tarif için üretilen özel içgörü.
     */
    @Column(columnDefinition = "TEXT")
    private String aiInsight;

    /**
     * Kullanıcının bu öneri özelinde verdiği puan (1-5 arası).
     */
    private Integer userRating;

    /**
     * Kullanıcının bu öneri özelinde yaptığı yorum.
     */
    @Column(columnDefinition = "TEXT")
    private String userComment;

    /**
     * Kullanıcının bu tarifi pişirip pişirmediği bilgisi.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean isCooked = false;
}
