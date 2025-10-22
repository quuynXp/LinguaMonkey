package com.connectJPA.LinguaVietnameseApp.configuration;


import com.connectJPA.LinguaVietnameseApp.service.rateLimit.RateLimitService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {
    @Value("${jwt.signer-key}")
    private String secretKey;

    private final RateLimitService rateLimitService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {

        String token = extractToken(request);
        if (token == null) return true;

        String userId = getClaim(token, "sub");
        String role = getClaim(token, "role");

        if (userId == null || role == null) return true;

        boolean allowed = rateLimitService.isAllowed(userId, role);
        if (!allowed) {
            long ttl = rateLimitService.getRemainingTime(userId);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Rate limit exceeded. Wait " + ttl + " seconds.");
            return false;
        }

        return true;
    }

    private String extractToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        return (auth != null && auth.startsWith("Bearer ")) ? auth.substring(7) : null;
    }

    private String getClaim(String token, String key) {
        try {
            Claims claims = Jwts.parser()
                .setSigningKey(secretKey.getBytes(StandardCharsets.UTF_8))
                .parseClaimsJws(token)
                .getBody();
            return (String) claims.get(key);
        } catch (Exception e) {
            return null;
        }
    }
}


