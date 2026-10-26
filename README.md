# German Watchdog

A desktop "distraction monitor" built with Electron: it watches the webcam, screen, and user activity for signs of phone use, sleeping, or inactivity, and posts alerts to a Discord channel through a webhook.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Electron](https://img.shields.io/badge/Electron-39.2.7-blue)](https://electronjs.org/)

**Status:** Prototype — the app shell, permission flow, Discord alerts, and release pipeline work; the detection services use simple pixel heuristics with random fallbacks, and the process monitor returns simulated data rather than real process lists.

## Features

- Camera monitoring with a phone-shape heuristic (`phone-detection.service.ts`) and a sleep heuristic (`sleep-detection.service.ts`) run on downscaled webcam frames
- Screen-share detection via `getDisplayMedia` (`screen-monitoring.service.ts`)
- Inactivity tracking with a warning after 30 seconds of no input (`activity-monitoring.service.ts`)
- Suspicious-process check (`process-monitoring.service.ts`, currently simulated)
- Discord webhook notifications on start, stop, and each detected distraction (`discord-notification.service.ts` → main process)
- In-app alert modal with **Dismiss** and **Snooze 5 min**
- Plays `source.mp4` as a surveillance simulation while monitoring runs
- Cross-platform installers (NSIS / DMG / AppImage) built by GitHub Actions on `v*.*.*` tags

## How it works

- `src/main/main.ts` is the Electron main process. It loads `.env` manually, exposes `DISCORD_WEBHOOK_URL` to the renderer via IPC, handles camera/screen permission requests, and performs the actual Discord webhook POSTs (`send-discord-alert`, `send-start-notification`, `send-stop-notification`).
- `src/preload/preload.js` exposes a small IPC bridge to the renderer.
- `src/renderer/renderer.ts` owns the UI state machine and schedules detection checks at a random interval between `checkIntervalMin` and `checkIntervalMax`; each service extends `base-detection.service.ts` and reports results back to the renderer, which applies thresholds and a cooldown before raising an alert.
- The renderer is bundled with esbuild (`build:renderer`) and the main process is compiled with `tsc`.

## Tech stack

- Runtime/Language: Bun (scripts), TypeScript 5, Electron 39
- UI: plain HTML/CSS (`index.html`, `styles.css`), no framework
- Build: `tsc`, esbuild, electron-builder
- CI: GitHub Actions release workflow (`.github/workflows/release.yml`) on ubuntu/macos/windows
- Note: `@tensorflow/tfjs-node` and `node-webcam` are listed in `package.json` but are not used by the current detection code

## Getting started

### Requirements

- Bun (or Node.js 18+)
- Camera and screen-recording permissions on the host OS
- A Discord webhook URL (optional; alerts are skipped without it)

### Install

```bash
bun install
cp .env.example .env   # then set DISCORD_WEBHOOK_URL
```

### Run

```bash
bun run dev              # build + start
bun run build            # tsc + esbuild renderer + copy assets/preload into dist/
bun start                # electron .
bun run electron:build   # package for the current platform (output in release/)
bun run electron:build -- --mac | --win | --linux
bun run clean
```

Usage: click **Request Permissions**, then **Start Surveillance**. Monitoring continues until the video ends or you press **Stop**. Log prefixes in the DevTools console: `[Surveillance]`, `[Watchdog]`.

## Project structure

```text
src/
  main/main.ts                    Electron main process: .env loading, permissions, Discord webhook IPC
  preload/preload.js              IPC bridge
  renderer/renderer.ts            app logic, scheduling, alert modal
  renderer/services/              phone, sleep, screen, activity, process, discord services
  shared/types.ts                 shared interfaces
index.html, styles.css            UI (labels are in Korean)
source.mp4, assets/source.mp4     surveillance simulation video
.env.example                      webhook configuration template
.github/workflows/release.yml     tag-triggered multi-OS release build
grass-*.md, maintenance.log       activity-log files, not part of the app
```

## Configuration

- `DISCORD_WEBHOOK_URL` (`.env`) — Discord webhook that receives start/stop/distraction messages. Read by `src/main/main.ts`; the build copies `.env` into `dist/` if present.
- Detection thresholds live in `src/renderer/renderer.ts` (`checkIntervalMin` 5000 ms, `checkIntervalMax` 15000 ms, `phoneDetectionThreshold` 0.7, `sleepDetectionThreshold` 0.6, `inactivityThreshold` 30000 ms, `distractionCooldown` 60000 ms).

## Releases

The release workflow builds installers for Windows, macOS, and Linux when a `v*.*.*` tag is pushed and uploads them to the [Releases page](https://github.com/eunhhu/german-watchdog/releases). At the time of writing only the `v1.0.16` pre-release carries an asset (a Windows NSIS installer).

## Privacy

All detection runs locally; camera and screen frames are never uploaded. Only text alerts are sent to the configured Discord webhook.

## License

ISC (declared in `package.json`). No LICENSE file yet.
