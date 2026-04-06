package com.mealapp.domain.inventory.entity;

import com.mealapp.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Kullanıcının stoklarını fiziksel lokasyonlara göre ayırdığı grup.
 */
@Entity
@Table(
        name = "inventory_groups"
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String icon;

    @ManyToMany(mappedBy = "inventoryGroups")
    @Builder.Default
    private List<User> users = new ArrayList<>();

    @OneToMany(mappedBy = "inventoryGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Inventory> items = new ArrayList<>();
}
