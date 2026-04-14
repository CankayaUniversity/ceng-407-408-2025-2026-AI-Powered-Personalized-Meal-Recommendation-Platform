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

    public enum UpdateMode {
        ADD, SUBTRACT, SET
    }

    /**
     * Kullanıcının tüm lokasyonlardaki envanterini getirir.
     */
    @Transactional
    public List<Inventory> getUserInventory(String userId) {
        ensureUserHasDefaultGroup(userId);
        return inventoryRepository.findByInventoryGroupUsersIdOrderByInventoryGroupIdAscIngredientNameAsc(userId);
    }

    /**
     * Kullanıcının belirli bir lokasyona ait envanterini getirir.
     */
    @Transactional(readOnly = true)
    public List<Inventory> getUserInventory(String userId, Long inventoryGroupId) {
        getRequiredGroup(userId, inventoryGroupId);
        return inventoryRepository.findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(inventoryGroupId, userId);
    }

    /**
     * Kullanıcıya ait envanter lokasyonlarını ve içeriklerini getirir.
     */
    @Transactional
    public List<InventoryGroup> getUserInventoryGroups(String userId) {
        ensureUserHasDefaultGroup(userId);
        List<InventoryGroup> groups = inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId);
        groups.forEach(this::hydrateGroup);
        return groups;
    }

    /**
     * Yeni bir envanter lokasyonu oluşturur.
     */
    public InventoryGroup createGroup(String userId, String name, String icon) {
        String normalizedName = normalizeGroupName(name);
        ensureGroupNameAvailable(userId, normalizedName, null);

        User user = getRequiredUser(userId);
        InventoryGroup group = InventoryGroup.builder()
                .name(normalizedName)
                .icon(normalizeIcon(icon))
                .build();
        
        // ManyToMany ilişkiyi her iki tarafta da kur (owning side: User)
        group.getUsers().add(user);
        user.getInventoryGroups().add(group);

        inventoryGroupRepository.save(group);
        userRepository.save(user);

        return hydrateGroup(group);
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

        if (inventoryGroupRepository.countByUsersId(userId) <= 1) {
            throw new MealAppDomainException("En az bir envanter lokasyonu bulunmalıdır.");
        }

        inventoryGroupRepository.delete(group);
    }

    /**
     * Belirli bir lokasyona malzeme ekler ya da aynı malzemeyi günceller.
     * Eğer malzeme zaten varsa, updateMode parametresine göre miktar güncellenir.
     */
    @Transactional
    public Inventory upsertInventoryItem(String userId, Long inventoryGroupId, Long ingredientId, Double quantity, String unit, UpdateMode updateMode) {
        InventoryGroup group = getRequiredGroup(userId, inventoryGroupId);
        Ingredient ingredient = getRequiredIngredient(ingredientId);

        return inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                .map(existing -> {
                    double currentQuantity = existing.getQuantity() != null ? existing.getQuantity() : 0.0;
                    double finalQuantity;

                    if (updateMode == UpdateMode.ADD) {
                        finalQuantity = currentQuantity + quantity;
                    } else if (updateMode == UpdateMode.SUBTRACT) {
                        finalQuantity = Math.max(0, currentQuantity - quantity);
                    } else {
                        finalQuantity = quantity;
                    }

                    existing.setQuantity(finalQuantity);
                    existing.setUnit(normalizeUnit(unit));
                    return inventoryRepository.save(existing);
                })
                .orElseGet(() -> inventoryRepository.save(Inventory.builder()
                        .inventoryGroup(group)
                        .ingredient(ingredient)
                        .quantity(quantity)
                        .unit(normalizeUnit(unit))
                        .build()));
    }

    /**
     * Belirli bir lokasyona malzeme ekler ya da aynı malzemeyi günceller (SET modu ile).
     */
    @Transactional
    public Inventory upsertInventoryItem(String userId, Long inventoryGroupId, Long ingredientId, Double quantity, String unit) {
        return upsertInventoryItem(userId, inventoryGroupId, ingredientId, quantity, unit, UpdateMode.SET);
    }

    /**
     * Mevcut bir envanter kalemini günceller.
     */
    @Transactional
    public Inventory updateInventoryItem(String userId, Long inventoryGroupId, Long itemId, Long ingredientId, Double quantity, String unit, UpdateMode updateMode) {
        Inventory item = inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(itemId, userId, inventoryGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter kalemi bulunamadı ID: " + itemId));

        if (!item.getIngredient().getId().equals(ingredientId)) {
            inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                    .filter(existing -> !existing.getId().equals(itemId))
                    .ifPresent(existing -> {
                        throw new MealAppDomainException("Bu malzeme seçili lokasyonda zaten mevcut.");
                    });
        }

        item.setIngredient(getRequiredIngredient(ingredientId));

        Double finalQuantity;
        double currentQuantity = item.getQuantity() != null ? item.getQuantity() : 0.0;

        if (updateMode == UpdateMode.ADD) {
            finalQuantity = currentQuantity + quantity;
        } else if (updateMode == UpdateMode.SUBTRACT) {
            finalQuantity = Math.max(0, currentQuantity - quantity);
        } else {
            finalQuantity = quantity;
        }

        item.setQuantity(finalQuantity);
        item.setUnit(normalizeUnit(unit));
        return inventoryRepository.save(item);
    }

    /**
     * Bir envanter kalemini siler.
     */
    public void deleteInventoryItem(String userId, Long inventoryGroupId, Long itemId) {
        Inventory item = inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(itemId, userId, inventoryGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter kalemi bulunamadı ID: " + itemId));
        inventoryRepository.delete(item);
    }

    /**
     * Belirli bir lokasyonu doğrular ve döndürür.
     */
    @Transactional(readOnly = true)
    public InventoryGroup getUserInventoryGroup(String userId, Long inventoryGroupId) {
        return getRequiredGroup(userId, inventoryGroupId);
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

        List<Inventory> items = inventoryRepository.findByInventoryGroupUsersIdAndIngredientIdOrderByInventoryGroupIdAsc(userId, ingredientId);
        double totalAvailable = items.stream().mapToDouble(i -> i.getQuantity() != null ? i.getQuantity() : 0.0).sum();
        
        if (totalAvailable < quantityToDeduct) {
            throw new com.mealapp.domain.common.exception.InsufficientStockException(
                    String.format("Envanterinizde '%s' malzemesi için yeterli stok yok. Mevcut: %.2f, Gerekli: %.2f",
                            getRequiredIngredient(ingredientId).getName(), totalAvailable, quantityToDeduct));
        }

        double remaining = quantityToDeduct;

        for (Inventory existing : items) {
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

    /**
     * Verilen malzemeyi seçili lokasyondaki stoktan düşer.
     * Eğer malzeme lokasyonda yoksa veya stok yetersizse istisna fırlatır.
     */
    public void consumeFromInventoryGroup(String userId, Long inventoryGroupId, Long ingredientId, Double quantityToDeduct) {
        if (quantityToDeduct == null || quantityToDeduct <= 0) {
            return;
        }

        InventoryGroup group = getRequiredGroup(userId, inventoryGroupId);
        Ingredient ingredient = getRequiredIngredient(ingredientId);

        Inventory inventory = inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                .orElseThrow(() -> new com.mealapp.domain.common.exception.InsufficientStockException(
                        String.format("HATA: '%s' lokasyonunda '%s' malzemesi bulunamadı! Lütfen önce envanterinize bu malzemeyi ekleyin.",
                                group.getName(), ingredient.getName())));

        double currentQuantity = inventory.getQuantity() != null ? inventory.getQuantity() : 0.0;

        if (currentQuantity < quantityToDeduct) {
            throw new com.mealapp.domain.common.exception.InsufficientStockException(
                    String.format("STOK YETERSİZ: '%s' lokasyonunda '%s' malzemesinden sadece %.2f %s var, ancak %.2f %s tüketilmeye çalışılıyor.",
                            group.getName(), ingredient.getName(), currentQuantity, inventory.getUnit(), quantityToDeduct, inventory.getUnit()));
        }

        if (currentQuantity == quantityToDeduct) {
            inventoryRepository.delete(inventory);
        } else {
            inventory.setQuantity(currentQuantity - quantityToDeduct);
            inventoryRepository.save(inventory);
        }
    }

    @Transactional
    public InventoryGroup ensureUserHasDefaultGroup(String userId) {
        return inventoryGroupRepository.findFirstByUsersIdOrderByIdAsc(userId)
                .orElseGet(() -> {
                    User user = getRequiredUser(userId);
                    InventoryGroup group = InventoryGroup.builder()
                            .name("Home")
                            .icon("home")
                            .build();
                    
                    // ManyToMany ilişkiyi her iki tarafta da kur (owning side: User)
                    group.getUsers().add(user);
                    user.getInventoryGroups().add(group);

                    inventoryGroupRepository.save(group);
                    userRepository.save(user);
                    
                    return group;
                });
    }

    public InventoryGroup getRequiredGroup(String userId, Long groupId) {
        return inventoryGroupRepository.findByIdAndUsersId(groupId, userId)
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
                ? inventoryGroupRepository.existsByUsersIdAndNameIgnoreCase(userId, name)
                : inventoryGroupRepository.existsByUsersIdAndNameIgnoreCaseAndIdNot(userId, name, currentGroupId);

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


    /**
     * Envanter lokasyonundan kullanıcıyı çıkarır.
     */
    public InventoryGroup removeUserFromGroup(String userId, Long groupId, String userIdToRemove) {
        InventoryGroup group = getRequiredGroup(userId, groupId);
        
        if (userId.equals(userIdToRemove)) {
            throw new MealAppDomainException("Kendinizi lokasyondan çıkaramazsınız.");
        }

        User userToRemove = userRepository.findById(userIdToRemove)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + userIdToRemove));

        group.getUsers().removeIf(u -> u.getId().equals(userIdToRemove));
        userToRemove.getInventoryGroups().removeIf(g -> g.getId().equals(groupId));

        userRepository.save(userToRemove);
        return hydrateGroup(inventoryGroupRepository.save(group));
    }

    private InventoryGroup hydrateGroup(InventoryGroup group) {
        if (group.getItems() != null) {
            group.getItems().size();
            group.getItems().forEach(item -> {
                if (item.getIngredient() != null) {
                    item.getIngredient().getName();
                    if (item.getIngredient().getIngredientUnits() != null) {
                        item.getIngredient().getIngredientUnits().size();
                    }
                }
            });
        }

        return group;
    }
}
