package com.mealapp.app.model.mapper.inventory;

import com.mealapp.app.model.dto.inventory.InventoryGroupResponse;
import com.mealapp.app.model.dto.inventory.InventoryInvitationResponse;
import com.mealapp.app.model.dto.inventory.InventoryItemResponse;
import com.mealapp.app.model.dto.notification.NotificationResponse;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.app.util.UnitConverter;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.entity.InventoryInvitation;
import com.mealapp.domain.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class InventoryMapper {

    private final IngredientMapper ingredientMapper;
    private final UserMapper userMapper;

    public InventoryGroupResponse toGroupResponse(InventoryGroup group) {
        List<InventoryItemResponse> items = group.getItems() == null
                ? List.of()
                : group.getItems().stream()
                .sorted(Comparator.comparing(
                        item -> item.getIngredient() != null ? item.getIngredient().getName() : "",
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(this::toItemResponse)
                .toList();

        return InventoryGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .icon(group.getIcon())
                .itemCount(items.size())
                .users(group.getUsers() != null ? group.getUsers().stream().map(userMapper::toDto).toList() : List.of())
                .items(items)
                .build();
    }

    public List<InventoryGroupResponse> toGroupResponses(List<InventoryGroup> groups) {
        return groups.stream()
                .map(this::toGroupResponse)
                .toList();
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
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .targetId(notification.getTargetId())
                .status(notification.getStatus())
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
