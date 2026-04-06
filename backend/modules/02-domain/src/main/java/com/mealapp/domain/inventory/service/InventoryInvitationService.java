package com.mealapp.domain.inventory.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
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
    public InventoryInvitation inviteUser(String inviterId, String inviterEmail, Long groupId, String inviteeEmail) {
        System.out.println("[DEBUG_LOG] inviteUser started: inviterId=" + inviterId + ", inviterEmail=" + inviterEmail + ", groupId=" + groupId + ", inviteeEmail=" + inviteeEmail);
        User inviter = userRepository.findById(inviterId)
                .orElse(null);

        if (inviter == null) {
            System.out.println("[DEBUG_LOG] inviter not found in DB: " + inviterId);
            // If user is not in our DB yet, they might be a first time user from Keycloak
            // We should still allow them if they are authenticated, but the service needs a User entity
            throw new MealAppDomainException("Davet eden kullanıcı sistemde bulunamadı. Lütfen önce profilinizi tamamlayın.");
        }

        InventoryGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter grubu bulunamadı."));
        System.out.println("[DEBUG_LOG] group found: " + group.getName());

        // Check if inviter is member of the group
        boolean isMember = group.getUsers() != null && group.getUsers().stream()
                .anyMatch(u -> u != null && (u.getId().equals(inviterId) || (u.getEmail() != null && u.getEmail().equalsIgnoreCase(inviterEmail))));
        
        System.out.println("[DEBUG_LOG] isMember check: " + isMember);
        if (!isMember) {
            // RELINK CHECK: Maybe the user is the same but IDs are different?
            // This happens if Keycloak subject changed or different providers used
            boolean emailMatch = group.getUsers() != null && group.getUsers().stream()
                    .anyMatch(u -> u != null && u.getEmail() != null && u.getEmail().equalsIgnoreCase(inviterEmail));
            
            System.out.println("[DEBUG_LOG] emailMatch check: " + emailMatch);
            if (!emailMatch) {
                throw new MealAppDomainException("Sadece grup üyeleri başkalarını davet edebilir.");
            }
        }

        // Cannot invite yourself
        if (inviteeEmail.equalsIgnoreCase(inviterEmail) || (inviter.getEmail() != null && inviteeEmail.equalsIgnoreCase(inviter.getEmail()))) {
            throw new MealAppDomainException("Kendinizi ortak envantere davet edemezsiniz.");
        }

        // Check if invitee is already a member
        boolean isAlreadyMember = group.getUsers() != null && group.getUsers().stream()
                .anyMatch(u -> u != null && u.getEmail() != null && inviteeEmail.equalsIgnoreCase(u.getEmail()));
        System.out.println("[DEBUG_LOG] isAlreadyMember check: " + isAlreadyMember);
        if (isAlreadyMember) {
            throw new MealAppDomainException(String.format("'%s' kullanıcısı zaten '%s' grubunun üyesi.", inviteeEmail, group.getName()));
        }

        // Check for existing invitations (PENDING, REJECTED, etc.)
        // We delete them to allow "resending" a fresh invitation
        List<InventoryInvitation> existingInvitations = invitationRepository.findByInviteeEmailAndInventoryGroupId(
                inviteeEmail, groupId);
        
        if (!existingInvitations.isEmpty()) {
            System.out.println("[DEBUG_LOG] deleting " + existingInvitations.size() + " existing invitations for " + inviteeEmail);
            invitationRepository.deleteAll(existingInvitations);
            invitationRepository.flush();
        }

        InventoryInvitation invitation = InventoryInvitation.builder()
                .inventoryGroup(group)
                .inviter(inviter)
                .inviteeEmail(inviteeEmail)
                .status(InventoryInvitation.InvitationStatus.PENDING)
                .build();
        
        invitation = invitationRepository.saveAndFlush(invitation);
        System.out.println("[DEBUG_LOG] invitation saved: " + invitation.getId());

        // Create notification for invitee if they exist in the system
        final InventoryInvitation finalInvitation = invitation;
        userRepository.findByEmail(inviteeEmail).ifPresent(invitee -> {
            System.out.println("[DEBUG_LOG] invitee found in system, creating notification: " + invitee.getEmail());
            if (finalInvitation.getId() != null) {
                notificationService.createNotification(
                        invitee,
                        "Yeni Envanter Daveti",
                        String.format("%s sizi '%s' envanter grubuna katılmaya davet etti.", 
                                inviter.getName() != null ? inviter.getName() : inviter.getEmail(), group.getName()),
                        Notification.NotificationType.INVITATION,
                        finalInvitation.getId().toString()
                );
            }
        });

        return invitation;
    }

    @Transactional
    public void createNotificationsForPendingInvitations(User user) {
        if (user == null || user.getEmail() == null || user.getId() == null) return;
        
        List<InventoryInvitation> pendingInvitations = invitationRepository.findByInviteeEmailAndStatus(
                user.getEmail(), InventoryInvitation.InvitationStatus.PENDING);

        for (InventoryInvitation invitation : pendingInvitations) {
            // Check if notification already exists to prevent duplicates
            String targetId = invitation.getId() != null ? invitation.getId().toString() : null;
            if (targetId != null && notificationService.existsNotification(user.getId(), targetId, Notification.NotificationType.INVITATION)) {
                continue;
            }

            notificationService.createNotification(
                    user,
                    "Yeni Envanter Daveti",
                    String.format("%s sizi '%s' envanter grubuna katılmaya davet etti.", 
                            (invitation.getInviter() != null && invitation.getInviter().getName() != null) ? invitation.getInviter().getName() : 
                            (invitation.getInviter() != null ? invitation.getInviter().getEmail() : "Bir kullanıcı"), 
                            invitation.getInventoryGroup() != null ? invitation.getInventoryGroup().getName() : "bir envanter"),
                    Notification.NotificationType.INVITATION,
                    targetId
            );
        }
    }

    public List<InventoryInvitation> getPendingInvitations(String userEmail) {
        return invitationRepository.findByInviteeEmailAndStatus(userEmail, InventoryInvitation.InvitationStatus.PENDING);
    }

    @Transactional
    public void acceptInvitation(Long invitationId, String userEmail) {
        InventoryInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Davetiye bulunamadı."));

        if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
            throw new MealAppDomainException("Bu davetiyeyi kabul etme yetkiniz yok.");
        }

        if (invitation.getStatus() != InventoryInvitation.InvitationStatus.PENDING) {
            throw new MealAppDomainException("Davetiye artık bekliyor durumunda değil.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı."));

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
                .orElseThrow(() -> new ResourceNotFoundException("Davetiye bulunamadı."));

        if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
            throw new MealAppDomainException("Bu davetiyeyi reddetme yetkiniz yok.");
        }

        invitation.setStatus(InventoryInvitation.InvitationStatus.REJECTED);
        invitationRepository.save(invitation);
    }

    @Transactional
    public void deleteInvitation(Long invitationId, String userEmail) {
        InventoryInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Davetiye bulunamadı."));

        // Only inviter or invitee can delete/cancel
        boolean isInvitee = invitation.getInviteeEmail().equalsIgnoreCase(userEmail);
        boolean isInviter = invitation.getInviter() != null && 
                           (invitation.getInviter().getEmail().equalsIgnoreCase(userEmail) || 
                            invitation.getInviter().getId().equals(userEmail));

        if (!isInvitee && !isInviter) {
            throw new MealAppDomainException("Bu davetiyeyi silme yetkiniz yok.");
        }

        invitationRepository.delete(invitation);
    }
}
