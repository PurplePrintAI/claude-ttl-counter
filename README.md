# Claude TTL Counter

Claude TTL Counter is a lightweight VS Code extension that shows a live countdown for Claude Code prompt cache TTL.

Claude TTL Counter는 Claude Code 프롬프트 캐시 TTL을 VS Code 상태바에서 실시간으로 보여주는 가벼운 확장입니다.

## 한국어 요약

- 현재 workspace에 연결된 Claude 세션을 찾아요
- 마지막 user prompt 시각을 로컬 JSONL transcript에서 읽어요
- `~/.claude/settings.json`에서 현재 TTL 모드(5분/1시간)를 감지해요
- 상태바에 `TTL 42:15` 같은 카운트다운을 보여줘요
- 만료 임박/만료 시 알림을 띄워줘요
- Quick Pick으로 `5분` / `1시간` 모드를 빠르게 바꿀 수 있어요

## What it does

- Reads the active Claude session for the current workspace
- Finds the last user prompt timestamp from the local Claude JSONL transcript
- Detects the current cache TTL mode from `~/.claude/settings.json`
- Shows a status bar countdown like `TTL 42:15`
- Warns when the TTL is close to expiry or already expired
- Lets you switch between `5분` and `1시간` mode from a Quick Pick

## How it works

The extension does **not** patch the Claude Code extension.  
Instead, it reads local Claude files:

- `~/.claude/sessions/*.json`
- `~/.claude/projects/**/<sessionId>.jsonl`
- `~/.claude/settings.json`

즉 Claude Code 본 extension을 수정하지 않고, 로컬 Claude 파일만 읽어서 TTL을 계산하고 표시합니다.

## Commands

- `Claude TTL: 캐시 모드 변경`
- `Claude TTL: 상태 보기`

## Development

```bash
npm install
npm run compile
```

Then press `F5` in VS Code to launch the extension host.

## Notes

- Status bar text stays in English for marketplace friendliness
- Notifications are currently Korean-first
- TTL mode follows Claude Code's current settings pattern:
  - `ENABLE_PROMPT_CACHING_1H`
  - `FORCE_PROMPT_CACHING_5M`

## License

MIT
