// package com.connectJPA.LinguaVietnameseApp.configuration;

// import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
// import jakarta.servlet.FilterChain;
// import jakarta.servlet.ServletException;
// import jakarta.servlet.http.HttpServletRequest;
// import jakarta.servlet.http.HttpServletResponse;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.security.authentication.fullnamePasswordAuthenticationToken;
// import org.springframework.security.core.authority.SimpleGrantedAuthority;
// import org.springframework.security.core.context.SecurityContextHolder;
// import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
// import org.springframework.stereotype.Component;
// import org.springframework.web.filter.OncePerRequestFilter;

// import java.io.IOException;
// import java.util.List;
// import java.util.UUID;
// import java.util.stream.Collectors;

// @Component
// @RequiredArgsConstructor
// @Slf4j
// public class JwtAuthFilter extends OncePerRequestFilter {

//     private final AuthenticationService authenticationService;

//     @Override
//     protected void doFilterInternal(HttpServletRequest request,
//                                     HttpServletResponse response,
//                                     FilterChain filterChain) throws ServletException, IOException {
//         final String authHeader = request.getHeader("Authorization");

//         if (authHeader == null || !authHeader.startsWith("Bearer ")) {
//             filterChain.doFilter(request, response);
//             return;
//         }

//         final String jwt = authHeader.substring(7);

//         if (!authenticationService.isTokenValid(jwt)) {
//             filterChain.doFilter(request, response);
//             return;
//         }

//         UUID userId = authenticationService.extractTokenByUserId(jwt);
//         List<String> scopes = authenticationService.extractScope(jwt);

//         fullnamePasswordAuthenticationToken authToken = new fullnamePasswordAuthenticationToken(
//                 userId,
//                 null,
//                 scopes.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList())
//         );

//         authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
//         SecurityContextHolder.getContext().setAuthentication(authToken);

//         filterChain.doFilter(request, response);
//     }
// }
