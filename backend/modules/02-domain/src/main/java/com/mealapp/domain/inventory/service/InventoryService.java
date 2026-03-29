package com.mealapp.domain.inventory.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.repository.InventoryGroupRepository;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Kullanıcı envanteri ve lokasyon bazlı stok yönetimi iş mantığını yönetir.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryGroupRepository inventoryGroupRepository;
    private final UserRepository userRepository;
    private final IngredientRepository ingredientRepository;

    /**
     * Kullanıcının tüm lokasyonlardaki envanterini getirir.
     */
    public List<Inventory> getUserInventory(String userId) {
        ensureUserHasDefaultGroup(userId);
        return inventoryRepository.findByUserIdOrderByInventoryGroupIdAscIngredientNameAsc(userId);
    }

    /**
     * Kullanıcının belirli bir lokasyona ait envanterini getirir.
     */
    @Transactional(readOnly = true)
    public List<Inventory> getUserInventory(String userId, Long inventoryGroupId) {
        getRequiredGroup(userId, inventoryGroupId);
        return inventoryRepository.findByInventoryGroupIdAndUserIdOrderByIngredientNameAsc(inventoryGroupId, userId);
    }

    /**
     * Kullanıcıya ait envanter lokasyonlarını ve içeriklerini getirir.
     */
    public List<InventoryGroup> getUserInventoryGroups(String userId) {
        ensureUserHasDefaultGroup(userId);
        List<InventoryGroup> groups = inventoryGroupRepository.findByUserIdOrderByIdAsc(userId);
        groups.forEach(this::hydrateGroup);
        return groups;
    }

    /**
     * Yeni bir envanter lokasyonu oluşturur.
     */
    public InventoryGroup createGroup(String userId, String name, String icon) {
        String normalizedName = normalizeGroupName(name);
        ensureGroupNameAvailable(userId, normalizedName, null);

        InventoryGroup group = InventoryGroup.builder()
                .name(normalizedName)
                .icon(normalizeIcon(icon))
                .user(getRequiredUser(userId))
                .build();

        return hydrateGroup(inventoryGroupRepository.save(group));
    }

    /**
     * Var olan envanter lokasyonunu günceller.
     */
    public InventoryGroup updateGroup(String userId, Long groupId, String name, String icon) {
        InventoryGroup group = getRequiredGroup(userId, groupId);
        String normalizedName = normalizeGroupName(name);
        ensureGroupNameAvailable(userId, normalizedName, group.getId());

        group.setName(normalizedName);
        group.setIcon(normalizeIcon(icon));
        return hydrateGroup(inventoryGroupRepository.save(group));
    }

    /**
     * Envanter lokasyonunu siler.
     */
    public void deleteGroup(String userId, Long groupId) {
        InventoryGroup group = getRequiredGroup(userId, groupId);

        if (inventoryGroupRepository.countByUserId(userId) <= 1) {
            throw new MealAppDomainException("En az bir envanter lokasyonu bulunmalıdır.");
        }

        inventoryGroupRepository.delete(group);
    }

    /**
     * Belirli bir lokasyona malzeme ekler ya da aynı malzemeyi günceller.
     */
    public Inventory upsertInventoryItem(String userId, Long inventoryGroupId, Long ingredientId, Double quantity, String unit) {
        InventoryGroup group = getRequiredGroup(userId, inventoryGroupId);
        Ingredient ingredient = getRequiredIngredient(ingredientId);

        return inventoryRepository.findByUserIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                .map(existing -> {
                    existing.setQuantity(quantity);
                    existing.setUnit(normalizeUnit(unit));
                    return inventoryRepository.save(existing);
                })
                .orElseGet(() -> inventoryRepository.save(Inventory.builder()
                        .user(group.getUser())
                        .inventoryGroup(group)
                        .ingredient(ingredient)
                        .quantity(quantity)
                        .unit(normalizeUnit(unit))
                        .build()));
    }

    /**
     * Mevcut bir envanter kalemini günceller.
     */
    public Inventory updateInventoryItem(String userId, Long inventoryGroupId, Long itemId, Long ingredientId, Double quantity, String unit) {
        Inventory item = inventoryRepository.findByIdAndUserIdAndInventoryGroupId(itemId, userId, inventoryGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter kalemi bulunamadı ID: " + itemId));

        if (!item.getIngredient().getId().equals(ingredientId)) {
            inventoryRepository.findByUserIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                    .filter(existing -> !existing.getId().equals(itemId))
                    .ifPresent(existing -> {
                        throw new MealAppDomainException("Bu malzeme seçili lokasyonda zaten mevcut.");
                    });
        }

        item.setIngredient(getRequiredIngredient(ingredientId));
        item.setQuantity(quantity);
        item.setUnit(normalizeUnit(unit));
        return inventoryRepository.save(item);
    }

    /**
     * Bir envanter kalemini siler.
     */
    public void deleteInventoryItem(String userId, Long inventoryGroupId, Long itemId) {
        Inventory item = inventoryRepository.findByIdAndUserIdAndInventoryGroupId(itemId, userId, inventoryGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter kalemi bulunamadı ID: " + itemId));
        inventoryRepository.delete(item);
    }

    /**
     * Varsayılan lokasyona toplu envanter güncellemesi yapar.
     */
    public void updateInventory(String userId, List<Inventory> newItems) {
        InventoryGroup defaultGroup = ensureUserHasDefaultGroup(userId);

        for (Inventory item : newItems) {
            if (item.getIngredient() == null || item.getIngredient().getId() == null) {
                continue;
            }

            upsertInventoryItem(
                    userId,
                    defaultGroup.getId(),
                    item.getIngredient().getId(),
                    item.getQuantity(),
                    item.getUnit()
            );
        }
    }

    /**
     * Verilen malzemeleri kullanıcının lokasyonlar arası stoklarından düşer.
     */
    public void consumeFromInventory(String userId, Long ingredientId, Double quantityToDeduct) {
        if (quantityToDeduct == null || quantityToDeduct <= 0) {
            return;
        }

        double remaining = quantityToDeduct;

        for (Inventory existing : inventoryRepository.findByUserIdAndIngredientIdOrderByInventoryGroupIdAsc(userId, ingredientId)) {
            double currentQuantity = existing.getQuantity() != null ? existing.getQuantity() : 0.0;

            if (currentQuantity <= 0) {
                inventoryRepository.delete(existing);
                continue;
            }

            if (currentQuantity <= remaining) {
                remaining -= currentQuantity;
                inventoryRepository.delete(existing);
            } else {
                existing.setQuantity(currentQuantity - remaining);
                inventoryRepository.save(existing);
                break;
            }
        }
    }

    private InventoryGroup ensureUserHasDefaultGroup(String userId) {
        return inventoryGroupRepository.findFirstByUserIdOrderByIdAsc(userId)
                .orElseGet(() -> inventoryGroupRepository.save(InventoryGroup.builder()
                        .name("Home")
                        .icon("home")
                        .user(getRequiredUser(userId))
                        .build()));
    }

    private InventoryGroup getRequiredGroup(String userId, Long groupId) {
        return inventoryGroupRepository.findByIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter lokasyonu bulunamadı ID: " + groupId));
    }

    private User getRequiredUser(String userId) {
        return userRepository.findById(userId)
                .orElseGet(() -> userRepository.save(User.builder()
                        .id(userId)
                        .build()));
    }

    private Ingredient getRequiredIngredient(Long ingredientId) {
        return ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException("Malzeme bulunamadı ID: " + ingredientId));
    }

    private void ensureGroupNameAvailable(String userId, String name, Long currentGroupId) {
        boolean exists = currentGroupId == null
                ? inventoryGroupRepository.existsByUserIdAndNameIgnoreCase(userId, name)
                : inventoryGroupRepository.existsByUserIdAndNameIgnoreCaseAndIdNot(userId, name, currentGroupId);

        if (exists) {
            throw new MealAppDomainException("Bu isimde bir envanter lokasyonu zaten mevcut.");
        }
    }

    private String normalizeGroupName(String name) {
        if (name == null || name.isBlank()) {
            throw new MealAppDomainException("Envanter lokasyonu adı boş olamaz.");
        }

        return name.trim();
    }

    private String normalizeIcon(String icon) {
        if (icon == null || icon.isBlank()) {
            return "home";
        }

        return icon.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUnit(String unit) {
        if (unit == null || unit.isBlank()) {
            throw new MealAppDomainException("Birim bilgisi boş olamaz.");
        }

        return unit.trim();
    }

    private InventoryGroup hydrateGroup(InventoryGroup group) {
        if (group.getItems() != null) {
            group.getItems().size();
            group.getItems().forEach(item -> {
                if (item.getIngredient() != null) {
                    item.getIngredient().getName();
                }
            });
        }

        return group;
    }
}
