# APK 빌드 가이드

이 문서는 Expo 프로젝트를 Android APK로 빌드하는 방법을 설명합니다.

## 방법 1: EAS Build 사용 (권장)

EAS Build는 Expo의 클라우드 빌드 서비스로, 별도의 Android 개발 환경 설정 없이 APK를 빌드할 수 있습니다.

### 1단계: EAS CLI 설치

```bash
npm install -g eas-cli
```

### 2단계: Expo 계정 로그인

```bash
eas login
```

Expo 계정이 없다면 [expo.dev](https://expo.dev)에서 무료로 가입할 수 있습니다.

### 3단계: Git에 필요한 파일 추가

**중요**: EAS Build는 Git 저장소를 사용하므로, 필요한 파일들이 Git에 추적되어 있어야 합니다.

```bash
# 프로젝트 루트(mjshop)에서 실행
git add APP/package.json APP/app.json APP/eas.json APP/index.ts APP/App.tsx
git add APP/src APP/assets
git commit -m "Add mobile app files for EAS build"
```

### 4단계: 프로젝트 루트에서 빌드 실행

**중요**: 프로젝트 루트(`mjshop`)에서 빌드 명령을 실행해야 합니다.

```bash
# 프로젝트 루트에서
eas build --platform android --profile preview
```

### 4단계: APK 빌드

#### 개발용 APK (디버그)
```bash
eas build --platform android --profile development
```

#### 테스트용 APK (내부 배포)
```bash
eas build --platform android --profile preview
```

#### 프로덕션 APK (릴리스)
```bash
eas build --platform android --profile production
```

### 5단계: 빌드 다운로드

빌드가 완료되면 Expo 대시보드에서 APK 파일을 다운로드할 수 있습니다.
또는 빌드 완료 후 자동으로 다운로드 링크가 제공됩니다.

## 방법 2: 로컬 빌드 (고급)

로컬에서 직접 빌드하려면 Android 개발 환경이 필요합니다.

### 1단계: Android 개발 환경 설정

- Android Studio 설치
- Android SDK 설치
- JAVA_HOME 환경 변수 설정

### 2단계: 네이티브 프로젝트 생성

```bash
cd APP
npx expo prebuild --platform android
```

### 3단계: APK 빌드

```bash
cd android
./gradlew assembleRelease
```

빌드된 APK는 `android/app/build/outputs/apk/release/app-release.apk`에 생성됩니다.

## 빌드 프로파일 설명

### development
- 개발용 빌드
- 디버깅 가능
- 개발 서버 연결 가능

### preview
- 테스트용 빌드
- APK 형식
- 내부 배포용

### production
- 프로덕션 빌드
- APK 또는 AAB 형식
- 스토어 배포용

## 주의사항

1. **API URL 설정**: `app.json`의 `extra.apiUrl`과 `extra.serverUrl`이 실제 서버 주소로 설정되어 있는지 확인하세요.
   - 개발: `http://localhost:3000/api`
   - 프로덕션: 실제 서버 주소

2. **버전 관리**: `app.json`의 `version`과 `android.versionCode`를 업데이트하세요.

3. **서명 키**: 프로덕션 빌드는 서명 키가 필요합니다. EAS Build는 자동으로 관리합니다.

## 문제 해결

### 빌드 실패 시
```bash
eas build --platform android --clear-cache
```

### 로컬 빌드 캐시 정리
```bash
cd android
./gradlew clean
```

## 추가 리소스

- [EAS Build 문서](https://docs.expo.dev/build/introduction/)
- [Expo 공식 문서](https://docs.expo.dev/)

