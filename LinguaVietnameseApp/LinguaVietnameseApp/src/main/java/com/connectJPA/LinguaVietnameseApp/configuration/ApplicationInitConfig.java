package com.connectJPA.LinguaVietnameseApp.configuration;

import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoleId;
import com.connectJPA.LinguaVietnameseApp.enums.PermissionName;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.impl.StorageServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import learning.SeedDataResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ApplicationInitConfig {

    @Lazy PasswordEncoder passwordEncoder;

    DefaultRolePermissions defaultRolePermissions;
    RoleRepository roleRepository;
    UserRepository userRepository;
    UserRoleRepository userRoleRepository;
    PermissionRepository permissionRepository;
    
    GrpcClientService grpcClientService;
    StorageServiceImpl storageService; 
    LessonQuestionRepository questionRepository; 
    ObjectMapper objectMapper;

    @Bean
    ApplicationRunner applicationRunner() {
        return args -> {
            Role adminRole = getOrCreateRole(RoleName.ADMIN);
            Role studentRole = getOrCreateRole(RoleName.STUDENT);
            Role teacherRole = getOrCreateRole(RoleName.TEACHER);

            Map<String, UUID> permissionNameToIdMap = new HashMap<>();
            for (PermissionName type : PermissionName.values()) {
                String name = type.name();
                Permission permission = permissionRepository.findByNameAndIsDeletedFalse(name)
                        .orElseGet(() -> permissionRepository.save(
                                Permission.builder()
                                        .name(name)
                                        .description("Auto generated from enum")
                                        .build()
                        ));
                permissionNameToIdMap.put(name, permission.getPermissionId());
            }

            for (Map.Entry<RoleName, Set<PermissionName>> entry : defaultRolePermissions.getAll().entrySet()) {
                Role role = switch (entry.getKey()) {
                    case ADMIN -> adminRole;
                    case TEACHER -> teacherRole;
                    case STUDENT -> studentRole;
                };

                for (PermissionName perm : entry.getValue()) {
                    assignPermissionIfNotExists(role, perm.name());
                }
            }

            String adminEmail = "admin@gmail.com";
            if (userRepository.findByEmailAndIsDeletedFalse(adminEmail).isEmpty()) {
                User adminUser = User.builder()
                        .email(adminEmail)
                        .password(passwordEncoder.encode("admin"))
                        .phone("0373730397")
                        .build();
                adminUser = userRepository.save(adminUser);

                UserRole userRoleBuild = UserRole.builder()
                        .id(new UserRoleId(adminUser.getUserId(), adminRole.getRoleId()))
                        .build();
                userRoleRepository.save(userRoleBuild);

                log.warn("Admin user created with default password");
            }

            // Logic tách biệt: Chỉ tạo seed data nếu bảng câu hỏi đang trống
            if (questionRepository.count() == 0) {
                log.info("Question table is empty. Starting seed data generation...");
                generateAndSaveSeedData("Xin chào", Arrays.asList("Hello", "Goodbye", "Thanks", "Sorry"), "Greetings");
                generateAndSaveSeedData("Cảm ơn", Arrays.asList("Thanks", "Please", "Sorry", "Yes"), "Greetings");
            } else {
                log.info("Seed data already exists. Skipping generation.");
            }
        };
    }

    private void generateAndSaveSeedData(String rawQuestion, List<String> rawOptions, String topic) {
        log.info("Starting Seed Data Generation for: {}", rawQuestion);
        
        String devToken = "Bearer DEV_SECRET"; 

        CompletableFuture<SeedDataResponse> future = grpcClientService.callGenerateSeedDataAsync(
            devToken, rawQuestion, rawOptions, topic
        );

        future.thenAccept(response -> {
            try {
                log.info("AI Response received for '{}'. Processing media...", rawQuestion);

                String finalMediaUrl = null;
                SkillType skillType = SkillType.READING;

                if (!response.getAudioBytes().isEmpty()) {
                    byte[] audioData = response.getAudioBytes().toByteArray();
                    String audioDriveId = storageService.uploadBytes(audioData, "seed_audio_" + System.currentTimeMillis() + ".mp3", "audio/mpeg");
                    finalMediaUrl = storageService.getFileUrl(audioDriveId);
                    skillType = SkillType.LISTENING;
                    log.info("Audio uploaded: {}", finalMediaUrl);
                } 
                else if (!response.getImageBytes().isEmpty()) {
                    byte[] imageData = response.getImageBytes().toByteArray();
                    String imageDriveId = storageService.uploadBytes(imageData, "seed_image_" + System.currentTimeMillis() + ".jpg", "image/jpeg");
                    finalMediaUrl = storageService.getFileUrl(imageDriveId);
                    skillType = SkillType.READING;
                    log.info("Image uploaded: {}", finalMediaUrl);
                }

                List<String> fixedOptions = response.getFixedOptionsList();
                String optionA = fixedOptions.size() > 0 ? fixedOptions.get(0) : "";
                String optionB = fixedOptions.size() > 1 ? fixedOptions.get(1) : "";
                String optionC = fixedOptions.size() > 2 ? fixedOptions.get(2) : "";
                String optionD = fixedOptions.size() > 3 ? fixedOptions.get(3) : "";

                String correctOptionChar = mapIndexToLetter(response.getCorrectIndex());
                
                String optionsJson = "[]";
                try {
                    optionsJson = objectMapper.writeValueAsString(fixedOptions);
                } catch (JsonProcessingException e) {
                    log.error("Failed to serialize options json", e);
                }

                LessonQuestion question = LessonQuestion.builder()
                    .question(response.getFixedQuestion())
                    .optionA(optionA)
                    .optionB(optionB)
                    .optionC(optionC)
                    .optionD(optionD)
                    .optionsJson(optionsJson)
                    .correctOption(correctOptionChar)
                    .orderIndex(response.getCorrectIndex())
                    .explainAnswer(response.getExplanation())
                    .mediaUrl(finalMediaUrl)
                    .skillType(skillType)
                    .questionType(QuestionType.MULTIPLE_CHOICE)
                    .languageCode("vi")
                    .weight(1)
                    .build();
                
                questionRepository.save(question);
                log.info("Seed Data Saved: {}", response.getFixedQuestion());

            } catch (Exception e) {
                log.error("Failed to process seed data response", e);
            }
        }).exceptionally(ex -> {
            log.error("gRPC Call failed", ex);
            return null;
        });
    }

    private String mapIndexToLetter(int index) {
        if (index < 0 || index > 3) return null;
        return String.valueOf((char) ('A' + index));
    }

    private Role getOrCreateRole(RoleName roleName) {
        return roleRepository.findByRoleNameAndIsDeletedFalse(roleName)
                .orElseGet(() -> roleRepository.saveAndFlush(
                        Role.builder()
                                .roleName(roleName)
                                .build()
                ));
    }

    @Transactional
    public void assignPermissionIfNotExists(Role role, String permissionName) {
        permissionRepository.findByNameAndIsDeletedFalse(permissionName)
                .orElseGet(() -> permissionRepository.saveAndFlush(
                        Permission.builder()
                                .name(permissionName)
                                .description("Auto created from enum")
                                .build()
                ));
    }
}