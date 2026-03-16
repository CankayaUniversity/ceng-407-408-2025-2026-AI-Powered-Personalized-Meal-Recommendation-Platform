package com.mealapp.infrastructure.test;

import com.mealapp.infrastructure.storage.StorageProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.test.context.TestConfiguration;

@TestConfiguration
@RequiredArgsConstructor
public class MinioInitConfig {

    private final MinioClient minioClient;
    private final StorageProperties props;

    @PostConstruct
    public void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(
            BucketExistsArgs.builder()
                .bucket(props.bucket().name()) // StorageProperties üzerinden bucket adı
                .build()
        );

        if (!exists) {
            minioClient.makeBucket(
                MakeBucketArgs.builder()
                    .bucket(props.bucket().name())
                    .build()
            );
        }
    }
}