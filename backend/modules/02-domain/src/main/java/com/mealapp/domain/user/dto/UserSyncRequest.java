package com.mealapp.domain.user.dto;

import java.util.List;

public record UserSyncRequest(
    String keycloakId,
    String email,
    String name,
    List<String> roles
) {
}
