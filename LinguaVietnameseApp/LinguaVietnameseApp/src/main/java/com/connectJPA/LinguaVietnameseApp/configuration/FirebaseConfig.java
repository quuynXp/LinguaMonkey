// package com.connectJPA.LinguaVietnameseApp.configuration;

// import com.google.auth.oauth2.GoogleCredentials;
// import com.google.firebase.FirebaseApp;
// import com.google.firebase.FirebaseOptions;
// import com.google.firebase.messaging.FirebaseMessaging;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;

// import java.io.ByteArrayInputStream;
// import java.io.FileInputStream;
// import java.io.IOException;
// import java.io.InputStream;
// import java.nio.charset.StandardCharsets;
// import java.util.Base64;
// import java.util.Collections;
// import java.util.List;

// @Configuration
// public class FirebaseConfig {

//     private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);
//     private static final String FIREBASE_MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

//     @Value("${google.credentials-file-url:}")
//     private String credentialsPath;

//     @Value("${FIREBASE_CREDENTIALS_BASE64:}")
//     private String credentialsBase64;

//     @Bean
//     public FirebaseMessaging firebaseMessaging() throws IOException {
//         List<FirebaseApp> apps = FirebaseApp.getApps();
//         if (!apps.isEmpty()) {
//             return FirebaseMessaging.getInstance(apps.get(0));
//         }

//         GoogleCredentials credentials = loadCredentials();

//         if (credentials.createScopedRequired()) {
//             credentials = credentials.createScoped(Collections.singletonList(FIREBASE_MESSAGING_SCOPE));
//         }

//         FirebaseOptions options = FirebaseOptions.builder()
//                 .setCredentials(credentials)
//                 .build();

//         FirebaseApp app = FirebaseApp.initializeApp(options);
//         log.info("Firebase App initialized successfully.");
//         return FirebaseMessaging.getInstance(app);
//     }

//     private GoogleCredentials loadCredentials() throws IOException {
//         // Priority 1: Base64 or Raw JSON Env Var (Fix for Render/Docker issues)
//         if (credentialsBase64 != null && !credentialsBase64.isBlank()) {
//             try {
//                 String cleanParams = credentialsBase64.trim();

//                 // FIX 1: Remove surrounding quotes if user/env accidentally added them (common in Docker envs)
//                 if (cleanParams.startsWith("\"") && cleanParams.endsWith("\"")) {
//                     cleanParams = cleanParams.substring(1, cleanParams.length() - 1);
//                 }

//                 // FIX 2: More robust JSON detection. Even if it doesn't start directly with {, try parsing as JSON if it looks like it.
//                 // Raw JSON service account files usually contain "type": "service_account"
//                 if (cleanParams.startsWith("{") || cleanParams.contains("\"type\"")) {
//                     log.info("Detected Raw JSON in FIREBASE_CREDENTIALS_BASE64.");
//                     return GoogleCredentials.fromStream(new ByteArrayInputStream(cleanParams.getBytes(StandardCharsets.UTF_8)));
//                 }

//                 // FIX 3: Clean up Data URI prefix if present
//                 if (cleanParams.startsWith("data:")) {
//                     int commaIndex = cleanParams.indexOf(",");
//                     if (commaIndex != -1) {
//                         cleanParams = cleanParams.substring(commaIndex + 1);
//                     }
//                 }

//                 // FIX 4: Decode Base64 safely
//                 // Remove whitespace/newlines which might break the decoder
//                 String finalBase64 = cleanParams.replaceAll("\\s", "");
                
//                 try {
//                     byte[] decodedBytes = Base64.getDecoder().decode(finalBase64);
//                     log.info("Successfully decoded FIREBASE_CREDENTIALS_BASE64.");
//                     return GoogleCredentials.fromStream(new ByteArrayInputStream(decodedBytes));
//                 } catch (IllegalArgumentException base64Ex) {
//                     // Fallback log to help debug "Illegal base64 character 2e" (dot) errors
//                     log.error("Failed to decode FIREBASE_CREDENTIALS_BASE64. It is not valid JSON and not valid Base64. Content snippet: {}", 
//                             finalBase64.length() > 10 ? finalBase64.substring(0, 10) + "..." : finalBase64);
//                     throw base64Ex;
//                 }

//             } catch (Exception e) {
//                 log.error("Error processing FIREBASE_CREDENTIALS_BASE64: {}. Falling back to file path.", e.getMessage());
//                 // Do not throw immediately, try file path as fallback
//             }
//         }

//         // Priority 2: File Path (Local development or Volume mount)
//         if (credentialsPath != null && !credentialsPath.isBlank()) {
//             String cleanPath = credentialsPath.replace("file:", "");
//             try (InputStream serviceAccount = new FileInputStream(cleanPath)) {
//                 log.info("Loaded Firebase credentials from file: {}", cleanPath);
//                 return GoogleCredentials.fromStream(serviceAccount);
//             } catch (IOException e) {
//                 log.error("Failed to load Firebase credentials file at: {}", cleanPath, e);
//                 throw e;
//             }
//         }

//         throw new IOException("No Firebase credentials provided. Set GOOGLE_CREDENTIALS_FILE_URL or FIREBASE_CREDENTIALS_BASE64.");
//     }
// }
package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);
    private static final String FIREBASE_MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

    @Value("${google.credentials-file-url}")
    private String credentialsPath;

    @Bean
    public FirebaseMessaging firebaseMessaging() throws IOException {
        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (!apps.isEmpty()) {
            return FirebaseMessaging.getInstance(apps.get(0));
        }

        GoogleCredentials credentials = loadCredentials();

        if (credentials.createScopedRequired()) {
            credentials = credentials.createScoped(Collections.singletonList(FIREBASE_MESSAGING_SCOPE));
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        FirebaseApp app = FirebaseApp.initializeApp(options);
        log.info("Firebase App initialized successfully using credentials file.");
        return FirebaseMessaging.getInstance(app);
    }

    private GoogleCredentials loadCredentials() throws IOException {
        // Fix for file path format (e.g., if provided with file: prefix)
        String cleanPath = credentialsPath;
        if (cleanPath.startsWith("file:")) {
            cleanPath = cleanPath.substring(5);
        }

        log.info("Loading Firebase credentials from: {}", cleanPath);

        try (InputStream serviceAccount = new FileInputStream(cleanPath)) {
            return GoogleCredentials.fromStream(serviceAccount);
        } catch (IOException e) {
            log.error("Failed to load Firebase credentials from path: {}", cleanPath, e);
            throw new IOException("Could not find or read credentials file at: " + cleanPath + ". Check Render Secret Files configuration.", e);
        }
    }
}