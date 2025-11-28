package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import learning.CallPreferences;
import learning.MatchCandidate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class MatchmakingQueueService {

    // Key: UserId, Value: Preferences
    // Dùng ConcurrentHashMap để thread-safe
    private final Map<String, CallPreferencesRequest> waitingUsers = new ConcurrentHashMap<>();

    // Thêm user vào hàng đợi
    public void addToQueue(UUID userId, CallPreferencesRequest prefs) {
        waitingUsers.put(userId.toString(), prefs);
    }

    // Xóa user khỏi hàng đợi (khi đã match xong hoặc cancel)
    public void removeFromQueue(String userId) {
        waitingUsers.remove(userId);
    }

    // Lấy kích thước hàng đợi hiện tại
    public int getQueueSize() {
        return waitingUsers.size();
    }

    // Lấy danh sách TẤT CẢ user đang chờ (trừ bản thân) để gửi sang Python
    public List<MatchCandidate> getCandidatesFor(String currentUserId) {
        return waitingUsers.entrySet().stream()
                .filter(entry -> !entry.getKey().equals(currentUserId)) // Không tự match chính mình
                .map(entry -> {
                    CallPreferencesRequest req = entry.getValue();
                    
                    // Build gRPC object từ DTO
                    CallPreferences prefs = CallPreferences.newBuilder()
                            .addAllInterests(req.getInterests())
                            .setGender(req.getGender())
                            .setNativeLanguage(req.getNativeLanguage())
                            .setLearningLanguage(req.getLearningLanguage())
                            .setAgeRange(req.getAgeRange())
                            .setCallDuration(req.getCallDuration())
                            .build();

                    return MatchCandidate.newBuilder()
                            .setUserId(entry.getKey())
                            .setPreferences(prefs)
                            .build();
                })
                .collect(Collectors.toList());
    }
}