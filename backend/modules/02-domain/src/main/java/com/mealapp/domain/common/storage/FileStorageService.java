package com.mealapp.domain.common.storage;

import java.io.InputStream;

public interface FileStorageService {
    /**
     * Dosyayı sisteme yükler.
     * @param inputStream Dosya verisi
     * @param fileName Dosya adı
     * @param contentType İçerik tipi (mime-type)
     * @return Yüklenen dosyanın erişim URL'i veya adı
     */
    String uploadFile(InputStream inputStream, String fileName, String contentType);

    /**
     * Dosyayı sistemden siler.
     * @param fileName Silinecek dosya adı
     */
    void deleteFile(String fileName);

    /**
     * Dosyaya erişim için geçici bir URL üretir.
     * @param fileName Dosya adı
     * @return Geçici erişim URL'i
     */
    String getFileUrl(String fileName);
}
