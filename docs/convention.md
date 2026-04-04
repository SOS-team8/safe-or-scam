# 📘 Git & GitHub 컨벤션 정리

---

## 0. 전체 워크플로우 요약

---

```
1. Issue 생성         →  [FEAT] 로그인 API 구현
2. 브랜치 생성          →  feature/#12-add-login-api (dev에서 분기)
3. 작업 & 커밋         →  feat(backend): add login api
4. Push              →  git push origin feature/#12-add-login-api
5. PR 생성            →  [FEAT] 로그인 API 구현 (#12), Closes #12
6. 코드리뷰 & 승인      →  메인 브랜치 병합시에는 1명 이상 Approve
7. 병합 (Merge)       →  Squash Merge 또는 Merge Commit
8. 브랜치 삭제          →  병합 완료된 feature 브랜치 삭제
9. Issue 닫기         → (자동 Close 안걸려 있을 경우)
```

## 1. Issue 컨벤션

---

> **핵심 원칙은 이슈 하나 = 작업 하나**
> 

### 1-1. 이슈 네이밍 형식

```
{[TYPE]} {설명}
```

#### 타입 종류

- `[FEAT]` : 새 기능 개발
- `[FIX]` : 버그 수정
- `[HOTFIX]` : 프로덕션 긴급 수정
- `[CHORE]` : 설정, 의존성, 환경 관련
- `[DOCS]` : 문서 작업
- `[REFACTOR]` : 리팩토링 (기능 변경 없음)

#### 실제 예시

```
[FEAT] 로그인 API 구현
[FIX] 액세스 토큰 만료 시 재발급 안 되는 버그
[CHORE] Gradle 스프링부트 버전 3.2로 업데이트
```

### 1-2. 이슈 템플릿

→ 템플릿 내장 (참고: `.github/ISSUE_TEMPLATE/` )
    

## 2. 브랜치 전략 (Branch Strategy)

---

> **Git-flow 기반**
> 

### 2-1. **Git-flow 기반** 브랜치 구조

- **`main`**: 배포 코드 브랜치
- **`dev`**: 다음 배포를 위한 통합 개발 브랜치
- **`feature/#이슈번호-설명`**: 기능 개발 브랜치
- **`fix/#이슈번호-설명`**: 버그 수정 브랜치
- **`hotfix/#이슈번호-설명`**: 배포 후 긴급 버그 수정 브랜치
- **`chore/#이슈번호-설명`**: 설정, 의존성, 리팩토링 브랜치
- **`docs/#이슈번호-설명`** : 문서 작업 브랜치

> ⚠️ `hotfix`만 `main`에서 분기합니다. 그 외 모든 작업 브랜치는 `dev`에서 분기합니다.
> 

### 2-2. 브랜치 네이밍 형식

```
{type}/#{이슈번호}-{설명}
```

**(예시:** `feature/#12-add-login-api`, `fix/#35-fix-null-pointer` )

#### 규칙

- 소문자만 사용
- 단어 구분은 하이픈(-)
- 영어로 작성
- 너무 길게 쓰지 않기 (3~4단어 이내)

## 3. Commit 컨벤션

---

### 3-1. 커밋 메시지 형식

Conventional Commits 스타일, **스코프 포함형 (서비스가 여러 개일 때 유용)**

```bash
{type}({영역}): {설명}
```
공통이면 영역 안 적음

#### 실제 예시

```
feat(backend): resolve null pointer on profile page
feat(frontend): implement login page
fix(game-engine): resolve scenario loading bug
chore: update .gitignore
docs: add API specification draft
```

### 3-2. Type 목록

| Type | 설명 |
| --- | --- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `chore` | 빌드, 설정, 의존성 추가 or 수정 (프로덕션 코드 변경 없음) |
| `docs` | 문서 수정 (README, Swagger 등) |
| `refactor` | 코드 리팩토링 (기능 변경 없이 구조 개선) |
| `style` | 코드 포맷팅, 세미콜론 누락 등 (코드 변경 없음) |
| `test` | 테스트 코드 추가 및 수정 |
| `hotfix` | 배포 후 긴급 버그 수정 |

#### 규칙

- 소문자로 시작
- 동사 원형으로 시작
- 현재형으로 작성 (implementing, implemented ❌ → implement ✅)
- 50자 이내
- 마침표 없음

## 4. PR 컨벤션

---

### 4-1. PR 제목 형식

```
{[TYPE]} {설명} ({이슈번호})
```

#### 타입 종류

- `[FEAT]` : 새 기능 개발
- `[FIX]` : 버그 수정
- `[HOTFIX]` : 프로덕션 긴급 수정
- `[CHORE]` : 설정, 의존성, 환경 관련
- `[DOCS]` : 문서 작업
- `[REFACTOR]` : 리팩토링 (기능 변경 없음)

#### 실제 예시

```
[FEAT] 로그인 API 구현 (#42)
[FIX] 액세스 토큰 만료 버그 수정 (#53)
[CHORE] Gradle 의존성 업데이트 (#61)
[DOCS] API 명세서 초안 작성 (#62)
```

### 4-2. PR 작성 규칙

| 항목 | 필수 여부 | 설명 |
| --- | --- | --- |
| 제목 | ✅ | 위 참고 (예: `[FEAT] 로그인 API 구현 (#42)`) |
| Reviewer | 🔼 | develop로 병합시는 필수 아님, main으로 병합시 필수 |
| Assignees | ❌ | 작성자 본인 지정 |
| Labels | ✅ | 관련 라벨 부착 |
| 이슈 연결 | ✅ | `Closes #이슈번호` 필수 기입 |
| 승인 조건 | 🔼 | develop 병합시 코드래빗 사용 후 본인이 병합 가능, main으로 병합시 1명 이상 코드리뷰 승인 후 병합 가능 |

### 4-3. PR 템플릿

→ 템플릿 내장 (참고: `.github/PULL_REQUEST_TEMPLATE.md/` )
    

## 5. 코드리뷰, 주의할 점

---

- 코드래빗 사용 예정 → PR 올릴 시 AI가 커밋한 코드 전체 자동 리뷰
- 머지는 다른 팀원의 도메인이 섞여있을 시 카톡 등으로 머지한다고 알리고 머지하기
- 충돌 있으면 해결!!
- **선 fetch 후 작업 필수**
- 간단한건 그냥 셀프 머지
- 강제 푸시 금지
- 개발 코드들은 `dev` 에 머지하기

## 6. 참고자료

---

[각종 convention(이슈, 브랜치네이밍, 커밋, PR)](https://velog.io/@juminzoomout/%EA%B0%81%EC%A2%85-convention%EC%9D%B4%EC%8A%88-%EB%B8%8C%EB%9E%9C%EC%B9%98%EB%84%A4%EC%9D%B4%EB%B0%8D-%EC%BB%A4%EB%B0%8B-PR)

[[ Git ] commit, issue, PR, branch 컨벤션 총정리](https://imsleepdev.tistory.com/8)