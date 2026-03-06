package com.mealapp.app.controller;

import com.mealapp.domain.common.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/test/storage")
@RequiredArgsConstructor
public class StorageTestController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        String uploadedName = fileStorageService.uploadFile(
            file.getInputStream(),
            fileName,
            file.getContentType()
        );

        String url = fileStorageService.getFileUrl(uploadedName);

        return ResponseEntity.ok(Map.of(
            "fileName", uploadedName,
            "url", url
        ));
    }

    @GetMapping("/url/{fileName}")
    public ResponseEntity<Map<String, String>> getUrl(@PathVariable String fileName) {
        String url = fileStorageService.getFileUrl(fileName);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{fileName}")
    public ResponseEntity<Void> deleteFile(@PathVariable String fileName) {
        fileStorageService.deleteFile(fileName);
        return ResponseEntity.noContent().build();
    }
}
