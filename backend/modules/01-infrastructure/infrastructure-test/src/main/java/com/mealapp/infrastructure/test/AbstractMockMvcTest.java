package com.mealapp.infrastructure.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@AutoConfigureMockMvc
public abstract class AbstractMockMvcTest extends AbstractSpringTest {

    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected void setMockMvc(DefaultMockMvcBuilder mockMvcBuilder) {
        this.mockMvc = mockMvcBuilder
            .addFilters(new ThrowingOutputStreamFilter())
            .defaultRequest(get("/").with(systemJwt()))
            .build();
    }

    protected SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor systemJwt() {
        Jwt.Builder jwtBuilder = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim(JwtClaimNames.SUB, "system-user")
            .claim("name", "System")
            .claim("email", "system@mealapp.local");

        return jwt()
            .jwt(jwtBuilder.build())
            .authorities(new SimpleGrantedAuthority("ROLE_USER"));   // Rolü test amaçlı ekliyorum ileriye dönük
    }

}
