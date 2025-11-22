package com.connectJPA.LinguaVietnameseApp.configuration;



import com.connectJPA.LinguaVietnameseApp.utils.JwtUtil;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.context.annotation.Configuration;

import org.springframework.messaging.Message;

import org.springframework.messaging.MessageChannel;

import org.springframework.messaging.simp.config.ChannelRegistration;

import org.springframework.messaging.simp.config.MessageBrokerRegistry;

import org.springframework.messaging.simp.stomp.StompCommand;

import org.springframework.messaging.simp.stomp.StompHeaderAccessor;

import org.springframework.messaging.support.ChannelInterceptor;

import org.springframework.messaging.support.MessageHeaderAccessor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.oauth2.jwt.Jwt;

import org.springframework.security.oauth2.jwt.JwtDecoder;

import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;

import org.springframework.web.socket.config.annotation.StompEndpointRegistry;

import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;



import java.util.List;

import java.util.stream.Collectors;



@Configuration

@EnableWebSocketMessageBroker

@RequiredArgsConstructor

@Slf4j

public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {



    private final JwtDecoder jwtDecoder; // Inject JwtDecoder từ SecurityConfig



    @Override

    public void configureMessageBroker(MessageBrokerRegistry config) {

        config.enableSimpleBroker("/topic", "/queue");

        config.setApplicationDestinationPrefixes("/app");

        config.setUserDestinationPrefix("/user");

    }



    @Override

    public void registerStompEndpoints(StompEndpointRegistry registry) {

        registry.addEndpoint("/ws")

                .setAllowedOriginPatterns("*") // Sử dụng pattern thay vì * để an toàn hơn với credentials

                .withSockJS();

    }



    @Override

    public void configureClientInboundChannel(ChannelRegistration registration) {

        registration.interceptors(new ChannelInterceptor() {

            @Override

            public Message<?> preSend(Message<?> message, MessageChannel channel) {

                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);



                if (StompCommand.CONNECT.equals(accessor.getCommand())) {

                    // SỬA: Đọc header 'X-Auth-Token' mà Kong đã chèn

                    String authHeader = accessor.getFirstNativeHeader("X-Auth-Token");



                    // Fallback nếu Kong chưa kịp chèn (hoặc kết nối trực tiếp)

                    if (authHeader == null) {

                        authHeader = accessor.getFirstNativeHeader("Authorization");

                    }



                    if (authHeader != null && authHeader.startsWith("Bearer ")) {

                        String token = authHeader.substring(7);

                        try {

                            Jwt jwt = jwtDecoder.decode(token);

                            String userId = jwt.getSubject();

                            List<String> scopes = jwt.getClaimAsStringList("scope");

                            List<SimpleGrantedAuthority> authorities = scopes != null

                                    ? scopes.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList())

                                    : List.of();



                            UsernamePasswordAuthenticationToken auth =

                                    new UsernamePasswordAuthenticationToken(userId, null, authorities);



                            // Dùng accessor.setUser(auth) để Spring Security duy trì thông tin Principal

                            accessor.setUser(auth);

                            log.info("WS Authenticated user: {}", userId);

                        } catch (Exception e) {

                            log.error("WS Authentication failed: {}", e.getMessage());

                            // Nếu xác thực thất bại, KHÔNG thiết lập User Principal, client sẽ bị ngắt kết nối

                        }

                    } else {

                        log.warn("WS Connect without valid Authorization header (Bearer token)");

                    }

                }

                return message;

            }

        });

    }

}