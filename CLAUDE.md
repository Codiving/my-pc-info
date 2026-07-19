# 내 PC 한눈에

Windows PC 사양을 한눈에 볼 수 있는 Tauri 데스크탑 앱.

## 기술 스택

- Frontend: React + TypeScript + Vite
- Backend: Rust (Tauri)
- 패키지 매니저: pnpm

## 개발

```bash
pnpm install
pnpm tauri dev   # Windows 환경 필요
```

## 빌드 / 릴리즈

Mac에서는 빌드 불가. GitHub Actions CI로 진행.

→ [CI / Release 가이드](AGENTS.md)

## 커밋 규칙

- `Co-Authored-By` 등 불필요한 트레일러는 커밋 메시지에 포함하지 않는다.
