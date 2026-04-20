# How to Use Claude TTL Counter

## Quick idea

This extension is most useful when you want to answer a simple question before sending your next turn:

> "If I send the next prompt now, am I still benefiting from prompt cache?"

이 확장은 다음 턴을 보내기 전에 이런 질문에 답하고 싶을 때 가장 유용합니다.

> "지금 다음 프롬프트를 보내면, 아직 프롬프트 캐시 이점을 받고 있나?"

---

## What to look at first

### 1. Status bar countdown

Example:

```text
TTL 42:15 · my-workspace
```

This tells you how much time is left before the current prompt cache window is likely to expire.

이 숫자는 현재 프롬프트 캐시 창이 만료되기까지 남은 시간을 뜻합니다.

### 2. Tooltip metrics

Hover the status bar item to see:

- fresh input
- cache read
- cache creation
- gross input
- effective fresh
- cache hit ratio

툴팁에는 다음 정보가 보입니다.

- 새 입력 토큰
- 캐시에서 다시 읽은 토큰
- 이번 턴에 새로 캐시에 만든 토큰
- 전체 입력 규모
- 실제 fresh 부담 규모
- 캐시 적중률

---

## How to read the numbers

### Fresh input

Fresh input means tokens that were newly processed in the latest completed turn.

`fresh input`은 최근 완료된 턴에서 새로 처리된 토큰입니다.

### Cache read

Cache read means tokens that were already available from prompt cache and reused.

`cache read`는 이미 캐시에 들어 있던 토큰을 다시 활용한 양입니다.

### Cache creation

Cache creation means tokens that were newly cached during the latest turn.

`cache creation`은 최근 턴에서 새로 캐시에 쌓인 토큰입니다.

### Gross input

Gross input is the full prompt-side context size that the model worked with.

`gross input`은 모델이 참고한 전체 입력 규모입니다.

### Effective fresh

Effective fresh is a practical estimate of how much fresh prompt-side burden you actually paid this turn.

`effective fresh`는 이번 턴에서 실제로 fresh 부담이 얼마나 있었는지 보기 위한 실용 지표입니다.

### Cache hit ratio

A higher cache hit ratio usually means more of the context came from existing cache.

`cache hit ratio`가 높을수록, 기존 캐시를 더 많이 재활용했다는 뜻입니다.

---

## When to use 5m vs 1h

### Choose `5m` if...

- you work in short, fast loops
- you send many small prompts in a row
- you rarely pause for long review

### `5분`을 고르기 좋은 경우

- 짧고 빠른 반복 작업일 때
- 작은 프롬프트를 연달아 많이 보낼 때
- 중간 검토 시간이 길지 않을 때

### Choose `1h` if...

- you spend time reading code or documents between turns
- you work on design, planning, or review tasks
- you often pause before deciding what to send next

### `1시간`을 고르기 좋은 경우

- 턴 사이에 코드나 문서를 오래 읽을 때
- 설계, 기획, 리뷰 중심 작업일 때
- 다음 턴을 보내기 전에 생각하는 시간이 긴 편일 때

---

## Practical scenarios

### Scenario A: Fast coding loop

You are fixing a bug and sending short prompts every minute.

What usually works best:
- `5m` mode
- keep an eye on TTL
- if cache hit stays high, your flow is probably healthy

### 시나리오 A: 빠른 코딩 루프

버그를 고치면서 1분 안팎으로 짧은 프롬프트를 계속 보내는 상황입니다.

보통은:
- `5분` 모드
- TTL 체크
- cache hit이 높게 유지되는지 확인

### Scenario B: Design / review / deep reasoning

You ask for a design plan, then spend several minutes reading documents and code before replying.

What usually works best:
- `1h` mode
- this gives you more room before cache expiry

### 시나리오 B: 설계 / 리뷰 / 긴 추론

설계안이나 코드 리뷰를 받은 뒤, 문서와 코드를 오래 읽고 다음 턴을 보내는 상황입니다.

보통은:
- `1시간` 모드
- 캐시 만료 전에 훨씬 여유가 생깁니다

---

