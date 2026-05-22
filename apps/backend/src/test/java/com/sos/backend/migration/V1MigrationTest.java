package com.sos.backend.migration;

import com.sos.backend.global.common.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V1__init.sql 마이그레이션 검증 (플레인 1.B.6).
 *
 * Flyway가 적용된 후 ddl-auto=validate가 통과한 상태에서:
 *  - 모든 엔티티 테이블이 존재
 *  - P0-009 컬럼 오타 정정 (user_achievement_id)
 *  - P0-010 family_type varchar 정정
 *  - play_logs.play_log_id UNIQUE 제약 (stats-sync 멱등성)
 *
 * Testcontainers PostgreSQL이 필요. Docker 없는 환경에서는 무시.
 */
@DisplayName("V1 마이그레이션 검증")
class V1MigrationTest extends AbstractIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("V1__init.sql이 모든 엔티티 테이블을 생성한다")
    void v1_createsAllEntityTables() throws Exception {
        Set<String> expected = Set.of(
            "users",
            "user_profiles",
            "user_stats",
            "refresh_tokens",
            "auth_providers",
            "user_scenario_progress",
            "achievements",
            "user_achievements",
            "notification",
            "withdrawal_outbox",
            "game_sessions",
            "play_logs"
        );

        Set<String> actual = new HashSet<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData md = conn.getMetaData();
            try (ResultSet rs = md.getTables(null, "public", "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    actual.add(rs.getString("TABLE_NAME"));
                }
            }
        }
        assertThat(actual).containsAll(expected);
    }

    @Test
    @DisplayName("user_achievements PK 컬럼은 user_achievement_id 이다 (P0-009)")
    void userAchievementsPrimaryKeyIsCorrectlyNamed() {
        Integer correctCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'user_achievements' AND column_name = 'user_achievement_id'",
            Integer.class
        );
        assertThat(correctCount).isEqualTo(1);

        Integer typoCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'user_achievements' AND column_name = 'user_achivement_id'",
            Integer.class
        );
        assertThat(typoCount).isZero();
    }

    @Test
    @DisplayName("user_profiles.family_type 컬럼은 varchar 이다 (P0-010)")
    void userProfilesFamilyTypeIsVarchar() {
        String dataType = jdbcTemplate.queryForObject(
            "SELECT data_type FROM information_schema.columns " +
                "WHERE table_name = 'user_profiles' AND column_name = 'family_type'",
            String.class
        );
        assertThat(dataType).isEqualToIgnoringCase("character varying");
    }

    @Test
    @DisplayName("play_logs.play_log_id 컬럼에 UNIQUE 제약이 존재한다 (멱등성 키)")
    void playLogsPlayLogIdIsUnique() {
        Integer uniqueCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.table_constraints tc " +
                "JOIN information_schema.constraint_column_usage ccu " +
                "  ON tc.constraint_name = ccu.constraint_name " +
                "WHERE tc.table_name = 'play_logs' " +
                "  AND ccu.column_name = 'play_log_id' " +
                "  AND tc.constraint_type = 'UNIQUE'",
            Integer.class
        );
        assertThat(uniqueCount).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("achievements.code 컬럼에 UNIQUE 제약이 존재한다")
    void achievementsCodeIsUnique() {
        Integer uniqueCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.table_constraints tc " +
                "JOIN information_schema.constraint_column_usage ccu " +
                "  ON tc.constraint_name = ccu.constraint_name " +
                "WHERE tc.table_name = 'achievements' " +
                "  AND ccu.column_name = 'code' " +
                "  AND tc.constraint_type = 'UNIQUE'",
            Integer.class
        );
        assertThat(uniqueCount).isGreaterThanOrEqualTo(1);
    }
}
