# 이미지 표시 문제 해결 기록

## 문제 상황

### 증상
- 이미지 업로드는 정상적으로 완료됨
- 서버에 이미지 파일이 올바른 경로(`server/uploads/products/P001/001.png`)에 저장됨
- 프론트엔드에서 이미지 URL이 올바르게 변환됨 (`http://localhost:3000/uploads/products/P001/001.png`)
- 하지만 브라우저 화면에서는 이미지가 회색 배경으로만 표시되고 실제 이미지가 보이지 않음

### 브라우저 콘솔/네트워크 로그
- 브라우저 개발자 도구 Network 탭: `blocked:CORP` 오류 표시
- 이미지 요청 URL: `http://localhost:3000/uploads/products/P001/001.png`
- HTTP 상태 코드: `304 Not Modified` (정상)
- 하지만 이미지가 실제로 로드되지 않음

## 원인 분석

### 근본 원인
**Cross-Origin Resource Policy (CORP) 차단**

1. **Helmet 미들웨어의 기본 설정**
   - `helmet()` 미들웨어는 기본적으로 `Cross-Origin-Resource-Policy` 헤더를 `same-origin`으로 설정
   - 이는 같은 origin에서만 리소스를 로드할 수 있도록 제한

2. **클라이언트-서버 포트 차이**
   - 클라이언트: `http://localhost:5173` (Vite 개발 서버)
   - 서버: `http://localhost:3000` (Express 서버)
   - 포트가 다르므로 브라우저가 다른 origin으로 인식

3. **결과**
   - 브라우저가 서버의 CORP 정책(`same-origin`)에 따라 이미지 로드를 차단
   - `blocked:CORP` 오류 발생

## 해결 방법

### 수정 코드
`server/src/index.ts` 파일의 Helmet 설정을 변경:

```typescript
// 수정 전
app.use(helmet()); // 보안 헤더 설정

// 수정 후
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // 보안 헤더 설정
```

### 설명
- `crossOriginResourcePolicy: { policy: "cross-origin" }` 옵션을 추가하여 Cross-Origin-Resource-Policy 헤더를 `cross-origin`으로 설정
- 이제 다른 origin에서도 이미지 리소스를 로드할 수 있음
- 클라이언트(`localhost:5173`)에서 서버(`localhost:3000`)의 이미지를 정상적으로 로드 가능

## 검증

### 확인 사항
1. ✅ 이미지 로딩 성공 메시지가 브라우저 콘솔에 표시됨
2. ✅ 네트워크 탭에서 `blocked:CORP` 오류가 사라짐
3. ✅ 이미지가 프론트엔드에서 정상적으로 표시됨
4. ✅ 이미지 크기 정보가 올바르게 출력됨 (예: 448 x 587)

### 로그 예시
```
✅ 이미지 로딩 성공: http://localhost:3000/uploads/products/P001/001.png
이미지 크기: 448 x 587
표시 크기: 40 x 40
```

## 참고 사항

### 보안 고려사항
- `cross-origin` 정책은 개발 환경에서는 안전하지만, 프로덕션 환경에서는 신중하게 고려해야 함
- 프로덕션에서는 CDN 사용 또는 동일 도메인에서 서빙을 고려할 수 있음
- 또는 특정 origin만 허용하도록 설정 가능:
  ```typescript
  app.use(helmet({
    crossOriginResourcePolicy: { 
      policy: "cross-origin",
      allowOrigins: ["https://yourdomain.com"]
    }
  }));
  ```

### 관련 헤더
- `Cross-Origin-Resource-Policy`: 리소스 로드 정책
- `Access-Control-Allow-Origin`: CORS 정책 (cors 미들웨어에서 이미 설정됨)

## 발생 일시
- 2024년 12월 24일

## 관련 파일
- `server/src/index.ts`: Helmet 설정 수정 위치

