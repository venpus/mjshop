import { Request, Response } from 'express';
import { AdminAccountService } from '../services/adminAccountService.js';
import {
  CreateAdminAccountDTO,
  UpdateAdminAccountDTO,
} from '../models/adminAccount.js';

export class AdminAccountController {
  private service: AdminAccountService;

  constructor() {
    this.service = new AdminAccountService();
  }

  /**
   * 모든 관리자 계정 조회
   * GET /api/admin-accounts
   */
  getAllAccounts = async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.search as string | undefined;
      
      let accounts;
      if (searchTerm) {
        accounts = await this.service.searchAccounts(searchTerm);
      } else {
        accounts = await this.service.getAllAccounts();
      }

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      console.error('관리자 계정 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '관리자 계정 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * ID로 관리자 계정 조회
   * GET /api/admin-accounts/:id
   */
  getAccountById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.service.getAccountById(id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: '관리자 계정을 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      console.error('관리자 계정 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '관리자 계정 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 새 관리자 계정 생성
   * POST /api/admin-accounts
   */
  createAccount = async (req: Request, res: Response) => {
    try {
      const data: CreateAdminAccountDTO = req.body;

      // 필수 필드 검증
      if (!data.id || !data.name || !data.phone || !data.email || !data.password) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (id, name, phone, email, password)',
        });
      }

      // 전화번호 형식 검증 (xxx-xxxx-xxxx 또는 xxxxxxxxxxx 형식 허용)
      const phonePattern = /^(\d{3}-\d{4}-\d{4}|\d{11})$/;
      if (!phonePattern.test(data.phone)) {
        return res.status(400).json({
          success: false,
          error: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678 또는 01012345678)',
        });
      }

      // 이메일 형식 검증
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 형식이 아닙니다.',
        });
      }

      // TODO: 현재 로그인한 사용자 정보 가져오기 (인증 미들웨어 필요)
      const createdBy = (req as any).user?.id;

      const account = await this.service.createAccount(data, createdBy);

      res.status(201).json({
        success: true,
        data: account,
        message: '관리자 계정이 생성되었습니다.',
      });
    } catch (error: any) {
      console.error('관리자 계정 생성 오류:', error);
      
      if (error.message.includes('이미 사용 중')) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: '관리자 계정 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 관리자 계정 수정
   * PUT /api/admin-accounts/:id
   */
  updateAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateAdminAccountDTO = req.body;

      // 전화번호 형식 검증 (제공된 경우, xxx-xxxx-xxxx 또는 xxxxxxxxxxx 형식 허용)
      if (data.phone) {
        const phonePattern = /^(\d{3}-\d{4}-\d{4}|\d{11})$/;
        if (!phonePattern.test(data.phone)) {
          return res.status(400).json({
            success: false,
            error: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678 또는 01012345678)',
          });
        }
      }

      // 이메일 형식 검증 (제공된 경우)
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 형식이 아닙니다.',
        });
      }

      // TODO: 현재 로그인한 사용자 정보 가져오기 (인증 미들웨어 필요)
      const updatedBy = (req as any).user?.id;

      const account = await this.service.updateAccount(id, data, updatedBy);

      res.json({
        success: true,
        data: account,
        message: '관리자 계정이 수정되었습니다.',
      });
    } catch (error: any) {
      console.error('관리자 계정 수정 오류:', error);

      if (error.message.includes('찾을 수 없습니다') || error.message.includes('이미 사용 중')) {
        return res.status(error.message.includes('찾을 수 없습니다') ? 404 : 409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: '관리자 계정 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 관리자 가입 신청
   * POST /api/admin-accounts/signup
   */
  signup = async (req: Request, res: Response) => {
    try {
      const data: CreateAdminAccountDTO = req.body;

      // 필수 필드 검증
      if (!data.id || !data.name || !data.phone || !data.email || !data.password) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (id, name, phone, email, password)',
        });
      }

      // 전화번호 형식 검증 (xxx-xxxx-xxxx 또는 xxxxxxxxxxx 형식 허용)
      const phonePattern = /^(\d{3}-\d{4}-\d{4}|\d{11})$/;
      if (!phonePattern.test(data.phone)) {
        return res.status(400).json({
          success: false,
          error: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678 또는 01012345678)',
        });
      }

      // 이메일 형식 검증
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 형식이 아닙니다.',
        });
      }

      // 비밀번호 최소 길이 검증
      if (data.password.length < 6) {
        return res.status(400).json({
          success: false,
          error: '비밀번호는 6자 이상이어야 합니다.',
        });
      }

      // 가입 신청 생성 (승인 대기 상태)
      await this.service.signupRequest(data);

      res.status(201).json({
        success: true,
        message: '가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
      });
    } catch (error: any) {
      console.error('가입 신청 오류:', error);
      
      if (error.message.includes('이미 사용 중')) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: '가입 신청 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 관리자 로그인
   * POST /api/admin-accounts/login
   */
  login = async (req: Request, res: Response) => {
    try {
      const { id, password } = req.body;

      // 필수 필드 검증
      if (!id || !password) {
        return res.status(400).json({
          success: false,
          error: 'ID와 비밀번호를 입력해주세요.',
        });
      }

      const account = await this.service.login(id, password);

      res.json({
        success: true,
        data: account,
        message: '로그인에 성공했습니다.',
      });
    } catch (error: any) {
      console.error('로그인 오류:', error);
      
      // 보안을 위해 구체적인 오류 메시지 제공
      const errorMessage = error.message || '로그인에 실패했습니다.';
      
      res.status(401).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  /**
   * 관리자 계정 삭제
   * DELETE /api/admin-accounts/:id
   */
  deleteAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const deleted = await this.service.deleteAccount(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: '관리자 계정을 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        message: '관리자 계정이 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('관리자 계정 삭제 오류:', error);

      if (error.message.includes('찾을 수 없습니다')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: '관리자 계정 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}

