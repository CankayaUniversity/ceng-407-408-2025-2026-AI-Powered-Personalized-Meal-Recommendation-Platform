package com.mealapp.infrastructure.test;

import org.testcontainers.containers.PostgreSQLContainer;

public final class PostgresSingleton {

    private PostgresSingleton() {
    }

    public static final PostgreSQLContainer<?> INSTANCE = new PostgreSQLContainer<>("postgres:17.6-alpine")
            .withDatabaseName("meal_app_db")
            .withUsername("test")
            .withPassword("test");

    static {
        try {
            System.out.println("[DEBUG_LOG] PostgreSQL konteyneri başlatılıyor...");
            // Log environment info for diagnostics
            System.out.println("[DEBUG_LOG] OS: " + System.getProperty("os.name"));
            System.out.println("[DEBUG_LOG] DOCKER_HOST env: " + System.getenv("DOCKER_HOST"));
            System.out.println("[DEBUG_LOG] DOCKER_HOST property: " + System.getProperty("DOCKER_HOST"));

            java.io.File dockerSock = new java.io.File(System.getProperty("user.home") + "/.docker/run/docker.sock");
            System.out.println("[DEBUG_LOG] ~/.docker/run/docker.sock exists: " + dockerSock.exists());
            if (dockerSock.exists()) {
                System.out.println("[DEBUG_LOG] ~/.docker/run/docker.sock readable: " + dockerSock.canRead());
            }

            java.io.File varDockerSock = new java.io.File("/var/run/docker.sock");
            System.out.println("[DEBUG_LOG] /var/run/docker.sock exists: " + varDockerSock.exists());
            if (varDockerSock.exists()) {
                System.out.println("[DEBUG_LOG] /var/run/docker.sock readable: " + varDockerSock.canRead());
            }

            if (System.getProperty("os.name").toLowerCase().contains("mac")) {
                if (dockerSock.exists() && dockerSock.canRead()) {
                    String dockerHost = "unix://" + dockerSock.getAbsolutePath();
                    System.setProperty("docker.host", dockerHost);
                    System.out.println("[DEBUG_LOG] MacOS için docker.host setlendi: " + dockerHost);
                } else if (varDockerSock.exists() && varDockerSock.canRead()) {
                    String dockerHost = "unix://" + varDockerSock.getAbsolutePath();
                    System.setProperty("docker.host", dockerHost);
                    System.out.println("[DEBUG_LOG] MacOS için docker.host setlendi (var): " + dockerHost);
                }
            }
            
            INSTANCE.start();
            System.out.println("[DEBUG_LOG] PostgreSQL konteyneri başarıyla başlatıldı. JDBC URL: " + INSTANCE.getJdbcUrl());
        } catch (Exception e) {
            System.err.println("[DEBUG_LOG] PostgreSQL konteyneri başlatılırken HATA: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Testcontainers başlatılamadı! Eğer MacOS kullanıyorsanız, Docker Desktop ayarlarından 'Allow the default Docker socket to be used' seçeneğinin işaretli olduğundan emin olun.", e);
        }
    }
}
