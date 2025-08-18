package com.connectJPA.LinguaVietnameseApp.utils;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
public class CloudinaryHelper {
    public String extractPublicId(String url) {
        try {
            URI uri = new URI(url);
            String path = uri.getPath(); // /demo/image/upload/v1723812345/temp/avatar123.jpg

            // bỏ đi phần /<cloud_name>/<resource_type>/upload/vxxx/
            String[] parts = path.split("/upload/");
            if (parts.length < 2) {
                throw new IllegalArgumentException("Invalid Cloudinary URL: " + url);
            }

            // bỏ extension .jpg, .png, ...
            String withoutVersion = parts[1]; // v1723812345/temp/avatar123.jpg
            String afterVersion = withoutVersion.substring(withoutVersion.indexOf('/') + 1); // temp/avatar123.jpg
            return afterVersion.replaceAll("\\.[^.]+$", ""); // temp/avatar123
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract public_id from url: " + url, e);
        }
    }
}
