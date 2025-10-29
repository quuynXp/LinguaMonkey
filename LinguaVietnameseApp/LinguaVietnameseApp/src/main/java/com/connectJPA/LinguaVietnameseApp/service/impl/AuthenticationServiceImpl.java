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

    @Override
    public AuthenticationResponse loginWithFirebase(String firebaseIdToken) {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(firebaseIdToken);
            String uid = decodedToken.getUid();

            UserRecord userRecord = FirebaseAuth.getInstance().getUser(uid);
            String email = userRecord.getEmail();
            String phone = userRecord.getPhoneNumber();
            String fullName = userRecord.getDisplayName();

            if (email == null && phone == null) {
                throw new AppException(ErrorCode.INVALID_USER_INFO);
            }

            User user = userRepository.findByEmailOrPhoneAndIsDeletedFalse(email, phone)
                    .orElseGet(() -> userRepository.save(
                            User.builder()
                                    .email(email)
                                    .phone(phone)
                                    .fullname(fullName)
                                    .authProvider(AuthProvider.FIREBASE)
                                    .password(null)
                                    .createdAt(OffsetDateTime.now())
                                    .build()
                    ));

            String accessToken = generateToken(user);
            String refreshToken = generateRefreshToken(user, 30);

            refreshTokenRepository.save(RefreshToken.builder()
                    .token(refreshToken)
                    .userId(user.getUserId())
                    .expiresAt(OffsetDateTime.now().plusDays(30))
                    .isRevoked(false)
                    .build());

            return AuthenticationResponse.builder()
                    .token(accessToken)
                    .refreshToken(refreshToken)
                    .authenticated(true)
                    .build();

        } catch (FirebaseAuthException e) {
            throw new AppException(ErrorCode.FIREBASE_TOKEN_VERIFICATION_FAILED);
        }
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
    public AuthenticationResponse authenticate(AuthenticationRequest request, String deviceId, String ip, String userAgent) {
        User user = userRepository.findByEmailAndIsDeletedFalse(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }

        List<RefreshToken> tokens = refreshTokenRepository.findAllByUserId(user.getUserId());
        // optional: if (tokens.size() >= 5) throw new AppException(ErrorCode.MAX_SESSIONS_EXCEEDED);

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

    @Override
    @Transactional
    public AuthenticationResponse loginWithGoogle(String idToken, String deviceId, String ip, String userAgent) {
        try {
            // 1. Khởi tạo Verifier
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            // 2. Xác thực token
            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken == null) {
                throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID);
            }

            // 3. Lấy thông tin người dùng từ token
            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String email = payload.getEmail();
            if (email == null || email.isBlank()) {
                throw new AppException(ErrorCode.SOCIAL_USER_INFO_INVALID);
            }
            String fullName = (String) payload.get("name");

            // 4. Tìm hoặc tạo người dùng
            User user = findOrCreateUser(email, fullName, null, AuthProvider.GOOGLE);

            // 5. Tạo và lưu tokens
            return createAndSaveTokens(user, deviceId, ip, userAgent);

        } catch (GeneralSecurityException | IOException e) {
            log.error("Google token verification failed", e);
            throw new AppException(ErrorCode.GOOGLE_TOKEN_INVALID);
        } catch (Exception e) {
            log.error("Google login failed", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public AuthenticationResponse loginWithFacebook(String accessToken, String deviceId, String ip, String userAgent) {
        try {
            // 1. Xây dựng URL cho Graph API
            String graphApiUrl = "https://graph.facebook.com/me?fields=id,name,email,first_name,last_name&access_token=" + accessToken;

            // 2. Gọi API (Yêu cầu @Bean RestTemplate)
            FacebookUserResponse fbResponse = restTemplate.getForObject(graphApiUrl, FacebookUserResponse.class);

            if (fbResponse == null || fbResponse.email() == null) {
                throw new AppException(ErrorCode.SOCIAL_USER_INFO_INVALID);
            }

            // 3. Tìm hoặc tạo người dùng
            User user = findOrCreateUser(fbResponse.email(), fbResponse.name(), null, AuthProvider.FACEBOOK);

            // 4. Tạo và lưu tokens
            return createAndSaveTokens(user, deviceId, ip, userAgent);

        } catch (Exception e) {
            log.error("Facebook token verification failed", e);
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
        // 1. Lấy mã đã lưu
        String storedCode = otpLoginCodes.get(emailOrPhone);
        Instant expiry = otpLoginExpiry.get(emailOrPhone);

        // 2. Kiểm tra mã
        if (storedCode == null || !storedCode.equals(code)) {
            throw new AppException(ErrorCode.OTP_INVALID);
        }

        // 3. Kiểm tra hết hạn
        if (expiry == null || expiry.isBefore(Instant.now())) {
            // Xóa mã hết hạn
            otpLoginCodes.remove(emailOrPhone);
            otpLoginExpiry.remove(emailOrPhone);
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        // 4. Xác thực thành công -> Xóa mã đã dùng
        otpLoginCodes.remove(emailOrPhone);
        otpLoginExpiry.remove(emailOrPhone);

        // 5. Tìm người dùng (chắc chắn tồn tại vì đã check ở requestOtp)
        boolean isPhone = emailOrPhone.matches("^\\+?[0-9. ()-]{7,}$") && !emailOrPhone.contains("@");
        User user = userRepository.findByEmailOrPhoneAndIsDeletedFalse(isPhone ? null : emailOrPhone, isPhone ? emailOrPhone : null)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)); // Check lại cho chắc

        // 6. Tạo và lưu tokens
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
    private User findOrCreateUser(String email, String fullName, String phone, AuthProvider provider) {
        // 1. Ưu tiên tìm bằng email nếu có
        Optional<User> userOptional;
        if (email != null && !email.isBlank()) {
            userOptional = userRepository.findByEmailAndIsDeletedFalse(email);
        } else if (phone != null && !phone.isBlank()) {
            userOptional = userRepository.findByPhoneAndIsDeletedFalse(phone);
        } else {
            // Không có email hoặc phone, không thể tạo/tìm user
            throw new AppException(ErrorCode.SOCIAL_USER_INFO_INVALID);
        }

        // 2. Nếu tìm thấy User
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // User đã tồn tại.
            // Cập nhật thông tin nếu cần (ví dụ: provider, fullname)
            if (user.getAuthProvider() == null || user.getAuthProvider() == AuthProvider.EMAIL) {
                user.setAuthProvider(provider);
                if (user.getFullname() == null || user.getFullname().isBlank()) {
                    user.setFullname(fullName);
                }
                userRepository.save(user);
            }
            return user;
        }

        // 3. Nếu không tìm thấy -> Tạo User mới
        Role defaultRole = roleRepository.findByRoleNameAndIsDeletedFalse(RoleName.STUDENT)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND)); // Đảm bảo bạn có RoleName.USER

        User newUser = User.builder()
                .email(email)
                .phone(phone)
                .fullname(fullName)
                .authProvider(provider)
                .password(null) // Social login không có password
                .createdAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();

        User savedUser = userRepository.save(newUser);

        // Gán Role mặc định
        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(defaultRole);
        userRoleRepository.save(userRole);

        log.info("Created new user via {}: {}", provider, email);
        return savedUser;
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