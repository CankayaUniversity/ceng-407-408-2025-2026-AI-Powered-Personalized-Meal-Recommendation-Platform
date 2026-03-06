package com.mealapp.app.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class SecurityTestController {

    @GetMapping("/anonymous")
    public String publicApi() {
        return "Bu alana herkes girebilir (Public)";
    }

    @GetMapping("/user")
    public String userApi() {
        return "Bu alanı sadece giriş yapmış kullanıcılar görebilir!";
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminApi() {
        return "Bu alanı sadece ROLE_ADMIN yetkisi olanlar görebilir!";
    }
}
