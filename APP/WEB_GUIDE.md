# 웹에서 모바일 앱 실행하기

이 문서는 Expo React Native 앱을 웹 브라우저에서 실행하는 방법을 설명합니다.

## 빠른 시작

### 1단계: 웹 개발 서버 시작

```bash
cd APP
npm run web
```

또는

```bash
cd APP
npx expo start --web
```

### 2단계: 브라우저에서 열기

터미널에 표시된 URL(일반적으로 `http://localhost:8081`)을 브라우저에서 열면 됩니다.

## 다른 기기에서 접근하기

### 방법 1: 로컬 네트워크 접근 (같은 WiFi)

같은 WiFi 네트워크에 연결된 다른 기기(스마트폰, 태블릿, 다른 PC)에서 접근할 수 있습니다.

#### 1단계: 로컬 네트워크 주소 확인

웹 서버를 시작하면 터미널에 다음과 같은 정보가 표시됩니다:

```
Metro waiting on exp://192.168.0.100:8081
```

여기서 `192.168.0.100`이 로컬 IP 주소입니다.

#### 2단계: 다른 기기에서 접근

다른 기기의 브라우저에서 다음 URL로 접근:

```
http://192.168.0.100:8081
```

**중요**: 
- 개발 PC와 다른 기기가 **같은 WiFi 네트워크**에 연결되어 있어야 합니다
- 방화벽이 포트 8081을 차단하지 않아야 합니다

#### 3단계: 방화벽 설정 (필요한 경우)

**Windows**:
1. Windows Defender 방화벽 설정 열기
2. "고급 설정" → "인바운드 규칙" → "새 규칙"
3. 포트 선택 → TCP → 특정 로컬 포트: `8081`
4. 연결 허용 → 모든 프로필 선택 → 이름: "Expo Web"

**Mac**:
```bash
# 시스템 설정 → 네트워크 → 방화벽 → 옵션
# Node.js 또는 Terminal 허용
```

### 방법 2: 터널링 서비스 사용 (다른 네트워크)

다른 네트워크(예: 인터넷)에서 접근하려면 터널링 서비스를 사용할 수 있습니다.

#### ngrok 사용 예시:

```bash
# 1. ngrok 설치
npm install -g ngrok

# 2. 웹 서버 시작 (다른 터미널)
cd APP
npm run web

# 3. ngrok 터널 생성 (새 터미널)
ngrok http 8081
```

ngrok이 제공하는 공개 URL(예: `https://abc123.ngrok.io`)을 다른 기기에서 접근할 수 있습니다.

### 방법 3: 명시적으로 LAN 모드로 시작

```bash
cd APP
npx expo start --web --lan
```

이렇게 하면 로컬 네트워크 접근이 명시적으로 활성화됩니다.

## 웹에서 제한사항

일부 네이티브 모듈은 웹에서 작동하지 않거나 제한적으로 작동합니다:

### 1. `@react-native-community/datetimepicker`
- **웹 지원**: 제한적
- **해결책**: 웹에서는 HTML5 `<input type="date">` 또는 다른 웹 호환 라이브러리 사용

### 2. `expo-image-picker`
- **웹 지원**: 제한적
- **해결책**: 웹에서는 HTML5 `<input type="file">` 사용

### 3. `expo-file-system`
- **웹 지원**: 제한적
- **해결책**: 웹에서는 브라우저 API 사용

### 4. `BackHandler`
- **웹 지원**: 없음
- **해결책**: `Platform.OS === 'web'` 체크 추가

## 웹 최적화 팁

1. **플랫폼 체크**: 웹 전용 코드는 `Platform.OS === 'web'`으로 감싸기
2. **반응형 디자인**: 모바일과 웹 모두 지원하도록 스타일 조정
3. **터치 이벤트**: 웹에서는 마우스 이벤트도 고려

## 문제 해결

### 웹에서 실행되지 않는 경우

1. **캐시 정리**:
```bash
npx expo start --web --clear
```

2. **의존성 재설치**:
```bash
rm -rf node_modules
npm install
```

3. **포트 변경**:
```bash
npx expo start --web --port 3000
```

## 프로덕션 빌드

웹 프로덕션 빌드를 생성하려면:

```bash
npx expo export:web
```

빌드된 파일은 `web-build` 폴더에 생성됩니다.

## API 서버 설정 (다른 기기 접근 시)

다른 기기에서 접근할 때는 `app.json`의 `extra.apiUrl`이 `localhost`로 되어 있으면 작동하지 않습니다.

### 해결 방법 1: 환경 변수 사용 (권장)

`.env` 파일 생성:
```bash
# APP/.env
EXPO_PUBLIC_API_URL=http://192.168.0.100:3000/api
EXPO_PUBLIC_SERVER_URL=http://192.168.0.100:3000
```

`192.168.0.100`을 개발 PC의 실제 로컬 IP 주소로 변경하세요.

### 해결 방법 2: 런타임에서 IP 자동 감지

코드에서 동적으로 API URL을 설정할 수 있습니다.

## 로컬 IP 주소 확인 방법

### Windows:
```bash
ipconfig
```
"IPv4 주소"를 찾으세요 (예: 192.168.0.100)

### Mac/Linux:
```bash
ifconfig
```
또는
```bash
ip addr show
```

## 빠른 시작 (다른 기기 접근)

1. **로컬 IP 확인**:
```bash
# Windows
ipconfig

# Mac/Linux  
ifconfig | grep "inet "
```

2. **웹 서버 시작 (LAN 모드)**:
```bash
cd APP
npm run web:lan
```

3. **다른 기기에서 접근**:
   - 같은 WiFi에 연결
   - 브라우저에서 `http://[로컬IP]:8081` 접근
   - 예: `http://192.168.0.100:8081`

