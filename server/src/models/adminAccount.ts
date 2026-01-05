// 관리자 계정 타입 정의

export type AdminLevel = 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';

export interface AdminAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: AdminLevel;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

// 클라이언트에 전달할 때 비밀번호 제외
export interface AdminAccountPublic {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: AdminLevel;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// 계정 생성 시 사용하는 DTO
export interface CreateAdminAccountDTO {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  level?: AdminLevel; // 가입 신청 시 선택적
  created_by?: string;
}

// 계정 수정 시 사용하는 DTO
export interface UpdateAdminAccountDTO {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  level?: AdminLevel;
  is_active?: boolean;
  updated_by?: string;
}

