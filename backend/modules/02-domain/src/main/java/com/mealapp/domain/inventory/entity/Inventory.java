package com.mealapp.domain.inventory.entity;

import com.mealapp.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * Kullanıcının elindeki malzemeleri (stok) temsil eden varlık sınıfı.
 * Malzeme adı, miktar, birim ve son kullanma tarihi gibi temel bilgileri tutar.
 */
@Entity
@Table(name = "inventories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Bu malzemenin hangi kullanıcıya ait olduğu.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String ingredientName;

    private Double quantity;

    /**
     * Örn: GRAM, ADET, LİTRE, PAKET
     */
    private String unit;
}
