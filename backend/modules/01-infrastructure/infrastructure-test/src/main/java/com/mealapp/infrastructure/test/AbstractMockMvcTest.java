package com.mealapp.infrastructure.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@AutoConfigureMockMvc
public abstract class AbstractMockMvcTest extends AbstractSpringTest {

    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected void setMockMvc(WebApplicationContext webApplicationContext) {
        this.mockMvc = webAppContextSetup(webApplicationContext)
                .addFilters(new ThrowingOutputStreamFilter())
                .build();
    }
}
