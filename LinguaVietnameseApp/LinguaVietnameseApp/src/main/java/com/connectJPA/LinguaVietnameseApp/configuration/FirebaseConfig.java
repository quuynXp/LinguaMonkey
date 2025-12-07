package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Configuration
public class FirebaseConfig {

    // Lấy đường dẫn từ application.properties hoặc biến môi trường
    @Value("${firebase.config.path:service-account-key.json}")
    private String configPath;

    @Bean
    public FirebaseMessaging firebaseMessaging() throws IOException {
        FirebaseApp firebaseApp = null;
        List<FirebaseApp> firebaseApps = FirebaseApp.getApps();

        if (firebaseApps != null && !firebaseApps.isEmpty()) {
            for (FirebaseApp app : firebaseApps) {
                if (app.getName().equals(FirebaseApp.DEFAULT_APP_NAME)) {
                    firebaseApp = app;
                    break;
                }
            }
        }

        if (firebaseApp == null) {
            GoogleCredentials credentials = loadCredentials();
            
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();

            firebaseApp = FirebaseApp.initializeApp(options);
        }

        return FirebaseMessaging.getInstance(firebaseApp);
    }

    private GoogleCredentials loadCredentials() throws IOException {
        InputStream serviceAccount = null;
        String finalPathUsed = "";

        try {
            System.out.println("Checking configured path: " + configPath);
            serviceAccount = new FileInputStream(configPath);
            finalPathUsed = configPath;
        } catch (FileNotFoundException e1) {
            // 2. Thử đường dẫn mặc định của Render Secret Files (Ưu tiên số 2)
            // Render luôn mount secret files vào /etc/secrets/
            String renderPath = "/etc/secrets/service-account-key.json";
            try {
                System.out.println("Config path failed. Checking Render secret path: " + renderPath);
                serviceAccount = new FileInputStream(renderPath);
                finalPathUsed = renderPath;
            } catch (FileNotFoundException e2) {
                // 3. Thử tìm trong Classpath/Resources (Local dev)
                System.out.println("Render path failed. Checking classpath resource: " + configPath);
                serviceAccount = getClass().getClassLoader().getResourceAsStream(configPath);
                
                // Nếu configPath là tên file đơn thuần (service-account-key.json)
                if (serviceAccount == null) {
                     serviceAccount = getClass().getClassLoader().getResourceAsStream("service-account-key.json");
                }
                
                finalPathUsed = "classpath:service-account-key.json";
            }
        }

        if (serviceAccount == null) {
            System.err.println("CRITICAL: Could not find Firebase credentials in Config, Render Secrets (/etc/secrets/), or Classpath.");
            throw new IOException("Could not find or read credentials file. Checked: " + configPath + " and /etc/secrets/service-account-key.json");
        }

        System.out.println("SUCCESS: Loaded Firebase credentials from: " + finalPathUsed);
        return GoogleCredentials.fromStream(serviceAccount);
    }
}