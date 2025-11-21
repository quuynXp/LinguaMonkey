package com.connectJPA.LinguaVietnameseApp.utils;

import com.connectJPA.LinguaVietnameseApp.dto.SubtitleItem;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SubtitleUtils {

    private static final Pattern TIMESTAMP_PATTERN = Pattern.compile("(\\d{2}):(\\d{2}):(\\d{2})[,.](\\d{3})");

    // 1. Parse file SRT thành List Object
    public List<SubtitleItem> parseSrt(InputStream inputStream) {
        List<SubtitleItem> items = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            SubtitleItem currentItem = null;
            StringBuilder textBuffer = new StringBuilder();
            int indexCounter = 1;

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) {
                    if (currentItem != null) {
                        currentItem.setText(textBuffer.toString().trim());
                        items.add(currentItem);
                        currentItem = null;
                        textBuffer.setLength(0);
                    }
                    continue;
                }
                if (line.matches("^\\d+$")) continue; // Bỏ qua số thứ tự
                if (line.contains("-->")) {
                    String[] times = line.split("-->");
                    if (times.length == 2) {
                        currentItem = new SubtitleItem();
                        currentItem.setId(indexCounter++);
                        currentItem.setStartTime(parseTimestamp(times[0].trim()));
                        currentItem.setEndTime(parseTimestamp(times[1].trim()));
                    }
                    continue;
                }
                if (currentItem != null) textBuffer.append(line).append(" ");
            }
            if (currentItem != null) {
                currentItem.setText(textBuffer.toString().trim());
                items.add(currentItem);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing SRT: " + e.getMessage());
        }
        return items;
    }

    // 2. Tạo file SRT từ List Object (Sau khi dịch)
    public byte[] createSrtFile(List<SubtitleItem> items) {
        StringBuilder sb = new StringBuilder();
        int counter = 1;
        for (SubtitleItem item : items) {
            sb.append(counter++).append("\n");
            sb.append(formatTimestamp(item.getStartTime()))
                    .append(" --> ")
                    .append(formatTimestamp(item.getEndTime()))
                    .append("\n");
            sb.append(item.getText()).append("\n\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // Helper: Parse Time
    private long parseTimestamp(String timestamp) {
        Matcher matcher = TIMESTAMP_PATTERN.matcher(timestamp);
        if (matcher.find()) {
            return (Long.parseLong(matcher.group(1)) * 3600000) +
                    (Long.parseLong(matcher.group(2)) * 60000) +
                    (Long.parseLong(matcher.group(3)) * 1000) +
                    Long.parseLong(matcher.group(4));
        }
        return 0;
    }

    // Helper: Format Time
    private String formatTimestamp(long millis) {
        long hours = millis / 3600000;
        long minutes = (millis % 3600000) / 60000;
        long seconds = (millis % 60000) / 1000;
        long ms = millis % 1000;
        return String.format("%02d:%02d:%02d,%03d", hours, minutes, seconds, ms);
    }
}