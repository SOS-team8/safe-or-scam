package com.sos.backend.global.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .components(new io.swagger.v3.oas.models.Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .name("Authorization")
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")))
            .info(new Info()
                .title("S.O.S API")
                .description("Safe or Scam 백엔드 API 명세서")
                .version("v1.0.0"));
    }
}
