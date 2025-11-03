package com.connectJPA.LinguaVietnameseApp.utils;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.interfaces.RSAPrivateKey;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Date;

public class JwtUtil {
    @Value("classpath:private_key.pem")
    private static Resource privateKeyResource;

    private static RSAPrivateKey getPrivateKey() throws Exception {
        String key = new String(Files.readAllBytes(privateKeyResource.getFile().toPath()), StandardCharsets.UTF_8);
        key = key.replaceAll("-----BEGIN (.*)-----", "")
                .replaceAll("-----END (.*)-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(key);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) kf.generatePrivate(spec);
    }


    public static String createRS256Jwt(String kid, String subject, String audience) throws Exception {
        RSAPrivateKey privateKey = getPrivateKey();
        Algorithm algorithm = Algorithm.RSA256(null, privateKey);
        long now = System.currentTimeMillis();
        String token = JWT.create()
                .withKeyId(kid)               // kid so kong can map to rsa public
                .withIssuer("lingua-java")
                .withSubject(subject)         // e.g. user id or client id
                .withAudience(audience)       // e.g. "lingua-api"
                .withIssuedAt(new Date(now))
                .withExpiresAt(new Date(now + 5 * 60 * 1000)) // 5 minutes
                .sign(algorithm);
        return token;
    }
}
