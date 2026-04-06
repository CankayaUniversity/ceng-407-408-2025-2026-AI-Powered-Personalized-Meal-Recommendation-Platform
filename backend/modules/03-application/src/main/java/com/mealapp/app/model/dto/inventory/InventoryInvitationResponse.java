package com.mealapp.app.model.dto.inventory;

import com.mealapp.domain.inventory.entity.InventoryInvitation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryInvitationResponse {
    private Long id;
    private Long groupId;
    private String groupName;
    private String inviterName;
    private String inviteeEmail;
    private InventoryInvitation.InvitationStatus status;
    private LocalDateTime createdAt;
}
