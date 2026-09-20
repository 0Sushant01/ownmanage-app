# OwnManage Mobile App

Mobile application foundation for the OwnManage project built with React Native, Expo (SDK 57), TypeScript, Expo Router, Axios, and Expo SecureStore.

## Project Purpose

Provides the cross-platform mobile client for the OwnManage platform, featuring file-based routing with Expo Router, secure credential storage with Expo SecureStore, and centralized HTTP networking via Axios.

## Prerequisites

- Node.js (v18.0.0 or higher, tested on v22)
- npm (v9.0.0 or higher)
- Expo Go app on iOS/Android physical device, or an Android emulator / iOS simulator

## Installation

Install project dependencies:

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Description | Example / Recommended |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for the OwnManage backend API | `http://10.0.2.2:8000/api` (Android Emulator)<br>`http://localhost:8000/api` (iOS Simulator)<br>`http://192.168.x.x:8000/api` (Physical Device) |

> Note: Expo automatically exposes environment variables prefixed with `EXPO_PUBLIC_` to the client runtime. Never include private secrets or passwords in public environment variables.
> All API network calls flow through the centralized Axios client at `src/api/client.ts`.

## Expo Development Commands

Start the Metro bundler:

```bash
npx expo start
```

Other development targets:

- `npm run start` or `npx expo start`: Start interactive Expo development server
- `npx expo start --clear`: Start with Metro cache cleared

## Android Development

To run the application on an Android emulator or connected device:

1. Ensure Android Studio and Android SDK are installed with `ANDROID_HOME` configured.
2. Start your Android Virtual Device (AVD) or connect a physical Android device with USB debugging enabled.
3. Start the Android build:

```bash
npm run android
```

> For connecting to a local backend running on `localhost:8000` from the Android Emulator, use `http://10.0.2.2:8000/api` in your `.env` file.
