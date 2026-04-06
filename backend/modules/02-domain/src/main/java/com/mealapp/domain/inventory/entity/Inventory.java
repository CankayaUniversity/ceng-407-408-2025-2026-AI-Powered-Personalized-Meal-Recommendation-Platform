package com.mealapp.domain.inventory.entity;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

/**
 * Kullanıcının elindeki malzemeleri (stok) temsil eden varlık sınıfı.
 * Malzeme adı, miktar, birim ve son kullanma tarihi gibi temel bilgileri tutar.
 */
@Entity
@Table(name = "inventories", uniqueConstraints = @UniqueConstraint(name = "unique_inventory", columnNames = {"inventory_group_id", "ingredient_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_group_id", nullable = false)
    private InventoryGroup inventoryGroup;

    private Double quantity;

    /**
     * Örn: GRAM, ADET, LİTRE, PAKET
     */
    private String unit;
}
