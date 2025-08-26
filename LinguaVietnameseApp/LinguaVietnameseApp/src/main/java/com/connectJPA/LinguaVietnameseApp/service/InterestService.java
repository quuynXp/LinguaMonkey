package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.InterestRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.InterestResponse;
import java.util.List;
import java.util.UUID;

public interface InterestService {

    InterestResponse createInterest(InterestRequest request);

    InterestResponse updateInterest(UUID id, InterestRequest request);

    void deleteInterest(UUID id); // Soft delete

    InterestResponse getInterestById(UUID id);

    List<InterestResponse> getAllInterests();
}