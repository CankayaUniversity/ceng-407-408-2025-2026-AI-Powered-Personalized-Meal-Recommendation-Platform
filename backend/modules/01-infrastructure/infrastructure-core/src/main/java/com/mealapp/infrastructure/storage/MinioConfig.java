package com.mealapp.infrastructure.storage;

import io.minio.MinioClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class MinioConfig {

    @Bean
    public MinioClient minioClient(StorageProperties storageProperties) {
        return MinioClient.builder()
            .endpoint(storageProperties.minio().endpoint())
            .credentials(
                storageProperties.minio().accessKey(),
                storageProperties.minio().secretKey()
            )
            .build();
    }

}