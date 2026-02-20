package com.mealapp.domain.recipe.entity;

import com.mealapp.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Kullanıcıların tarifler için yaptığı değerlendirmeleri temsil eder.
 */
@Entity
@Table(name = "recipe_ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    /**
     * Puan (1-10 arası).
     */
    @Column(nullable = false)
    private Integer rating;

    /**
     * Kullanıcı notu veya açıklaması.
     */
    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
