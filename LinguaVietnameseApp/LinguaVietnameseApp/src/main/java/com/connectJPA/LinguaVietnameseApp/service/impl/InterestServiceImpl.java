package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.InterestRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.InterestResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Interest;
import com.connectJPA.LinguaVietnameseApp.repository.InterestRepository;
import com.connectJPA.LinguaVietnameseApp.service.InterestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterestServiceImpl implements InterestService {

    private final InterestRepository interestRepository;

    @Override
    @Transactional
    public InterestResponse createInterest(InterestRequest request) {
        Interest interest = Interest.builder()
                .interestName(request.getInterestName())
                .description(request.getDescription())
                .icon(request.getIcon())
                .color(request.getColor())
                .build();
        interest = interestRepository.save(interest);
        return mapToResponse(interest);
    }

    @Override
    @Transactional
    public InterestResponse updateInterest(UUID id, InterestRequest request) {
        Interest interest = interestRepository.findById(id).orElseThrow(() -> new RuntimeException("Interest not found"));
        interest.setInterestName(request.getInterestName());
        interest.setDescription(request.getDescription());
        interest.setIcon(request.getIcon());
        interest.setColor(request.getColor());
        interest.setUpdatedAt(OffsetDateTime.now());
        interest = interestRepository.save(interest);
        return mapToResponse(interest);
    }

    @Override
    @Transactional
    public void deleteInterest(UUID id) {
        Interest interest = interestRepository.findById(id).orElseThrow(() -> new RuntimeException("Interest not found"));
        interest.setDeleted(true);
        interest.setDeletedAt(OffsetDateTime.now());
        interestRepository.save(interest);
    }

    @Override
    public InterestResponse getInterestById(UUID id) {
        Interest interest = interestRepository.findById(id).orElseThrow(() -> new RuntimeException("Interest not found"));
        if (interest.isDeleted()) throw new RuntimeException("Interest deleted");
        return mapToResponse(interest);
    }

    @Override
    public List<InterestResponse> getAllInterests() {
        return interestRepository.findAll().stream()
                .filter(i -> !i.isDeleted())
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private InterestResponse mapToResponse(Interest interest) {
        return InterestResponse.builder()
                .interestId(interest.getInterestId())
                .interestName(interest.getInterestName())
                .description(interest.getDescription())
                .icon(interest.getIcon())
                .color(interest.getColor())
                .createdAt(interest.getCreatedAt())
                .updatedAt(interest.getUpdatedAt())
                .build();
    }
}