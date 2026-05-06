package com.mealapp.app.model.mapper.inventory;

import com.mealapp.app.model.dto.inventory.InventoryGroupResponse;
import com.mealapp.app.model.dto.inventory.InventoryItemResponse;
import com.mealapp.app.model.dto.inventory.InventoryInvitationResponse;
import com.mealapp.app.model.dto.notification.NotificationResponse;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.entity.InventoryInvitation;
import com.mealapp.domain.inventory.repository.InventoryInvitationRepository;
import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class InventoryMapper {

    private final IngredientMapper ingredientMapper;
    private final UserMapper userMapper;
    private final InventoryInvitationRepository invitationRepository;
    private final RecipeRepository recipeRepository;

    public InventoryGroupResponse toGroupResponse(InventoryGroup group, int lowStockCount) {
        List<InventoryItemResponse> itemResponses = group.getItems() == null
                ? List.of()
                : group.getItems().stream()
                .sorted(Comparator.comparing(
                        item -> item.getIngredient() != null ? item.getIngredient().getName() : "",
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(this::toItemResponse)
                .toList();

        long categoryCount = group.getItems() == null
                ? 0
                : group.getItems().stream()
                .filter(item -> item.getIngredient() != null && item.getIngredient().getCategory() != null)
                .map(item -> item.getIngredient().getCategory())
                .distinct()
                .count();

        return InventoryGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .icon(group.getIcon())
                .itemCount(group.getItems() != null ? group.getItems().size() : 0)
                .categoryCount((int) categoryCount)
                .lowStockCount(lowStockCount)
                .users(group.getUsers() != null ? group.getUsers().stream().map(userMapper::toDto).toList() : List.of())
                .items(itemResponses)
                .build();
    }

    public List<InventoryGroupResponse> toGroupResponses(List<InventoryGroup> groups, List<Inventory> allUserLowStockItems) {
        return groups.stream()
                .map(group -> {
                    int groupLowStockCount = (int) allUserLowStockItems.stream()
                            .filter(item -> item.getInventoryGroup() != null && item.getInventoryGroup().getId().equals(group.getId()))
                            .count();
                    return toGroupResponse(group, groupLowStockCount);
                })
                .toList();
    }

    public List<InventoryItemResponse> toItemResponses(List<Inventory> items) {
        return items.stream().map(this::toItemResponse).toList();
    }

    public InventoryItemResponse toItemResponse(Inventory item) {
        Double displayQuantity = item.getQuantity();
        String unit = item.getUnit();
        Double grams = displayQuantity;

        // Eğer sıvı ise, quantity alanında hacim (ml) saklıyoruz, grams alanına yoğunlukla çarparak kütleyi (g) yazalım.
        // Eğer katı ise, quantity ve grams zaten aynı (g).
        if (item.getIngredient() != null && item.getIngredient().getPhysicalState() == com.mealapp.domain.recipe.entity.Ingredient.PhysicalState.LIQUID) {
            grams = displayQuantity * item.getIngredient().getDensity();
        }
        
        return InventoryItemResponse.builder()
                .id(item.getId())
                .inventoryGroupId(item.getInventoryGroup() != null ? item.getInventoryGroup().getId() : null)
                .ingredientId(item.getIngredient() != null ? item.getIngredient().getId() : null)
                .quantity(displayQuantity)
                .grams(grams)
                .unit(unit)
                .ingredient(ingredientMapper.toDTO(item.getIngredient()))
                .build();
    }

    public NotificationResponse toNotificationResponse(Notification notification) {
        if (notification == null) return null;

        InventoryInvitation.InvitationStatus invitationStatus = null;
        if (notification.getType() == Notification.NotificationType.INVITATION && notification.getTargetId() != null) {
            try {
                Long invitationId = Long.parseLong(notification.getTargetId());
                invitationStatus = invitationRepository.findById(invitationId)
                        .map(InventoryInvitation::getStatus)
                        .orElse(null);
            } catch (NumberFormatException ignored) {}
        }

        com.mealapp.domain.recipe.entity.RecipeStatus recipeStatus = null;
        if (notification.getType() == Notification.NotificationType.RECIPE_APPROVAL && notification.getTargetId() != null) {
            try {
                Long recipeId = Long.parseLong(notification.getTargetId());
                recipeStatus = recipeRepository.findById(recipeId)
                        .map(Recipe::getStatus)
                        .orElse(com.mealapp.domain.recipe.entity.RecipeStatus.APPROVED);
            } catch (NumberFormatException ignored) {}
        }

        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .targetId(notification.getTargetId())
                .status(notification.getStatus())
                .invitationStatus(invitationStatus)
                .recipeStatus(recipeStatus)
                .createdAt(notification.getCreatedAt())
                .build();
    }

    public List<NotificationResponse> toNotificationResponses(List<Notification> notifications) {
        return notifications.stream().map(this::toNotificationResponse).toList();
    }

    public InventoryInvitationResponse toInvitationResponse(InventoryInvitation invitation) {
        if (invitation == null) return null;
        return InventoryInvitationResponse.builder()
                .id(invitation.getId())
                .groupId(invitation.getInventoryGroup() != null ? invitation.getInventoryGroup().getId() : null)
                .groupName(invitation.getInventoryGroup() != null ? invitation.getInventoryGroup().getName() : null)
                .inviterName(invitation.getInviter() != null ? 
                        (invitation.getInviter().getName() != null ? invitation.getInviter().getName() : invitation.getInviter().getEmail()) 
                        : null)
                .inviteeEmail(invitation.getInviteeEmail())
                .status(invitation.getStatus())
                .createdAt(invitation.getCreatedAt())
                .build();
    }

    public List<InventoryInvitationResponse> toInvitationResponses(List<InventoryInvitation> invitations) {
        return invitations.stream().map(this::toInvitationResponse).toList();
    }
}
