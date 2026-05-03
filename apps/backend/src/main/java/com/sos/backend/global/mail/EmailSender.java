package com.sos.backend.global.mail;

import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailSender {

    private final JavaMailSender mailSender;
    private final EmailProperties emailProperties;

    public void sendVerificationCode(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            helper.setFrom(new InternetAddress(
                emailProperties.from(),
                emailProperties.senderName(),
                StandardCharsets.UTF_8.name()
            ));
            helper.setTo(to);
            helper.setSubject("[Safe or Scam] 이메일 인증 코드");
            helper.setText(buildVerificationBody(code));

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            log.error("Failed to send verification email to {}", to, e);
            throw new CustomException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private String buildVerificationBody(String code) {
        return """
                Safe or Scam 이메일 인증 코드입니다.

                인증 코드: %s

                위 코드를 5분 내에 입력해주세요.
                본인이 요청하지 않은 경우 이 메일을 무시해주세요.
                """.formatted(code);
    }
}
