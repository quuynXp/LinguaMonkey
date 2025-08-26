package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CertificateRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CertificateResponse;
import com.connectJPA.LinguaVietnameseApp.service.CertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/certificates")
@Tag(name = "Certification Management", description = "APIs for managing certificates")
@RequiredArgsConstructor
public class CertificateController {
    private final CertificateService certificateService;

    @Operation(summary = "Get all certificates", description = "Retrieve a paginated list of certificates")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved certificates"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CertificateResponse>> getAllCertificates(
            @Parameter(description = "Pagination information") Pageable pageable) {
        Page<CertificateResponse> certificates = certificateService.getAllCertificates(pageable);
        return AppApiResponse.<Page<CertificateResponse>>builder()
                .code(200)
                .message("Successfully retrieved certificates")
                .result(certificates)
                .build();
    }

    @Operation(summary = "Get certificate by ID", description = "Retrieve a certificate by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved certificate"),
            @ApiResponse(responseCode = "404", description = "Certification not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<CertificateResponse> getCertificateById(
            @Parameter(description = "Certification ID") @PathVariable UUID id) {
        CertificateResponse certificate = certificateService.getCertificateById(id);
        return AppApiResponse.<CertificateResponse>builder()
                .code(200)
                .message("Successfully retrieved certificate")
                .result(certificate)
                .build();
    }

    @Operation(summary = "Create a new certificate", description = "Create a new certificate with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Certification created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid certificate data")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public AppApiResponse<CertificateResponse> createCertificate(
            @Valid @RequestBody CertificateRequest request) {
        CertificateResponse certificate = certificateService.createCertificate(request);
        return AppApiResponse.<CertificateResponse>builder()
                .code(201)
                .message("Certification created successfully")
                .result(certificate)
                .build();
    }

    @Operation(summary = "Update a certificate", description = "Update an existing certificate by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Certification updated successfully"),
            @ApiResponse(responseCode = "404", description = "Certification not found"),
            @ApiResponse(responseCode = "400", description = "Invalid certificate data")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public AppApiResponse<CertificateResponse> updateCertificate(
            @Parameter(description = "Certification ID") @PathVariable UUID id,
            @Valid @RequestBody CertificateRequest request) {
        CertificateResponse certificate = certificateService.updateCertificate(id, request);
        return AppApiResponse.<CertificateResponse>builder()
                .code(200)
                .message("Certification updated successfully")
                .result(certificate)
                .build();
    }

    @Operation(summary = "Delete a certificate", description = "Soft delete a certificate by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Certification deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Certification not found")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCertificate(
            @Parameter(description = "Certification ID") @PathVariable UUID id) {
        certificateService.deleteCertificate(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Certification deleted successfully")
                .build();
    }
}