package com.mealapp.domain.inventory.service;

import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.entity.InventoryInvitation;
import com.mealapp.domain.inventory.repository.InventoryGroupRepository;
import com.mealapp.domain.inventory.repository.InventoryInvitationRepository;
import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.notification.service.NotificationService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryInvitationService {

    private final InventoryInvitationRepository invitationRepository;
    private final InventoryGroupRepository groupRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public InventoryInvitation inviteUser(String inviterId, Long groupId, String inviteeEmail) {
        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new RuntimeException("Inviter not found"));

        InventoryGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Inventory group not found"));

        // Check if inviter is member of the group
        boolean isMember = group.getUsers().stream()
                .anyMatch(u -> u.getId().equals(inviterId));
        if (!isMember) {
            throw new RuntimeException("Only group members can invite others");
        }

        // Check if invitee is already a member
        boolean isAlreadyMember = group.getUsers().stream()
                .anyMatch(u -> inviteeEmail.equalsIgnoreCase(u.getEmail()));
        if (isAlreadyMember) {
            throw new RuntimeException("User is already a member of this group");
        }

        // Check for existing pending invitation
        invitationRepository.findByInviteeEmailAndInventoryGroupIdAndStatus(
                inviteeEmail, groupId, InventoryInvitation.InvitationStatus.PENDING)
                .ifPresent(i -> {
                    throw new RuntimeException("An invitation is already pending for this user and group");
                });

        InventoryInvitation invitation = invitationRepository.save(InventoryInvitation.builder()
                .inventoryGroup(group)
                .inviter(inviter)
                .inviteeEmail(inviteeEmail)
                .status(InventoryInvitation.InvitationStatus.PENDING)
                .build());

        // Create notification for invitee if they exist in the system
        userRepository.findByEmail(inviteeEmail).ifPresent(invitee -> {
            notificationService.createNotification(
                    invitee,
                    "Yeni Envanter Daveti",
                    String.format("%s sizi '%s' envanter grubuna katılmaya davet etti.", 
                            inviter.getName() != null ? inviter.getName() : inviter.getEmail(), group.getName()),
                    Notification.NotificationType.INVITATION,
                    invitation.getId().toString()
            );
        });

        return invitation;
    }

    public List<InventoryInvitation> getPendingInvitations(String userEmail) {
        return invitationRepository.findByInviteeEmailAndStatus(userEmail, InventoryInvitation.InvitationStatus.PENDING);
    }

    @Transactional
    public void acceptInvitation(Long invitationId, String userEmail) {
        InventoryInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));

        if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
            throw new RuntimeException("You cannot accept this invitation");
        }

        if (invitation.getStatus() != InventoryInvitation.InvitationStatus.PENDING) {
            throw new RuntimeException("Invitation is no longer pending");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        InventoryGroup group = invitation.getInventoryGroup();
        
        // Add user to group
        if (!group.getUsers().contains(user)) {
            group.getUsers().add(user);
            user.getInventoryGroups().add(group);
            groupRepository.save(group);
            userRepository.save(user);
        }

        invitation.setStatus(InventoryInvitation.InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);
    }

    @Transactional
    public void rejectInvitation(Long invitationId, String userEmail) {
        InventoryInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));

        if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
            throw new RuntimeException("You cannot reject this invitation");
        }

        invitation.setStatus(InventoryInvitation.InvitationStatus.REJECTED);
        invitationRepository.save(invitation);
    }
}
