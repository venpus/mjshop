# 모바일 앱 테스트 가이드

## 📱 실제 모바일 기기에서 테스트하는 방법

### 1. 사전 준비사항

#### 필요한 도구 설치
```bash
# Node.js가 설치되어 있어야 합니다
# npm 또는 yarn이 필요합니다

# Expo CLI 전역 설치 (선택사항)
npm install -g expo-cli

# 또는 npx로 실행 가능 (설치 불필요)
```

#### Expo Go 앱 설치
- **iOS**: App Store에서 "Expo Go" 검색 후 설치
- **Android**: Google Play Store에서 "Expo Go" 검색 후 설치

### 2. 네트워크 설정 (중요!)

모바일 기기에서 `localhost`는 기기 자체를 가리키므로, PC의 실제 IP 주소를 사용해야 합니다.

#### PC의 IP 주소 확인 방법

**Windows:**
```powershell
# PowerShell에서 실행
ipconfig

# "IPv4 주소" 항목을 찾으세요 (예: 192.168.0.100)
```

**Mac/Linux:**
```bash
# 터미널에서 실행
ifconfig

# 또는
ip addr show

# "inet" 항목을 찾으세요 (예: 192.168.0.100)
```

#### 환경 변수 파일 생성

`APP` 폴더에 `.env` 파일을 생성하세요:

```env
# PC의 실제 IP 주소로 변경하세요
EXPO_PUBLIC_API_URL=http://192.168.0.100:3000/api
EXPO_PUBLIC_SERVER_URL=http://192.168.0.100:3000
```

**주의사항:**
- IP 주소는 PC와 모바일 기기가 같은 Wi-Fi 네트워크에 연결되어 있어야 합니다
- 방화벽에서 포트 3000이 열려있어야 합니다
- IP 주소가 변경되면 `.env` 파일도 업데이트해야 합니다

### 3. 서버 실행 확인

모바일 앱이 서버와 통신하려면 백엔드 서버가 실행 중이어야 합니다.

```bash
# server 폴더에서 서버 실행
cd server
npm install  # 처음 한 번만
npm start

# 서버가 http://localhost:3000 에서 실행되는지 확인
```

### 4. 앱 실행 방법

#### 방법 1: Expo Go 사용 (가장 간단)

```bash
# APP 폴더로 이동
cd APP

# 의존성 설치 (처음 한 번만)
npm install

# Expo 개발 서버 시작
npm start

# 또는
npx expo start
```

실행 후:
1. 터미널에 QR 코드가 표시됩니다
2. **iOS**: 카메라 앱으로 QR 코드 스캔 → Expo Go 앱이 자동으로 열림
3. **Android**: Expo Go 앱을 열고 "Scan QR code" 선택 → QR 코드 스캔

#### 방법 2: 터널 모드 사용 (다른 네트워크에서도 가능)

```bash
# Expo 개발 서버를 터널 모드로 시작
npx expo start --tunnel

# 또는
npm start -- --tunnel
```

터널 모드는 Expo의 클라우드 서비스를 통해 연결하므로, PC와 모바일이 다른 네트워크에 있어도 작동합니다.

#### 방법 3: LAN 모드 (같은 Wi-Fi 네트워크)

```bash
# LAN 모드로 시작
npx expo start --lan
```

### 5. 플랫폼별 실행

#### Android 에뮬레이터/기기
```bash
npm run android
# 또는
npx expo start --android
```

#### iOS 시뮬레이터 (Mac만 가능)
```bash
npm run ios
# 또는
npx expo start --ios
```

#### 웹 브라우저
```bash
npm run web
# 또는
npx expo start --web
```

### 6. 문제 해결

#### 문제: "Network request failed" 또는 연결 오류

**해결 방법:**
1. PC와 모바일이 같은 Wi-Fi에 연결되어 있는지 확인
2. PC의 방화벽에서 포트 3000이 허용되어 있는지 확인
3. `.env` 파일의 IP 주소가 올바른지 확인
4. 서버가 실행 중인지 확인 (`http://localhost:3000` 접속 테스트)

#### 문제: Expo Go에서 앱이 로드되지 않음

**해결 방법:**
1. Expo Go 앱을 최신 버전으로 업데이트
2. `npm start`를 다시 실행
3. 터널 모드로 시도: `npx expo start --tunnel`

#### 문제: API 호출이 실패함

**해결 방법:**
1. `APP/src/config/constants.ts`에서 환경 변수가 제대로 로드되는지 확인
2. 개발자 도구에서 네트워크 요청 확인
3. 서버 로그에서 요청이 도착하는지 확인

### 7. 개발 팁

#### 핫 리로드
- 코드를 수정하면 자동으로 앱이 새로고침됩니다
- `r` 키를 눌러 수동 새로고침
- `m` 키를 눌러 메뉴 열기

#### 디버깅
- Expo Go 앱에서 흔들기(Shake) → "Debug Remote JS" 선택
- Chrome DevTools가 열리며 디버깅 가능

#### 로그 확인
- 터미널에서 앱 로그 확인 가능
- `console.log()` 출력이 터미널에 표시됨

### 8. 프로덕션 빌드 (나중에)

실제 배포를 위해서는:
```bash
# Android APK 빌드
npx expo build:android

# iOS 빌드 (Apple Developer 계정 필요)
npx expo build:ios
```

또는 EAS Build 사용:
```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## 📝 체크리스트

테스트 전 확인사항:
- [ ] Node.js 설치됨
- [ ] Expo Go 앱 설치됨 (모바일)
- [ ] PC와 모바일이 같은 Wi-Fi에 연결됨
- [ ] PC의 IP 주소 확인됨
- [ ] `.env` 파일 생성 및 IP 주소 설정됨
- [ ] 서버가 실행 중임 (`http://localhost:3000`)
- [ ] 방화벽에서 포트 3000 허용됨

## 🔗 유용한 링크

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Navigation 문서](https://reactnavigation.org/)
- [Expo Go 다운로드 (iOS)](https://apps.apple.com/app/expo-go/id982107779)
- [Expo Go 다운로드 (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

