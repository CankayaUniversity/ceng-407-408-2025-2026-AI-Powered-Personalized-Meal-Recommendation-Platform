package com.mealapp.domain.recipe.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Kullanıcıların favori tariflerini tutan varlık sınıfı.
 */
@Entity
@Table(name = "recipe_favorites", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "recipe_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeFavorite extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;
}
