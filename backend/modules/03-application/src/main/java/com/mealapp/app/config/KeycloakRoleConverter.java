package com.mealapp.app.config;

import com.mealapp.domain.user.dto.UserSyncRequest;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RequiredArgsConstructor
public class KeycloakRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserService userService;
    private final JwtGrantedAuthoritiesConverter defaultAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<String> roles = extractRoles(jwt);
        
        Collection<GrantedAuthority> authorities = Stream.concat(
            defaultAuthoritiesConverter.convert(jwt).stream(),
            roles.stream()
                .map(roleName -> "ROLE_" + roleName.toUpperCase())
                .map(SimpleGrantedAuthority::new)
        ).collect(Collectors.toSet());

        // Sync user with database
        userService.syncUser(new UserSyncRequest(
            jwt.getSubject(),
            jwt.getClaimAsString("email"),
            jwt.getClaimAsString("name"),
            List.copyOf(roles)
        ));

        return new JwtAuthenticationToken(jwt, authorities, jwt.getClaimAsString("preferred_username"));
    }

    private Collection<String> extractRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null || realmAccess.isEmpty()) {
            return Collections.emptyList();
        }

        @SuppressWarnings("unchecked")
        Collection<String> roles = (Collection<String>) realmAccess.get("roles");
        return roles != null ? roles : Collections.emptyList();
    }
}
