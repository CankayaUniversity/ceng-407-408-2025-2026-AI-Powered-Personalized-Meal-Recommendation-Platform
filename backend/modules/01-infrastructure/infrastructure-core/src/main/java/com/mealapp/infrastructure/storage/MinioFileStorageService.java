package com.mealapp.infrastructure.storage;

import com.mealapp.domain.common.storage.FileStorageService;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MinioFileStorageService implements FileStorageService {

    private final MinioClient minioClient;
    private final StorageProperties storageProperties;

    @PostConstruct
    @SneakyThrows
    public void init() {
        String bucketName = storageProperties.bucket().name();
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            log.info("Creating Minio bucket: {}", bucketName);
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    @Override
    @SneakyThrows
    public String uploadFile(InputStream inputStream, String fileName, String contentType) {
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(storageProperties.bucket().name())
                .object(fileName)
                .stream(inputStream, -1, 10485760) // 10MB part size
                .contentType(contentType)
                .build()
        );
        return fileName;
    }

    @Override
    @SneakyThrows
    public void deleteFile(String fileName) {
        minioClient.removeObject(
            RemoveObjectArgs.builder()
                .bucket(storageProperties.bucket().name())
                .object(fileName)
                .build()
        );
    }

    @Override
    @SneakyThrows
    public String getFileUrl(String fileName) {
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(storageProperties.bucket().name())
                .object(fileName)
                .expiry(7, TimeUnit.DAYS)
                .build()
        );
    }
}
