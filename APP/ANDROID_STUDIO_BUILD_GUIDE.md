# 안드로이드 스튜디오에서 빌드하기

이 문서는 Expo React Native 앱을 안드로이드 스튜디오에서 직접 빌드하는 방법을 설명합니다.

## 사전 요구사항

### 1. 필수 소프트웨어 설치

- **Android Studio** (최신 버전 권장)
  - [다운로드](https://developer.android.com/studio)
- **Java Development Kit (JDK)** 17 이상
  - Android Studio 설치 시 함께 설치됨
- **Node.js** 및 **npm** (이미 설치되어 있음)

### 2. Android SDK 설정

1. Android Studio 실행
2. **Tools** → **SDK Manager** 열기
3. 다음 항목 설치 확인:
   - **Android SDK Platform** (최신 버전)
   - **Android SDK Build-Tools**
   - **Android SDK Command-line Tools**
   - **Android Emulator** (에뮬레이터 사용 시)

### 3. 환경 변수 설정

#### Windows

1. 시스템 환경 변수 설정:
   - `ANDROID_HOME`: `C:\Users\[사용자명]\AppData\Local\Android\Sdk`
   - `JAVA_HOME`: JDK 설치 경로 (예: `C:\Program Files\Java\jdk-17`)
   - `PATH`에 추가:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\tools`
     - `%ANDROID_HOME%\tools\bin`

2. PowerShell에서 확인:
```powershell
$env:ANDROID_HOME
$env:JAVA_HOME
```

#### Mac/Linux

```bash
# ~/.zshrc 또는 ~/.bashrc에 추가
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
```

## 빌드 방법

### 방법 1: 안드로이드 스튜디오에서 직접 빌드 (권장)

#### 1단계: 프로젝트 열기

1. Android Studio 실행
2. **File** → **Open** 선택
3. `APP/android` 폴더 선택
4. **Trust Project** 클릭 (처음 열 때)

#### 2단계: Gradle 동기화

- Android Studio가 자동으로 Gradle 동기화를 시작합니다
- 하단의 **Build** 탭에서 진행 상황 확인
- 동기화 완료까지 몇 분 소요될 수 있습니다

#### 3단계: 빌드 설정 확인

1. **File** → **Project Structure** 열기
2. **Modules** → **app** 선택
3. 다음 항목 확인:
   - **Compile SDK Version**: 34 이상
   - **Min SDK Version**: 21 이상
   - **Target SDK Version**: 34 이상

#### 4단계: APK 빌드

##### 디버그 APK 빌드

1. 상단 메뉴에서 **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)** 선택
2. 또는 터미널에서:
```bash
cd APP/android
./gradlew assembleDebug
```

빌드된 APK 위치:
```
APP/android/app/build/outputs/apk/debug/app-debug.apk
```

##### 릴리스 APK 빌드

1. **Build** → **Generate Signed Bundle / APK** 선택
2. **APK** 선택 → **Next**
3. 키스토어 설정:
   - 기존 키스토어가 있으면 선택
   - 없으면 **Create new...** 클릭하여 새로 생성
4. 키스토어 정보 입력:
   - **Key store path**: 키스토어 파일 경로
   - **Key store password**: 키스토어 비밀번호
   - **Key alias**: 키 별칭
   - **Key password**: 키 비밀번호
5. **Release** 빌드 타입 선택 → **Finish**

또는 터미널에서:
```bash
cd APP/android
./gradlew assembleRelease
```

**주의**: 릴리스 빌드는 서명이 필요합니다. 서명 키가 없으면 디버그 키스토어를 사용하거나 새로 생성해야 합니다.

빌드된 APK 위치:
```
APP/android/app/build/outputs/apk/release/app-release.apk
```

### 방법 2: 명령줄에서 빌드

#### 1단계: 네이티브 프로젝트 생성 (이미 있으면 생략)

```bash
cd APP
npx expo prebuild --platform android
```

#### 2단계: 디버그 APK 빌드

```bash
cd APP/android
./gradlew assembleDebug
```

Windows에서는:
```powershell
cd APP\android
.\gradlew.bat assembleDebug
```

#### 3단계: 릴리스 APK 빌드

```bash
cd APP/android
./gradlew assembleRelease
```

Windows에서는:
```powershell
cd APP\android
.\gradlew.bat assembleRelease
```

### 방법 3: Expo CLI를 통한 빌드

```bash
cd APP
npx expo run:android
```

이 명령은:
1. 네이티브 프로젝트를 생성/업데이트
2. Android Studio를 통해 빌드
3. 연결된 디바이스나 에뮬레이터에 설치

## 빌드 타입 설명

### Debug (디버그)
- 개발 및 테스트용
- 디버깅 정보 포함
- 서명: 자동 생성된 디버그 키스토어
- 크기: 큼
- 최적화: 없음

### Release (릴리스)
- 프로덕션 배포용
- 코드 난독화 및 최적화
- 서명: 사용자 정의 키스토어 필요
- 크기: 작음
- 최적화: ProGuard/R8 적용

## 키스토어 생성 (릴리스 빌드용)

### 명령줄에서 생성

```bash
cd APP/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Android Studio에서 생성

1. **Build** → **Generate Signed Bundle / APK**
2. **Create new...** 클릭
3. 키스토어 정보 입력
4. 저장 위치 선택

**중요**: 키스토어 파일과 비밀번호를 안전하게 보관하세요. 분실하면 앱 업데이트가 불가능합니다.

## 빌드 문제 해결

### 1. Gradle 동기화 실패

```bash
cd APP/android
./gradlew clean
./gradlew --refresh-dependencies
```

### 2. 빌드 캐시 정리

```bash
cd APP/android
./gradlew clean
rm -rf .gradle
rm -rf app/build
```

### 3. 네이티브 프로젝트 재생성

```bash
cd APP
rm -rf android ios
npx expo prebuild --platform android
```

### 4. 의존성 문제

```bash
cd APP
rm -rf node_modules
npm install
cd android
./gradlew clean
```

### 5. Java 버전 문제

- JDK 17 이상 사용 확인
- `JAVA_HOME` 환경 변수 확인
- Android Studio의 **File** → **Project Structure** → **SDK Location**에서 JDK 경로 확인

### 6. Android SDK 문제

- Android Studio의 **Tools** → **SDK Manager**에서 필요한 SDK 설치
- `ANDROID_HOME` 환경 변수 확인

## APK 설치 및 테스트

### 에뮬레이터에 설치

1. Android Studio에서 **Tools** → **Device Manager**
2. 에뮬레이터 생성 또는 실행
3. APK 파일을 에뮬레이터로 드래그 앤 드롭

### 실제 디바이스에 설치

1. 디바이스에서 **개발자 옵션** 활성화
2. **USB 디버깅** 활성화
3. USB로 PC에 연결
4. 다음 명령 실행:
```bash
cd APP/android
./gradlew installDebug
```

또는 APK 파일을 디바이스로 전송하여 직접 설치

## 빌드 최적화

### 1. ProGuard 설정

`APP/android/app/proguard-rules.pro` 파일에 규칙 추가:

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo
-keep class expo.modules.** { *; }
```

### 2. 빌드 속도 향상

`APP/android/gradle.properties`에 추가:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.daemon=true
org.gradle.configureondemand=true
```

## 주의사항

1. **API URL 설정**: `app.json`의 `extra.apiUrl`이 실제 서버 주소로 설정되어 있는지 확인
2. **버전 관리**: `app.json`의 `version`과 `android.versionCode` 업데이트
3. **서명 키 보관**: 릴리스 빌드용 키스토어는 안전하게 보관
4. **네이티브 코드 수정**: `android` 폴더의 파일을 직접 수정하면 `expo prebuild` 실행 시 덮어씌워질 수 있음

## 추가 리소스

- [Android Studio 공식 문서](https://developer.android.com/studio)
- [Expo Prebuild 문서](https://docs.expo.dev/workflow/prebuild/)
- [React Native Android 빌드 가이드](https://reactnative.dev/docs/signed-apk-android)

