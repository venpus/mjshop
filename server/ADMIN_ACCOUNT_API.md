# 관리자 계정 관리 API 문서

## 개요

관리자 계정의 CRUD 작업을 처리하는 RESTful API입니다.

**Base URL**: `/api/admin-accounts`

## API 엔드포인트

### 1. 모든 관리자 계정 조회

**GET** `/api/admin-accounts`

쿼리 파라미터:
- `search` (optional): 검색어 (ID, 이름, 이메일, 연락처로 검색)

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": "admin001",
      "name": "홍길동",
      "phone": "010-1234-5678",
      "email": "admin001@example.com",
      "level": "A-SuperAdmin",
      "is_active": true,
      "last_login_at": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. 특정 관리자 계정 조회

**GET** `/api/admin-accounts/:id`

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "admin001",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "email": "admin001@example.com",
    "level": "A-SuperAdmin",
    "is_active": true,
    "last_login_at": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. 관리자 계정 생성

**POST** `/api/admin-accounts`

**요청 본문:**
```json
{
  "id": "admin006",
  "name": "김새계정",
  "phone": "010-9876-5432",
  "email": "newadmin@example.com",
  "password": "securePassword123!",
  "level": "C0: 한국Admin"
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "admin006",
    "name": "김새계정",
    "phone": "010-9876-5432",
    "email": "newadmin@example.com",
    "level": "C0: 한국Admin",
    "is_active": true,
    "last_login_at": null,
    "created_at": "2024-01-15T00:00:00.000Z",
    "updated_at": "2024-01-15T00:00:00.000Z"
  },
  "message": "관리자 계정이 생성되었습니다."
}
```

### 4. 관리자 계정 수정

**PUT** `/api/admin-accounts/:id`

**요청 본문:** (수정할 필드만 포함)
```json
{
  "name": "수정된이름",
  "phone": "010-1111-2222",
  "email": "updated@example.com",
  "level": "B0: 중국Admin",
  "is_active": true,
  "password": "newPassword123!"
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "admin001",
    "name": "수정된이름",
    "phone": "010-1111-2222",
    "email": "updated@example.com",
    "level": "B0: 중국Admin",
    "is_active": true,
    "last_login_at": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T01:00:00.000Z"
  },
  "message": "관리자 계정이 수정되었습니다."
}
```

### 5. 관리자 계정 삭제

**DELETE** `/api/admin-accounts/:id`

**응답 예시:**
```json
{
  "success": true,
  "message": "관리자 계정이 삭제되었습니다."
}
```

## 에러 응답

### 400 Bad Request
```json
{
  "success": false,
  "error": "필수 필드가 누락되었습니다."
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "관리자 계정을 찾을 수 없습니다."
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "이미 사용 중인 ID입니다."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "관리자 계정 생성 중 오류가 발생했습니다."
}
```

## 권한 레벨 (level)

- `A-SuperAdmin`: 최고 관리자
- `B0: 중국Admin`: 중국 관리자
- `C0: 한국Admin`: 한국 관리자

## 유효성 검사 규칙

1. **ID**: 필수, 수정 불가
2. **이름**: 필수
3. **연락처**: 필수, 형식 `010-XXXX-XXXX`
4. **이메일**: 필수, 유효한 이메일 형식, 중복 불가
5. **비밀번호**: 생성 시 필수, 수정 시 선택, 최소 8자 이상 권장

