# How to Use Claude TTL Counter

**Table of Contents / 목차**

- [Quick idea / 핵심](#quick-idea)
- [What to look at first / 먼저 볼 것](#what-to-look-at-first--먼저-볼-것)
- [How to read the numbers / 숫자 읽는 법](#how-to-read-the-numbers--숫자-읽는-법)
- [When to use 5m vs 1h / 언제 뭘 쓸까](#when-to-use-5m-vs-1h--언제-뭘-쓸까)
- [Practical scenarios / 실전 시나리오](#practical-scenarios--실전-시나리오)
- [How to react to warnings / 경고가 뜨면](#how-to-react-to-warnings--경고가-뜨면)
- [Per-project TTL / 프로젝트별 TTL 설정](#per-project-ttl--프로젝트별-ttl-설정)
- [Rolling status bar / 롤링 상태 바](#rolling-status-bar--롤링-상태-바)
- [Statusline bridge / 사용률 브릿지 설정](#statusline-bridge--사용률-브릿지-설정)

---

## Quick idea

This extension is most useful when you want to answer a simple question before sending your next turn:

> "If I send the next prompt now, am I still benefiting from prompt cache?"

다음 턴을 보내기 전에 딱 이 질문에 답할 수 있어요:

> "지금 보내면, 캐시 혜택을 아직 받고 있나?"

---

## What to look at first / 먼저 볼 것

### 1. Status bar countdown / 상태 바 카운트다운

```text
TTL 42:15 · my-workspace
```

캐시가 만료되기까지 남은 시간이에요. 프로젝트 이름도 같이 보여서 창이 여러 개여도 구분돼요.

### 2. Tooltip / 툴팁

상태 바에 마우스를 올리면 직전 턴의 캐시 상태를 볼 수 있어요:

- 전체 입력 토큰 수
- 캐시 히트율 — 높을수록 좋아요
- 실제로 새로 처리된 토큰 수 — 낮을수록 절약된 거예요
- 캐시 상태 (cold start가 있었는지)

---

## How to read the numbers / 숫자 읽는 법

**Cache hit ratio가 핵심이에요.** 이 숫자가 높으면 대부분 캐시에서 재사용된 거고, 낮으면 새로 처리된 거예요.

| 지표 | 뜻 | 좋은 방향 |
|---|---|---|
| Cache hit | 캐시에서 재사용된 비율 | 높을수록 좋아요 |
| Fresh input | 새로 처리된 토큰 | 낮을수록 절약 |
| Cache creation | 이번 턴에 새로 캐시에 쌓인 토큰 | 첫 턴이면 자연스러운 거예요 |
| Gross input | 모델이 본 전체 입력 크기 | 참고용 |

---

## When to use 5m vs 1h / 언제 뭘 쓸까

### `5m` — 빠르게 주고받을 때

- 버그 잡으면서 짧은 프롬프트를 연달아 보낼 때
- 1~2분 안에 다음 턴을 보내는 리듬일 때
- 비용을 줄이고 싶고, 작업 공백이 짧을 때

### `1h` — 천천히 생각할 때

- 코드나 문서를 오래 읽고 검토한 뒤 답할 때
- 설계, 기획, 리뷰처럼 턴 사이에 긴 사고가 필요할 때
- 프롬프트를 길고 구체적으로 작성하는 편일 때

한 줄로: 빠르면 `5분`, 느리면 `1시간`.

---

## Practical scenarios / 실전 시나리오

### 빠른 코딩 루프

버그를 고치면서 1분 안팎으로 짧은 프롬프트를 계속 보내는 상황이에요.

- `5분` 모드로 두고
- TTL이 충분히 남아 있는지 체크하고
- cache hit이 높게 유지되면 리듬이 건강한 거예요

### 설계 / 리뷰 / 깊은 추론

설계안을 받고 문서를 한참 읽은 뒤에 다음 턴을 보내는 상황이에요.

- `1시간` 모드가 안전해요
- 5분 모드였다면 읽는 사이에 캐시가 만료될 수 있어요

---

## How to react to warnings / 경고가 뜨면

### "TTL is under five minutes"

캐시가 아직 살아 있지만 곧 만료돼요.

- 보낼 게 있으면 지금 보내세요
- 한참 더 읽을 거면 `1시간`으로 전환하세요

### "Recent cache resets look frequent"

최근 몇 턴에서 캐시가 자주 초기화됐어요. fresh 부담이 반복적으로 커지고 있다는 뜻이에요.

- 작업 공백이 정말 긴지 확인해보세요
- 그렇다면 `1시간` 모드를 고려하세요

---

## Per-project TTL / 프로젝트별 TTL 설정

### 기본: 전역 설정

상태 바를 클릭해서 모드를 바꾸면 `~/.claude/settings.json`에 기록돼요. 이건 전역 설정이라 모든 Claude Code 세션에 적용돼요.

### 프로젝트마다 다르게 하고 싶을 때

여러 프로젝트를 동시에 작업하면, 리듬이 프로젝트마다 다를 수 있어요. 설계 프로젝트는 천천히, 버그 수정은 빠르게 — 이런 경우에 프로젝트별 TTL이 필요해요.

### 설정 방법

프로젝트 루트에 `.claude/settings.json`을 만들면 돼요:

**이 프로젝트만 1시간 모드:**

```json
{
  "env": {
    "ENABLE_PROMPT_CACHING_1H": "1"
  }
}
```

**이 프로젝트만 5분 모드:**

```json
{
  "env": {
    "FORCE_PROMPT_CACHING_5M": "1"
  }
}
```

### 우선순위

Claude Code는 프로젝트 레벨 설정을 먼저 보고, 없으면 전역 설정을 따라요.

```
~/projects/
  design-project/          ← 1시간 (느린 리듬)
    .claude/settings.json
  bugfix-repo/             ← 5분 (빠른 리듬)
    .claude/settings.json
  normal-repo/             ← 전역 설정 따름
```

### 참고

상태 바 토글은 전역 설정만 바꿔요. 프로젝트 레벨 설정이 있으면 그게 우선이라, 토글로 바꿔도 그 프로젝트에는 영향이 없어요.

---

## Friendly rule of thumb

빠르게 주고받으면 `5분`, 천천히 읽고 생각하면 `1시간`.

프로젝트마다 리듬이 다르면, 프로젝트별 설정을 활용하세요.

---

## Rolling status bar / 롤링 상태 바

After each turn completes, the status bar briefly shows your usage before returning to the TTL countdown:

매 턴 완료 후, 상태 바가 잠깐 사용량을 보여주고 카운트다운으로 돌아가요:

```
[1] $(clock) TTL 42:15          ← 기본: 카운트다운
[2] $(pulse) 84k in · hit 82%   ← 3초: 이번 턴 사용량 (배경색 변경)
[3] $(dashboard) 5h 25.6% (+2.1%) | 7d 42.0%  ← 3초: 누적 사용률 + 이번 턴 증가분
[4] $(clock) TTL 42:09          ← 복귀: 카운트다운
```

- **Step 2** only: if the statusline bridge is not connected, step 3 is skipped.
- **Warning priority**: if a cache reset warning is active, rolling is paused.

- **2단계만**: statusline bridge가 연결 안 돼 있으면 3단계를 건너뛰어요.
- **경고 우선**: 캐시 리셋 경고가 활성 상태면 롤링이 멈춰요.

---

## Statusline bridge / 사용률 브릿지 설정

The 5h/7d usage display requires a bridge that writes Claude Code's rate limit data to a local JSON file.

5h/7d 사용률 표시는 Claude Code의 rate limit 데이터를 로컬 JSON 파일에 써주는 bridge가 필요해요.

### How it works / 작동 방식

1. Claude Code outputs rate limit info via its statusline
2. `bridge/write-rate-limits.js` reads that output and writes to `~/.claude/ttl-counter-rate-limits.json`
3. The extension reads that file every 3 seconds

1. Claude Code가 statusline을 통해 rate limit 정보를 출력해요
2. `bridge/write-rate-limits.js`가 그 출력을 읽어서 `~/.claude/ttl-counter-rate-limits.json`에 써요
3. 확장이 3초마다 그 파일을 읽어요

### Manual test / 수동 테스트

You can verify the bridge works by writing test data:

bridge가 동작하는지 테스트 데이터로 확인할 수 있어요:

```bash
echo '{"rate_limits":{"five_hour":{"used_percentage":25.6},"seven_day":{"used_percentage":42.0}}}' | node bridge/write-rate-limits.js
```

After this, the next turn completion will show the rate limit flash.

이후 다음 턴 완료 시 사용률 flash가 표시돼요.

### Troubleshooting / 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 5h/7d가 안 보임 | bridge 파일이 없음 | bridge 설정 또는 수동 테스트로 파일 생성 |
| 값이 바뀌지 않음 | bridge가 갱신을 안 함 | `~/.claude/ttl-counter-rate-limits.json`의 `updated_at` 확인 |
| delta가 (+0.0%)로만 뜸 | 이전 값과 현재 값이 같음 | 다음 턴에서 실제 사용량 변화가 생기면 delta가 반영됨 |
