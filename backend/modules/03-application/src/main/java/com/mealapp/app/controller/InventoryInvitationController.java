package com.mealapp.app.controller;

import com.mealapp.app.model.dto.inventory.InventoryInvitationResponse;
import com.mealapp.app.model.mapper.inventory.InventoryMapper;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.inventory.service.InventoryInvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory-invitations")
@RequiredArgsConstructor
public class InventoryInvitationController {

    private final InventoryInvitationService invitationService;
    private final InventoryMapper inventoryMapper;

    @GetMapping("/pending")
    public List<InventoryInvitationResponse> getPendingInvitations(@AuthenticationPrincipal Jwt jwt) {
        try {
            String email = extractEmail(jwt);
            return inventoryMapper.toInvitationResponses(invitationService.getPendingInvitations(email));
        } catch (Exception e) {
            // If email is not found, return empty list instead of 500
            return List.of();
        }
    }

    @PostMapping("/{invitationId}/accept")
    public void acceptInvitation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long invitationId
    ) {
        String email = extractEmail(jwt);
        invitationService.acceptInvitation(invitationId, email);
    }

    @PostMapping("/{invitationId}/reject")
    public void rejectInvitation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long invitationId
    ) {
        String email = extractEmail(jwt);
        invitationService.rejectInvitation(invitationId, email);
    }

    @PostMapping("/{invitationId}/cancel")
    public void deleteInvitation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long invitationId
    ) {
        String emailOrId = extractEmailOrSubject(jwt);
        invitationService.deleteInvitation(invitationId, emailOrId);
    }

    private String extractEmailOrSubject(Jwt jwt) {
        try {
            return extractEmail(jwt);
        } catch (Exception e) {
            return jwt.getSubject();
        }
    }

    private String extractEmail(Jwt jwt) {
        if (jwt == null) {
            throw MealAppDomainException.withCode("domain.auth.user_missing");
        }
        
        // Try all possible email claims (Keycloak standard is 'email')
        String email = jwt.getClaimAsString("email");
        
        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("preferred_username");
        }
        
        // If still no email, check subject if it looks like an email
        if (email == null || email.isBlank() || !email.contains("@")) {
            String sub = jwt.getSubject();
            if (sub != null && sub.contains("@")) {
                email = sub;
            }
        }
        
        // Fallback: If we have an email claim but it's not verified, some providers might not send it
        // but Keycloak usually sends it regardless unless configured otherwise.
        
        if (email == null || email.isBlank()) {
            throw MealAppDomainException.withCode("domain.auth.email_missing");
        }
        return email;
    }

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw MealAppDomainException.withCode("domain.auth.user_missing");
        }
        return jwt.getSubject();
    }
}
