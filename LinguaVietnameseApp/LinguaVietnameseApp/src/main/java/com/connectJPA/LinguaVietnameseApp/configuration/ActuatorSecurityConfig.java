package com.connectJPA.LinguaVietnameseApp.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
public class ActuatorSecurityConfig {

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers(
            new AntPathRequestMatcher("/actuator/**"),
            new AntPathRequestMatcher("/actuator/health/**"),
            new AntPathRequestMatcher("/api/v1/health")
        );
    }
}