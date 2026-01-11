# 🛡️ German Watchdog

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Electron](https://img.shields.io/badge/Electron-39.2.7-blue)](https://electronjs.org/)

> **German Watchdog**는 사용자의 산만함(핸드폰 사용, 수면, 비활성화)을 감지하고 Discord를 통해 알림을 보내는 데스크탑 감시 모니터링 시스템입니다.

## 🇰🇷 한국어

### 주요 기능

- **📷 카메라 모니터링**: 웹캠을 통해 핸드폰 감지 및 수면 감지
- **🖥️ 화면 녹화 감지**: 화면 공유/스트림 감지
- **⚙️ 프로세스 모니터링**: 의심스러운 애플리케이션 감지
- **🏃 활동 추적**: 사용자 비활성 감지 (30초 후 경고)
- **🔔 Discord 알림**: 산만함 감지 시 웹훅을 통해 알림 전송
- **📹 비디오 시뮬레이션**: `source.mp4`를 사용한 감시 화면 재생

### 요구사항

- macOS / Windows / Linux
- 카메라 및 화면 녹화 권한
- Node.js 18+ 또는 Bun 런타임

### 설치 방법

```bash
# Bun 사용 시
bun install

# 또는 npm 사용 시
npm install
```

### 실행 방법

```bash
# 개발 모드로 실행
bun run dev

# 또는 빌드 후 실행
npm run build && npm start
```

### 프로젝트 구조

```
german-watchdog/
├── src/
│   ├── main/main.ts          # Electron 메인 프로세스 (IPC 처리, Discord 웹훅)
│   ├── preload/preload.js    # 안전한 IPC 브릿지를 위한 사전 로드 스크립트
│   ├── renderer/
│   │   ├── renderer.ts       # 메인 애플리케이션 로직
│   │   └── services/         # 감지 서비스 (핸드폰, 수면, 활동 등)
│   └── shared/types.ts       # TypeScript 인터페이스
├── dist/                     # 빌드 출력물
├── index.html                # 한국어 UI
├── styles.css                # 애플리케이션 스타일
├── source.mp4                # 감시 비디오 (12초)
├── .env                      # Discord 웹훅 URL 설정
├── package.json              # 프로젝트 설정
└── .github/workflows/        # GitHub Actions CI/CD
```

### 사용법

#### 감시 시작

1. "🔒 권한 요청" 버튼을 클릭하여 카메라 및 화면 녹화 권한 부여
2. "🎬 감시 시작" 버튼을 클릭하여 모니터링 시작
3. 감시 시뮬레이션 비디오가 재생됨
4. 감시는 비디오가 끝나거나 "⏹️ 중지" 버튼을 누를 때까지 계속 실행

#### 감지 기능

시스템은 다음을 모니터링합니다:
- **📱 핸드폰 감지**: 카메라 뷰에서 전화기 같은 물체 감지
- **😴 수면 감지**: 사용자가 자고 있는 것처럼 보이면 감지
- **🏃 비활성화**: 30초 동안 활동이 없으면 경고
- **⚠️ 의심스러운 프로세스**: 화면 녹화 또는 카메라 우회 도구 감지

#### Discord 연동

1. Discord 채널 설정에서 웹훅 URL 가져오기
2. `.env` 파일에 웹훅 URL 설정:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```
3. 산만함이 감지되면 알림이 전송됨

#### 알림 시스템

산만함이 감지되면:
- 애플리케이션에 모달 알림이 표시됨
- "무시" 버튼을 눌러 확인
- 또는 "5분 중단" 버튼으로 5분간 알림 일시 중지

### 설정

`src/renderer/renderer.ts`에서 감지 임계값 수정:

```typescript
this.settings = {
  checkIntervalMin: 5000,        // 최소 감지 간격 (5초)
  checkIntervalMax: 15000,       // 최대 감지 간격 (15초)
  phoneDetectionThreshold: 0.7,  // 핸드폰 감지 신뢰도
  sleepDetectionThreshold: 0.6,  // 수면 감지 신뢰도
  inactivityThreshold: 30000,    // 30초 후 경고
  distractionCooldown: 60000     // 알림 사이 1분 대기
};
```

### 빌드 및 배포

```bash
# 현재 플랫폼용 빌드
npm run electron:build

# 특정 플랫폼용 빌드
npm run electron:build -- --mac   # macOS (DMG)
npm run electron:build -- --win   # Windows (NSIS)
npm run electron:build -- --linux # Linux (AppImage)
```

### 디버깅

- 개발 모드에서 DevTools가 자동으로 열림
- 감지 로그 및 오류는 콘솔에서 확인
- 주요 로그: `[Surveillance]`, `[Watchdog]`

### 개인정보 보호 및 보안

- 모든 감지는 로컬에서 실행
- 카메라 피드는 어디에도 전송되지 않음
- Discord 웹훅은 HTTPS를 사용한 보안 알림
- 프로세스 데이터는 시스템에 유지

---

## 🇺🇸 English

### Features

- **📷 Camera Monitoring**: Continuously monitors webcam for phone detection and sleep detection
- **🖥️ Screen Recording Detection**: Detects screen sharing/streams
- **⚙️ Process Monitoring**: Monitors running processes for suspicious applications
- **🏃 Activity Tracking**: Detects user inactivity (warning after 30 seconds)
- **🔔 Discord Notifications**: Sends alerts via webhooks when distraction is detected
- **📹 Video Simulation**: Uses `source.mp4` for surveillance simulation

### Requirements

- macOS / Windows / Linux
- Camera and screen recording permissions
- Node.js 18+ or Bun runtime

### Installation

```bash
# Using Bun
bun install

# Using npm
npm install
```

### Running the Application

```bash
# Run in development mode
bun run dev

# Or build and run
npm run build && npm start
```

### Project Structure

```
german-watchdog/
├── src/
│   ├── main/main.ts          # Electron main process (IPC, Discord webhooks)
│   ├── preload/preload.js    # Preload script for secure IPC bridge
│   ├── renderer/
│   │   ├── renderer.ts       # Main application logic
│   │   └── services/         # Detection services (phone, sleep, activity, etc.)
│   └── shared/types.ts       # TypeScript interfaces
├── dist/                     # Build output
├── index.html                # Korean UI
├── styles.css                # Application styles
├── source.mp4                # Surveillance video (12 seconds)
├── .env                      # Discord webhook URL configuration
├── package.json              # Project configuration
└── .github/workflows/        # GitHub Actions CI/CD
```

### Usage

#### Starting Surveillance

1. Click "🔒 Request Permissions" to grant camera and screen recording access
2. Click "🎬 Start Surveillance" to begin monitoring
3. The surveillance simulation video will play
4. Monitoring runs continuously until the video ends or you click "⏹️ Stop"

#### Detection Features

The system monitors for:
- **📱 Phone Detection**: Detects phone-like objects in camera view
- **😴 Sleep Detection**: Detects if user appears to be sleeping
- **🏃 Inactivity**: Warns after 30 seconds of no user activity
- **⚠️ Suspicious Processes**: Flags screen recording or camera bypass tools

#### Discord Integration

1. Get your Discord webhook URL from a channel's settings
2. Set the webhook URL in `.env` file:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```
3. Alerts will be sent when distraction is detected

#### Alert System

When distraction is detected:
- A modal alert appears in the application
- Click "Dismiss" to acknowledge
- Or "Snooze 5min" to suppress alerts for 5 minutes

### Configuration

Modify detection thresholds in `src/renderer/renderer.ts`:

```typescript
this.settings = {
  checkIntervalMin: 5000,        // Minimum check interval (5 seconds)
  checkIntervalMax: 15000,       // Maximum check interval (15 seconds)
  phoneDetectionThreshold: 0.7,  // Phone detection confidence
  sleepDetectionThreshold: 0.6,  // Sleep detection confidence
  inactivityThreshold: 30000,    // Warning after 30 seconds
  distractionCooldown: 60000     // 1 minute between alerts
};
```

### Build and Distribution

```bash
# Build for current platform
npm run electron:build

# Build for specific platform
npm run electron:build -- --mac   # macOS (DMG)
npm run electron:build -- --win   # Windows (NSIS)
npm run electron:build -- --linux # Linux (AppImage)
```

### Debugging

- DevTools open automatically in development mode
- Check console for detection logs and errors
- Key log prefixes: `[Surveillance]`, `[Watchdog]`

### Privacy & Security

- All detection runs locally on your machine
- Camera feed is not transmitted anywhere
- Discord webhooks use HTTPS for secure notifications
- Process data stays on your system

---

## 📦 Download Releases

Download pre-built installers from the [Releases page](https://github.com/eunhhu/german-watchdog/releases):

| Platform | Installer |
|----------|-----------|
| 🖥️ Windows | `German Watchdog Setup 1.0.0.exe` (NSIS) |
| 🍎 macOS | `German Watchdog-1.0.0.dmg` (DMG) |
| 🐧 Linux | `german-watchdog_1.0.0_amd64.AppImage` (AppImage) |

---

## 📄 License

ISC License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Made with 🛡️ by German Watchdog Team
</p>
