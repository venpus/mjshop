import bcrypt from 'bcrypt';
import { AdminAccountRepository } from '../repositories/adminAccountRepository.js';
import {
  AdminAccount,
  AdminAccountPublic,
  CreateAdminAccountDTO,
  UpdateAdminAccountDTO,
} from '../models/adminAccount.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 10;

export class AdminAccountService {
  private repository: AdminAccountRepository;

  constructor() {
    this.repository = new AdminAccountRepository();
  }

  /**
   * 모든 관리자 계정 조회 (공개 정보만)
   */
  async getAllAccounts(): Promise<AdminAccountPublic[]> {
    const accounts = await this.repository.findAll();
    return accounts.map(this.toPublicAccount);
  }

  /**
   * 검색어로 관리자 계정 검색
   */
  async searchAccounts(searchTerm: string): Promise<AdminAccountPublic[]> {
    if (!searchTerm.trim()) {
      return this.getAllAccounts();
    }

    const accounts = await this.repository.search(searchTerm.trim());
    return accounts.map(this.toPublicAccount);
  }

  /**
   * ID로 관리자 계정 조회
   */
  async getAccountById(id: string): Promise<AdminAccountPublic | null> {
    const account = await this.repository.findById(id);
    if (!account) {
      return null;
    }
    return this.toPublicAccount(account);
  }

  /**
   * 새 관리자 계정 생성
   */
  async createAccount(data: CreateAdminAccountDTO, createdBy?: string): Promise<AdminAccountPublic> {
    // ID 중복 확인
    const idExists = await this.repository.existsById(data.id);
    if (idExists) {
      throw new Error('이미 사용 중인 ID입니다.');
    }

    // 이메일 중복 확인
    const emailExists = await this.repository.existsByEmail(data.email);
    if (emailExists) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // level이 없으면 기본값 설정
    const accountData: CreateAdminAccountDTO = {
      ...data,
      level: data.level || 'C0: 한국Admin',
      created_by: createdBy,
    };

    // 계정 생성
    const account = await this.repository.create(accountData, passwordHash);

    return this.toPublicAccount(account);
  }

  /**
   * 관리자 가입 신청 (승인 대기 상태로 생성)
   */
  async signupRequest(data: CreateAdminAccountDTO): Promise<AdminAccountPublic> {
    // ID 중복 확인
    const idExists = await this.repository.existsById(data.id);
    if (idExists) {
      throw new Error('이미 사용 중인 ID입니다.');
    }

    // 이메일 중복 확인
    const emailExists = await this.repository.existsByEmail(data.email);
    if (emailExists) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // 가입 신청 시 기본 레벨 설정 (level이 없으면 'C0: 한국Admin'으로 설정)
    const signupData: CreateAdminAccountDTO = {
      ...data,
      level: data.level || 'C0: 한국Admin',
    };

    // 가입 신청 계정 생성 (is_active = false로 설정)
    const account = await this.repository.createSignupRequest(signupData, passwordHash);

    return this.toPublicAccount(account);
  }

  /**
   * 관리자 계정 수정
   */
  async updateAccount(
    id: string,
    data: UpdateAdminAccountDTO,
    updatedBy?: string
  ): Promise<AdminAccountPublic> {
    const existingAccount = await this.repository.findById(id);
    if (!existingAccount) {
      throw new Error('관리자 계정을 찾을 수 없습니다.');
    }

    // 이메일 변경 시 중복 확인
    if (data.email && data.email !== existingAccount.email) {
      const emailExists = await this.repository.existsByEmail(data.email, id);
      if (emailExists) {
        throw new Error('이미 사용 중인 이메일입니다.');
      }
    }

    // 비밀번호 변경이 있는 경우 해싱
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const updatedAccount = await this.repository.update(
      id,
      { ...data, updated_by: updatedBy },
      passwordHash
    );

    if (!updatedAccount) {
      throw new Error('계정 수정에 실패했습니다.');
    }

    return this.toPublicAccount(updatedAccount);
  }

  /**
   * 관리자 계정 삭제
   */
  async deleteAccount(id: string): Promise<boolean> {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new Error('관리자 계정을 찾을 수 없습니다.');
    }

    // SuperAdmin은 자기 자신 외 삭제 불가 (추가 보안 로직)
    // 필요시 여기에 추가

    return await this.repository.delete(id);
  }

  /**
   * 비밀번호 검증
   */
  async verifyPassword(id: string, password: string): Promise<boolean> {
    try {
      const passwordHash = await this.repository.findPasswordHashById(id);
      if (!passwordHash) {
        logger.warn('비밀번호 해시를 찾을 수 없음:', { id });
        return false;
      }

      const isValid = await bcrypt.compare(password, passwordHash);
      logger.debug('비밀번호 검증 결과:', { id, isValid });
      return isValid;
    } catch (error: any) {
      logger.error('비밀번호 검증 오류:', {
        error: error.message,
        stack: error.stack,
        id,
      });
      throw error;
    }
  }

  /**
   * 로그인 처리
   */
  async login(id: string, password: string): Promise<AdminAccountPublic> {
    try {
      logger.debug('로그인 서비스 시작:', { id });
      
      const account = await this.repository.findById(id);
      if (!account) {
        logger.warn('로그인 실패: 계정을 찾을 수 없음', { id });
        throw new Error('ID 또는 비밀번호가 올바르지 않습니다.');
      }

      if (!account.is_active) {
        logger.warn('로그인 실패: 비활성화된 계정', { id });
        throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.');
      }

      logger.debug('비밀번호 검증 시작:', { id });
      const isValid = await this.verifyPassword(id, password);
      if (!isValid) {
        logger.warn('로그인 실패: 비밀번호 불일치', { id });
        throw new Error('ID 또는 비밀번호가 올바르지 않습니다.');
      }

      logger.debug('비밀번호 검증 성공, 마지막 로그인 시간 업데이트:', { id });
      // 마지막 로그인 시간 업데이트
      await this.repository.updateLastLogin(id);

      logger.info('로그인 성공:', { id: account.id });
      return this.toPublicAccount(account);
    } catch (error: any) {
      logger.error('로그인 서비스 오류:', {
        error: error.message,
        stack: error.stack,
        id,
      });
      throw error;
    }
  }

  /**
   * AdminAccount를 공개용 객체로 변환 (비밀번호 제외)
   */
  private toPublicAccount(account: AdminAccount): AdminAccountPublic {
    return {
      id: account.id,
      name: account.name,
      phone: account.phone,
      email: account.email,
      level: account.level,
      is_active: account.is_active,
      last_login_at: account.last_login_at,
      created_at: account.created_at,
      updated_at: account.updated_at,
    };
  }
}

