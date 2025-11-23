package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.cloudinary.Cloudinary;
import com.cloudinary.Search;
import com.cloudinary.api.ApiResponse;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageCleanupService {

    private final Cloudinary cloudinary;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")
            .withZone(ZoneOffset.UTC);

    @Scheduled(cron = "0 0 * * * *")
    public void cleanupTempFiles() {
        log.info("Starting Cloudinary temp file cleanup...");

        String twoHoursAgo = DATE_TIME_FORMATTER.format(Instant.now().minusSeconds(7200));

        String expression = String.format("folder:linguaviet/temp AND created_at < \"%s\"", twoHoursAgo);

        try {
            ApiResponse result = cloudinary.search()
                    .expression(expression)
                    .execute();
            
            List<Map<?, ?>> resources = (List<Map<?, ?>>) result.get("resources");
            
            if (resources.isEmpty()) {
                log.info("🧹 No expired temp files found.");
                return;
            }

            List<String> publicIdsToDelete = resources.stream()
                    .map(r -> (String) r.get("public_id"))
                    .toList();

            log.warn("🧹 Found {} expired temp files. Deleting one by one...", publicIdsToDelete.size());

            // --- GIẢI PHÁP SỬA LỖI BIÊN DỊCH BẰNG CÁCH LẶP QUA TỪNG ID ---
            for (String publicId : publicIdsToDelete) {
                // Gọi hàm destroy(String, Map) – Cú pháp được yêu cầu bởi lỗi biên dịch
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                log.info("🧹 Deleted temp file: {}", publicId);
            }
            
            log.info("🎉 Cleanup complete.");

        } catch (Exception e) {
            log.error("Cloudinary cleanup temp files failed", e);
        }
    }
}