package com.mealapp.domain.inventory.repository;

import com.mealapp.domain.inventory.entity.InventoryInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryInvitationRepository extends JpaRepository<InventoryInvitation, Long> {
    List<InventoryInvitation> findByInviteeEmailAndStatus(String inviteeEmail, InventoryInvitation.InvitationStatus status);
    Optional<InventoryInvitation> findByInviteeEmailAndInventoryGroupIdAndStatus(String inviteeEmail, Long inventoryGroupId, InventoryInvitation.InvitationStatus status);
}
