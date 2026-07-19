# 규칙

## 커밋

Co-authored-by 등 불필요한 트레일러는 커밋 메시지에 넣지 않는다.

---

# CI / Release

## 워크플로우

파일 위치: `.github/workflows/build.yml`

| 트리거 | 동작 |
|---|---|
| `main` 푸시 / PR | Windows 빌드 검증, artifact 보관 |
| `v*` 태그 푸시 | 서명 빌드 + GitHub Release (`.msi` / `.exe` + `latest.json`) |

`latest.json`은 앱 내 자동 업데이트 체크에 사용된다. `tauri-apps/tauri-action`이 자동 생성·업로드.

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

## 자동 업데이트 서명 키 설정 (최초 1회)

릴리즈 빌드에서 업데이트 파일에 서명하려면 키 쌍을 생성하고 등록해야 한다.

### 1. 키 생성 (Windows 또는 Mac)

```bash
pnpm tauri signer generate -w ~/.tauri/mypcinfo.key
```

출력 예시:
```
Public-key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduI...
```

### 2. `tauri.conf.json`에 공개키 등록

`src-tauri/tauri.conf.json`의 `plugins.updater.pubkey` 값을 위 공개키로 교체:

```json
"plugins": {
  "updater": {
    "pubkey": "여기에 Public-key 값 붙여넣기",
    ...
  }
}
```

### 3. GitHub Secrets 등록

저장소 Settings → Secrets and variables → Actions에서:

| Secret 이름 | 값 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | `~/.tauri/mypcinfo.key` 파일 전체 내용 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 키 생성 시 입력한 비밀번호 (없으면 빈 값) |

이후 `v*` 태그를 푸시하면 CI가 자동으로 서명된 릴리즈를 생성한다.

---

## 캐시

- **pnpm**: `pnpm-lock.yaml` 기준 node_modules 캐시
- **Rust**: `Swatinem/rust-cache` — `~/.cargo` + `src-tauri/target` 캐시
  - 첫 빌드: 10~15분
  - Rust 코드 변경 없으면 이후: 2~3분
