// package com.connectJPA.LinguaVietnameseApp.configuration;

// import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
// import com.google.api.client.json.gson.GsonFactory;
// import com.google.api.services.drive.Drive;
// import com.google.auth.oauth2.UserCredentials;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;

// import java.io.IOException;
// import java.security.GeneralSecurityException;

// @Configuration
// @Slf4j
// public class GoogleDriveConfig {

//     @Value("${google.oauth.client-id}")
//     private String clientId;

//     @Value("${google.oauth.client-secret}")
//     private String clientSecret;

//     @Value("${google.oauth.refresh-token}")
//     private String refreshToken;

//     @Bean
//     public Drive googleDriveService() throws IOException, GeneralSecurityException {
//         // Sử dụng UserCredentials với Refresh Token để đóng vai trò là Admin (có Storage Quota)
//         UserCredentials credentials = UserCredentials.newBuilder()
//                 .setClientId(clientId)
//                 .setClientSecret(clientSecret)
//                 .setRefreshToken(refreshToken)
//                 .build();

//         // Refresh token ngay lập tức để đảm bảo token valid khi khởi động
//         try {
//             credentials.refreshIfExpired();
//             log.info("Successfully initialized Google Drive with OAuth2 Refresh Token.");
//         } catch (IOException e) {
//             log.error("Failed to refresh OAuth2 token. Check ClientID, Secret or RefreshToken.", e);
//             throw e;
//         }

//         return new Drive.Builder(
//                 GoogleNetHttpTransport.newTrustedTransport(),
//                 GsonFactory.getDefaultInstance(),
//                 new com.google.auth.http.HttpCredentialsAdapter(credentials)
//         )
//         .setApplicationName("LinguaVietnameseApp")
//         .build();
//     }
// }
package com.connectJPA.LinguaVietnameseApp.configuration;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.auth.oauth2.UserCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Configuration
@Slf4j
public class GoogleDriveConfig {

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    @Value("${google.oauth.refresh-token}")
    private String refreshToken;

    @Bean
    public Drive googleDriveService() throws IOException, GeneralSecurityException {
        UserCredentials credentials = UserCredentials.newBuilder()
                .setClientId(clientId)
                .setClientSecret(clientSecret)
                .setRefreshToken(refreshToken)
                .build();

        try {
            credentials.refreshIfExpired();
            log.info("Successfully initialized Google Drive with OAuth2 Refresh Token.");
        } catch (IOException e) {
            log.error("Failed to refresh OAuth2 token. Check ClientID, Secret or RefreshToken.", e);
            throw e;
        }

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new com.google.auth.http.HttpCredentialsAdapter(credentials)
        )
        .setApplicationName("LinguaVietnameseApp")
        .build();
    }
}