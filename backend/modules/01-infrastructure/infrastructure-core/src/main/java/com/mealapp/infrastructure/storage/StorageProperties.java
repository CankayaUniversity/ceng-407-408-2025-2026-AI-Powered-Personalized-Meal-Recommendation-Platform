package com.mealapp.infrastructure.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "com.mealapp.infrastructure.storage")
public record StorageProperties(
    MinioProperties minio,
    BucketProperties bucket
) {

    public record MinioProperties(
        String endpoint,
        String accessKey,
        String secretKey
    ) {
    }

    public record BucketProperties(
        String name
    ) {
    }

}