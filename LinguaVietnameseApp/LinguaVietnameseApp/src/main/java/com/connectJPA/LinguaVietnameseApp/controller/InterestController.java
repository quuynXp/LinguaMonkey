package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.InterestRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.InterestResponse;
import com.connectJPA.LinguaVietnameseApp.service.InterestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/interests")
@RequiredArgsConstructor
public class InterestController {

    private final InterestService interestService;

    @PostMapping
    public AppApiResponse<InterestResponse> create(@RequestBody InterestRequest request) {
        return AppApiResponse.<InterestResponse>builder()
                .code(200)
                .message("Interest created")
                .result(interestService.createInterest(request))
                .build();
    }

    @PutMapping("/{id}")
    public AppApiResponse<InterestResponse> update(@PathVariable UUID id, @RequestBody InterestRequest request) {
        return AppApiResponse.<InterestResponse>builder()
                .code(200)
                .message("Interest updated")
                .result(interestService.updateInterest(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public AppApiResponse<Void> delete(@PathVariable UUID id) {
        interestService.deleteInterest(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Interest deleted")
                .build();
    }

    @GetMapping("/{id}")
    public AppApiResponse<InterestResponse> getById(@PathVariable UUID id) {
        return AppApiResponse.<InterestResponse>builder()
                .code(200)
                .message("Interest retrieved")
                .result(interestService.getInterestById(id))
                .build();
    }

    @GetMapping
    public AppApiResponse<List<InterestResponse>> getAll() {
        return AppApiResponse.<List<InterestResponse>>builder()
                .code(200)
                .message("All interests")
                .result(interestService.getAllInterests())
                .build();
    }
}