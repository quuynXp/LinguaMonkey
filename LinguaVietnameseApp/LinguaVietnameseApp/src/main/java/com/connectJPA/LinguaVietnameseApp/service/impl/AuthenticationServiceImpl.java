package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.AuthenticationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AuthenticationResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FacebookUserResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.IntrospectResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.AuthProvider;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.*;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.EmailService;
import com.connectJPA.LinguaVietnameseApp.service.SmsService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import jakarta.mail.MessagingException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.text.ParseException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static lombok.AccessLevel.PRIVATE;

@Slf4j
@Service
@FieldDefaults(level = PRIVATE)
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    @Value("classpath:private_key.pem")
    Resource privateKeyResource;

    @Value("classpath:public_key.pem")
    Resource publicKeyResource;

    @Value("${google.client.id}")
    String googleClientId;

    final Map<String, String> verifyEmailCodes = new HashMap<>();
    final Map<String, String> resetPasswordCodes = new HashMap<>();
    final Map<String, String> otpLoginCodes = new HashMap<>();
    final Map<String, Instant> otpLoginExpiry = new HashMap<>();

    final SmsService smsService;
    final EmailService emailService;
    final PasswordEncoder passwordEncoder;
    final UserRepository userRepository;
    final InvalidatedTokenRepository invalidatedTokenRepository;
    final RefreshTokenRepository refreshTokenRepository;
    final UserRoleRepository userRoleRepository;
    final RoleRepository roleRepository;
    final RestTemplate restTemplate;
    final UserAuthAccountRepository userAuthAccountRepository;

    private RSAPrivateKey getPrivateKey() throws Exception {
        String key = new String(Files.readAllBytes(privateKeyResource.getFile().toPath()), StandardCharsets.UTF_8);
        key = key.replaceAll("-----BEGIN (.*)-----", "")
                .replaceAll("-----END (.*)-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(key);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) kf.generatePrivate(spec);
    }

    private RSAPublicKey getPublicKey() throws Exception {
        String key = new String(Files.readAllBytes(publicKeyResource.getFile().toPath()), StandardCharsets.UTF_8);
        key = key.replaceAll("-----BEGIN (.*)-----", "")
                .replaceAll("-----END (.*)-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(key);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) kf.generatePublic(spec);
    }


    @Transactional
    public void logoutAll(UUID userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findAllByUserId(userId);
        tokens.forEach(t -> t.setRevoked(true));
        refreshTokenRepository.saveAll(tokens);
    }

    @Override
    public String generateToken(User user) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getUserId().toString())
                    .issuer("LinguaMonkey.com")
                    .issueTime(new Date())
                    .expirationTime(Date.from(Instant.now().plus(1, ChronoUnit.HOURS)))
                    .claim("scope", buildScope(user.getUserId()))
                    .claim("userId", user.getUserId())
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
            signedJWT.sign(new RSASSASigner(getPrivateKey()));
            return signedJWT.serialize();
        } catch (Exception e) {
            e.printStackTrace(); // In stacktrace ra log
            throw new AppException(ErrorCode.TOKEN_GENERATION_FAILED);
        }
    }

    private String buildScope(UUID userId) {
        List<Role> roles = userRoleRepository.findRolesByUserId(userId);
        return roles.stream()
                .map(role -> "ROLE_" + role.getRoleName().name())
                .collect(Collectors.joining(" "));
    }

    @Transactional
    public IntrospectResponse introspect(String token) {
        try {
            if (invalidatedTokenRepository.existsByToken(token)) {
                log.info("Token introspection failed: Token is invalidated");
                return IntrospectResponse.builder().valid(false).build();
            }

            SignedJWT signedJWT = SignedJWT.parse(token);
            boolean verified = signedJWT.verify(new RSASSAVerifier(getPublicKey()));
            if (!verified) {
                log.info("Token introspection failed: Signature verification failed");
                return IntrospectResponse.builder().valid(false).build();
            }

            Date expiry = signedJWT.getJWTClaimsSet().getExpirationTime();
            if (expiry.before(new Date())) {
                log.info("Token introspection failed: Token is expired, expiry: {}", expiry);
                return IntrospectResponse.builder().valid(false).build();
            }

            log.info("Token introspection succeeded for userId: {}", signedJWT.getJWTClaimsSet().getSubject());
            return IntrospectResponse.builder().valid(true).build();
        } catch (Exception e) {
            log.error("Token introspection error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.TOKEN_SIGNATURE_INVALID);
        }
    }

    @Transactional
    public void logout(String token) {
        invalidatedTokenRepository.save(InvalidatedToken.builder().token(token).build());
    }

    @Transactional
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        User user = userRepository.findByEmailAndIsDeletedFalse(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }

        List<RefreshToken> tokens = refreshTokenRepository.findAllByUserId(user.getUserId());
//        if (tokens.size() >= 5) throw new AppException(ErrorCode.MAX_SESSIONS_EXCEEDED);

        String accessToken = generateToken(user);
        String refreshToken = generateRefreshToken(user, 30);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .token(refreshToken)
                .userId(user.getUserId())
                .expiresAt(OffsetDateTime.now().plusDays(30))
                .isRevoked(false)
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }

    @Transactional
    public AuthenticationResponse refreshToken(String oldRefreshToken) {
        try {
            SignedJWT jwt = SignedJWT.parse(oldRefreshToken);
            if (!jwt.verify(new RSASSAVerifier(getPublicKey())))
                throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);

            Date exp = jwt.getJWTClaimsSet().getExpirationTime();
            if (exp.before(new Date())) throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);

            String subject = jwt.getJWTClaimsSet().getSubject();
            if (subject == null || subject.isBlank()) {
                throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
            }
            UUID userId = UUID.fromString(subject);
            RefreshToken oldToken = refreshTokenRepository
                    .findByUserIdAndTokenAndIsRevokedFalse(userId, oldRefreshToken)
                    .orElseThrow(() -> new AppException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

            System.out.println("DB token length no device=" + oldToken.getToken().length());


            User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            String newAccessToken = generateToken(user);
            OffsetDateTime now = OffsetDateTime.now();

            long daysLeft = ChronoUnit.DAYS.between(now, oldToken.getExpiresAt());
            String newRefreshToken = oldRefreshToken;

            if (daysLeft <= 7) {
                newRefreshToken = generateRefreshToken(user, 30);
                oldToken.setToken(newRefreshToken);
                oldToken.setExpiresAt(now.plusDays(30));
                oldToken.setRevoked(false);
                // oldToken is managed; save is optional but explicit is fine
                refreshTokenRepository.save(oldToken);
            } else {
                oldToken.setExpiresAt(now.plusDays(30));
                refreshTokenRepository.save(oldToken);
            }

            return AuthenticationResponse.builder()
                    .token(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .authenticated(true)
                    .build();

        } catch (Exception e) {
            throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
        }
    }


    @Override
    public String generateRefreshToken(User user, int days) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getUserId().toString())
                    .issueTime(new Date())
                    .expirationTime(Date.from(Instant.now().plus(days, ChronoUnit.DAYS)))
                    .claim("type", "refresh")
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
            signedJWT.sign(new RSASSASigner(getPrivateKey()));
            return signedJWT.serialize();
        } catch (Exception e) {
            throw new AppException(ErrorCode.TOKEN_GENERATION_FAILED);
        }
    }

    public LocalDateTime extractExpiration(String token) {
        try {
            Date exp = SignedJWT.parse(token).getJWTClaimsSet().getExpirationTime();
            return LocalDateTime.ofInstant(exp.toInstant(), ZoneId.systemDefault());
        } catch (Exception e) {
            throw new AppException(ErrorCode.INVALID_TOKEN_FORMAT);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        return xfHeader == null ? request.getRemoteAddr() : xfHeader.split(",")[0];
    }

    @Override
    @Transactional
    public AuthenticationResponse authenticate(AuthenticationRequest request,
                                               String deviceId, String ip, String userAgent) {
        User user = userRepository.findByEmailAndIsDeletedFalse(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }

        userAuthAccountRepository.findByUser_UserIdAndProvider(user.getUserId(), AuthProvider.EMAIL)
                .or(() -> Optional.of(userAuthAccountRepository.save(UserAuthAccount.builder()
                        .user(user)
                        .provider(AuthProvider.EMAIL)
                        .providerUserId(user.getEmail())
                        .verified(true)
                        .primaryAccount(true)
                        .linkedAt(OffsetDateTime.now())
                        .build())));

        return createAndSaveTokens(user, deviceId, ip, userAgent);
    }


    @Override
    @Transactional
    public AuthenticationResponse loginWithGoogle(String idToken, String deviceId, String ip, String userAgent) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken == null) {
                throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID);
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String email = payload.getEmail();
            String fullName = (String) payload.get("name");
            String googleUserId = payload.getSubject();

            if (email == null || googleUserId == null) {
                throw new AppException(ErrorCode.SOCIAL_USER_INFO_INVALID);
            }

            User user = findOrCreateUserAccount(email, fullName, null, AuthProvider.GOOGLE, googleUserId);
            return createAndSaveTokens(user, deviceId, ip, userAgent);

        } catch (Exception e) {
            log.error("Google login failed", e);
            throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID);
        }
    }


    @Override
    @Transactional
    public AuthenticationResponse loginWithFacebook(String accessToken, String deviceId, String ip, String userAgent) {
        try {
            String url = "https://graph.facebook.com/me?fields=id,name,email&access_token=" + accessToken;
            FacebookUserResponse fb = restTemplate.getForObject(url, FacebookUserResponse.class);
            if (fb == null || fb.email() == null) {
                throw new AppException(ErrorCode.SOCIAL_USER_INFO_INVALID);
            }

            User user = findOrCreateUserAccount(fb.email(), fb.name(), null,
                    AuthProvider.FACEBOOK, fb.id());

            return createAndSaveTokens(user, deviceId, ip, userAgent);

        } catch (Exception e) {
            log.error("Facebook login failed", e);
            throw new AppException(ErrorCode.FACEBOOK_TOKEN_INVALID);
        }
    }


    @Override
    @Transactional
    public boolean requestOtp(String emailOrPhone) {
        // Xác định là email hay SĐT
        // (Regex đơn giản, bạn có thể dùng thư viện libphonenumber nếu cần)
        boolean isPhone = emailOrPhone.matches("^\\+?[0-9. ()-]{7,}$") && !emailOrPhone.contains("@");
        String email = isPhone ? null : emailOrPhone;
        String phone = isPhone ? emailOrPhone : null;

        // 1. Kiểm tra xem user có tồn tại không (vì đây là flow ĐĂNG NHẬP)
        User user = userRepository.findByEmailOrPhoneAndIsDeletedFalse(email, phone)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 2. Tạo mã OTP
        String code = String.format("%06d", new Random().nextInt(999999)); // 6 số
        log.info("Generated OTP: {} for user: {}", code, emailOrPhone); // Log cho debug

        // 3. Lưu OTP và thời gian hết hạn (10 phút)
        otpLoginCodes.put(emailOrPhone, code);
        otpLoginExpiry.put(emailOrPhone, Instant.now().plus(10, ChronoUnit.MINUTES));

        // 4. Gửi OTP
        try {
            if (isPhone) {
                smsService.sendSms(phone, code);
                log.warn("SMS service not configured. OTP for {} is {}", phone, code);
                return true;
            } else {
                // Gửi qua email
                // (Giả sử bạn có hàm này trong EmailService)
                emailService.sendOtpEmail(user.getEmail(), code, Locale.getDefault());
            }
        } catch (Exception e) {
            log.error("Failed to send OTP for {}", emailOrPhone, e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        return true;
    }

    @Override
    @Transactional
    public AuthenticationResponse verifyOtpAndLogin(String emailOrPhone, String code, String deviceId, String ip, String userAgent) {
        String storedCode = otpLoginCodes.get(emailOrPhone);
        Instant expiry = otpLoginExpiry.get(emailOrPhone);

        if (storedCode == null || !storedCode.equals(code))
            throw new AppException(ErrorCode.OTP_INVALID);
        if (expiry == null || expiry.isBefore(Instant.now()))
            throw new AppException(ErrorCode.OTP_EXPIRED);

        otpLoginCodes.remove(emailOrPhone);
        otpLoginExpiry.remove(emailOrPhone);

        boolean isPhone = emailOrPhone.matches("^\\+?[0-9. ()-]{7,}$") && !emailOrPhone.contains("@");
        String providerUserId = emailOrPhone;

        User user = findOrCreateUserAccount(
                isPhone ? null : emailOrPhone,
                null,
                isPhone ? emailOrPhone : null,
                isPhone ? AuthProvider.PHONE : AuthProvider.EMAIL,
                providerUserId
        );

        return createAndSaveTokens(user, deviceId, ip, userAgent);
    }


    @Transactional
    public AuthenticationResponse handleRefreshToken(String refreshToken, String deviceId, String ip, String userAgent) {
        if (deviceId != null && ip != null && userAgent != null) {
            return refreshTokenWithDevice(refreshToken, deviceId, ip, userAgent);
        }
        return refreshToken(refreshToken);
    }

    @Transactional
    public AuthenticationResponse refreshTokenWithDevice(String oldRefreshToken, String deviceId, String ip, String userAgent) {
        try {

            SignedJWT jwt = SignedJWT.parse(oldRefreshToken);
            if (!jwt.verify(new RSASSAVerifier(getPublicKey()))) {
                throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
            }

            Date exp = jwt.getJWTClaimsSet().getExpirationTime();
            if (exp.before(new Date())) throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);

            String subject = jwt.getJWTClaimsSet().getSubject();
            if (subject == null || subject.isBlank()) {
                throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
            }
            UUID userId = UUID.fromString(subject);
            RefreshToken oldToken = refreshTokenRepository
                    .findByUserIdAndTokenAndIsRevokedFalse(userId, oldRefreshToken)
                    .orElseThrow(() -> new AppException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

            if (!deviceId.equals(oldToken.getDeviceId())) {
                throw new AppException(ErrorCode.REFRESH_TOKEN_DEVICE_MISMATCH);
            }

            User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            String newAccessToken = generateToken(user);
            OffsetDateTime now = OffsetDateTime.now();

            long daysLeft = ChronoUnit.DAYS.between(now, oldToken.getExpiresAt());
            String newRefreshToken = oldRefreshToken;

            if (daysLeft <= 7) {
                newRefreshToken = generateRefreshToken(user,30);
                oldToken.setToken(newRefreshToken);
                oldToken.setExpiresAt(now.plusDays(30));
                oldToken.setIp(ip);
                oldToken.setUserAgent(userAgent);
                oldToken.setRevoked(false);
                refreshTokenRepository.save(oldToken);
            } else {
                oldToken.setIp(ip);
                oldToken.setUserAgent(userAgent);
                oldToken.setExpiresAt(now.plusDays(30));
                refreshTokenRepository.save(oldToken);
            }

            return AuthenticationResponse.builder()
                    .token(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .authenticated(true)
                    .build();

        } catch (ParseException | JOSEException e) {
            throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }


    @Override
    @Transactional
    public boolean isTokenValid(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            System.out.println("Is Token Valid");
            return signedJWT.verify(new RSASSAVerifier(getPublicKey())) &&
                    signedJWT.getJWTClaimsSet().getExpirationTime().after(new Date()) &&
                    !invalidatedTokenRepository.existsByToken(token);


        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Transactional
    public UUID extractTokenByUserId(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            return UUID.fromString(jwt.getJWTClaimsSet().getSubject());
        } catch (Exception e) {
            throw new AppException(ErrorCode.INVALID_TOKEN_FORMAT);
        }
    }

    @Override
    @Transactional
    public List<String> extractScope(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            String scope = jwt.getJWTClaimsSet().getStringClaim("scope");
            if (scope == null || scope.isBlank()) return List.of();
            return Arrays.asList(scope.split(" "));
        } catch (Exception e) {
            throw new AppException(ErrorCode.INVALID_TOKEN_FORMAT);
        }
    }

    @Override
    @Transactional
    public void sendVerifyEmail(String email, UUID userId) {
        String code = UUID.randomUUID().toString().substring(0, 6); // lấy 6 ký tự
        verifyEmailCodes.put(email, code);

        String verifyLink = "https://lingua-monkey.com/verify?email=" + email + "&code=" + code;

        try {
            emailService.sendVerifyAccountEmail(email, verifyLink, Locale.getDefault());
        } catch (MessagingException e) {
            log.error("Send verify email failed for {}", email, e);
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    @Override
    @Transactional
    public void sendPasswordResetCode(String email) {
        userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String code = UUID.randomUUID().toString().substring(0, 6);
        resetPasswordCodes.put(email, code);

        String resetLink = "https://lingua-monkey.com/reset-password?email=" + email + "&code=" + code;

        try {
            emailService.sendPasswordResetEmail(email, resetLink, Locale.getDefault());
        } catch (MessagingException e) {
            log.error("Send password reset email failed for {}", email, e);
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    @Override
    @Transactional
    public String verifyResetCode(String email, String code) {
        String storedCode = resetPasswordCodes.get(email);
        if (storedCode != null && storedCode.equals(code)) {
            return code; // hợp lệ
        }
        throw new AppException(ErrorCode.RESET_TOKEN_INVALID);
    }

    @Override
    @Transactional
    public void resetPassword(String resetToken, String newPassword) {
        String email = resetPasswordCodes.entrySet().stream()
                .filter(e -> e.getValue().equals(resetToken))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.RESET_TOKEN_INVALID));

        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetPasswordCodes.remove(email);
    }

//    Helper
    public User findOrCreateUserAccount(String email, String fullName, String phone,
                                         AuthProvider provider, String providerUserId) {

        // Tìm tài khoản xác thực theo provider_user_id
        Optional<UserAuthAccount> existingAuth =
                userAuthAccountRepository.findByProviderAndProviderUserId(provider, providerUserId);

        if (existingAuth.isPresent()) {
            return existingAuth.get().getUser();
        }

        // Nếu chưa có, tìm xem User có tồn tại theo email/phone không
        Optional<User> existingUser = Optional.empty();
        if (email != null && !email.isBlank()) {
            existingUser = userRepository.findByEmailAndIsDeletedFalse(email);
        } else if (phone != null && !phone.isBlank()) {
            existingUser = userRepository.findByPhoneAndIsDeletedFalse(phone);
        }

        User user = existingUser.orElseGet(() ->
                userRepository.save(User.builder()
                        .email(email)
                        .phone(phone)
                        .fullname(fullName)
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        UserAuthAccount authAccount = UserAuthAccount.builder()
                .user(user)
                .provider(provider)
                .providerUserId(providerUserId)
                .verified(true)
                .primaryAccount(existingUser.isEmpty()) // nếu là user mới → account này là primary
                .linkedAt(OffsetDateTime.now())
                .build();

        userAuthAccountRepository.save(authAccount);
        return user;
    }


    private AuthenticationResponse createAndSaveTokens(User user, String deviceId, String ip, String userAgent) {
        String accessToken = generateToken(user);
        String refreshToken = generateRefreshToken(user, 30);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .token(refreshToken)
                .userId(user.getUserId())
                .deviceId(deviceId)
                .ip(ip)
                .userAgent(userAgent)
                .expiresAt(OffsetDateTime.now().plusDays(30))
                .isRevoked(false)
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthenticationResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }
}