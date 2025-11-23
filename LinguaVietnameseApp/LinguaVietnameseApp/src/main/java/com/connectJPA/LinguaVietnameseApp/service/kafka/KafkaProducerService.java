// package com.connectJPA.LinguaVietnameseApp.service.kafka;

// import com.fasterxml.jackson.core.JsonProcessingException;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.kafka.core.KafkaTemplate;
// import org.springframework.stereotype.Service;

// import java.util.HashMap;
// import java.util.Map;

// @Service
// public class KafkaProducerService {

//     private static final Logger log = LoggerFactory.getLogger(KafkaProducerService.class);

//     @Value("${kafka.user.profile.topic}")
//     private String userProfileTopic;

//     @Autowired
//     private KafkaTemplate<String, String> kafkaTemplate;

//     @Autowired
//     private ObjectMapper objectMapper;


//     public void sendUserProfileUpdate(String userId, String updatedTable) {
//         try {
//             Map<String, String> payload = new HashMap<>();
//             payload.put("user_id", userId);
//             payload.put("updated_table", updatedTable);
//             payload.put("timestamp", String.valueOf(System.currentTimeMillis()));

//             String jsonPayload = objectMapper.writeValueAsString(payload);


//             kafkaTemplate.send(userProfileTopic, userId, jsonPayload);

//             log.info("Sent user profile update event to Kafka. UserID: {}, Table: {}", userId, updatedTable);

//         } catch (JsonProcessingException e) {
//             log.error("Failed to serialize user update event for UserID: {}", userId, e);
//         } catch (Exception e) {
//             log.error("Failed to send message to Kafka for UserID: {}", userId, e);
//         }
//     }
// }
