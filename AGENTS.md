# CI / Release

## 워크플로우

파일 위치: `.github/workflows/build.yml`

| 트리거 | 동작 |
|---|---|
| `main` 푸시 / PR | Windows 빌드 검증, artifact 90일 보관 |
| `v*` 태그 푸시 | 빌드 + GitHub Release에 `.msi` / `.exe` 자동 등록 |

## 릴리즈 방법

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 정식 릴리즈 vs 프리릴리즈

태그 네이밍으로 구분:

- `v1.0.0` → 정식 릴리즈
- `v1.0.0-beta.1`, `v1.0.0-rc.1` → 프리릴리즈 (GitHub에서 Pre-release 배지 자동 표시)

`contains(github.ref, '-')` 조건으로 자동 판별.

## 캐시

- **pnpm**: `pnpm-lock.yaml` 기준 node_modules 캐시
- **Rust**: `Swatinem/rust-cache` — `~/.cargo` + `src-tauri/target` 캐시
  - 첫 빌드: 10~15분
  - Rust 코드 변경 없으면 이후: 2~3분