## How to react to warnings

### "TTL is under five minutes"

This usually means:
- you still have cache now
- but a long pause may waste the next turn

Good next actions:
- send the next prompt soon
- or switch to `1h` if you expect a longer pause

### "최근 캐시 초기화가 빈번해요"에 해당하는 경고

이건 보통:
- 최근 몇 턴에서 캐시가 자주 다시 시작됐고
- fresh 부담이 반복적으로 커졌을 가능성
을 뜻합니다.

좋은 다음 행동:
- 정말 작업 공백이 긴지 확인
- 그렇다면 `1시간` 모드 고려
- 세션 리듬이 너무 자주 끊기는지 확인

---

## Per-project TTL / 프로젝트별 TTL 설정

### Default: global / 기본값: 전역 설정

When you click the status bar and switch modes, the extension writes to `~/.claude/settings.json`. This is the **global** setting — it applies to every Claude Code session on your machine.

상태 바를 클릭해서 모드를 바꾸면, `~/.claude/settings.json`에 기록됩니다. 이건 **전역** 설정이라 내 컴퓨터의 모든 Claude Code 세션에 적용돼요.

### When you need per-project TTL / 프로젝트별 TTL이 필요할 때

If you work on multiple projects at the same time — for example, a design project where you think slowly and a bugfix repo where you send turns fast — you might want different TTL modes for each.

여러 프로젝트를 동시에 작업할 때가 있어요. 예를 들어 설계 프로젝트는 천천히 생각하면서 진행하고, 버그 수정 레포는 빠르게 주고받을 때. 이런 경우 프로젝트마다 TTL 모드가 달라야 할 수 있어요.

### How to set per-project TTL / 설정 방법

Create a `.claude/settings.json` file in your project root:

프로젝트 루트에 `.claude/settings.json` 파일을 만들면 돼요:

**For 1h mode on this project / 이 프로젝트만 1시간 모드:**

```json
{
  "env": {
    "ENABLE_PROMPT_CACHING_1H": "1"
  }
}
```

**For 5m mode on this project / 이 프로젝트만 5분 모드:**

```json
{
  "env": {
    "FORCE_PROMPT_CACHING_5M": "1"
  }
}
```

### How it works / 작동 원리

Claude Code reads settings in this order:

Claude Code는 아래 순서로 설정을 읽어요:

1. `<project>/.claude/settings.json` — project-level / 프로젝트 레벨
2. `~/.claude/settings.json` — global / 전역

Project-level settings override global settings. So if your global is `5m` but a specific project has `1h`, that project will use `1h`.

프로젝트 레벨 설정이 전역 설정을 덮어써요. 전역이 `5분`이어도 특정 프로젝트에 `1시간`이 있으면, 그 프로젝트는 `1시간`으로 동작해요.

### Practical example / 실전 예시

```
~/projects/
  design-project/          ← 1h mode (slow rhythm)
    .claude/settings.json  ← {"env":{"ENABLE_PROMPT_CACHING_1H":"1"}}
  bugfix-repo/             ← 5m mode (fast rhythm)
    .claude/settings.json  ← {"env":{"FORCE_PROMPT_CACHING_5M":"1"}}
  normal-repo/             ← follows global setting
    (no .claude/settings.json)
```

### Note on the extension / 확장 관련 참고

Currently, the status bar toggle writes to the **global** `~/.claude/settings.json`. If you set a project-level override, the toggle won't overwrite it — project-level always wins for that project's Claude Code session.

현재 상태 바 토글은 **전역** `~/.claude/settings.json`에 기록해요. 프로젝트 레벨 오버라이드가 있으면, 토글로 바꿔도 그 프로젝트의 Claude Code 세션에는 프로젝트 설정이 우선 적용돼요.

---

## Friendly rule of thumb

If you work fast, prefer `5m`.

If you think slowly between turns, prefer `1h`.

If you do both across different projects, set per-project overrides.

빠르게 주고받으면 `5분`, 천천히 읽고 생각하면 `1시간`.
프로젝트마다 리듬이 다르면, 프로젝트별 설정을 활용하세요.
