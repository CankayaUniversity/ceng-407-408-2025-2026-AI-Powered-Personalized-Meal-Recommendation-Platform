package com.mealapp.app.controller;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.inventory.entity.InventoryInvitation;
import com.mealapp.domain.inventory.service.InventoryInvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory-invitations")
@RequiredArgsConstructor
public class InventoryInvitationController {

    private final InventoryInvitationService invitationService;

    @PostMapping("/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public void inviteUser(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam Long groupId,
            @RequestParam String email
    ) {
        invitationService.inviteUser(requireAuthenticatedUserId(jwt), groupId, email);
    }

    @GetMapping("/pending")
    public List<InventoryInvitation> getPendingInvitations(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            throw new RuntimeException("User email not found in token");
        }
        return invitationService.getPendingInvitations(email);
    }

    @PostMapping("/{invitationId}/accept")
    public void acceptInvitation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long invitationId
    ) {
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            throw new RuntimeException("User email not found in token");
        }
        invitationService.acceptInvitation(invitationId, email);
    }

    @PostMapping("/{invitationId}/reject")
    public void rejectInvitation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long invitationId
    ) {
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            throw new RuntimeException("User email not found in token");
        }
        invitationService.rejectInvitation(invitationId, email);
    }

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }
        return jwt.getSubject();
    }
}
