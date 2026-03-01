import { Request, Response } from 'express';
import { PermissionService } from '../services/permissionService.js';
import { PermissionSettingsDTO } from '../models/permission.js';
import { isCostInputAllowed } from '../config/costInputAllowedUsers.js';

export class PermissionController {
  private service: PermissionService;

  constructor() {
    this.service = new PermissionService();
  }

  /**
   * 모든 권한 설정 조회
   * GET /api/permissions
   */
  getAllPermissions = async (req: Request, res: Response) => {
    try {
      const permissions = await this.service.getAllPermissions();

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      console.error('권한 설정 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '권한 설정 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 권한 설정 저장 (일괄 저장)
   * PUT /api/permissions
   */
  savePermissions = async (req: Request, res: Response) => {
    try {
      const data: PermissionSettingsDTO = req.body;

      // 필수 필드 검증
      if (!data.settings || !Array.isArray(data.settings)) {
        return res.status(400).json({
          success: false,
          error: 'settings 배열이 필요합니다.',
        });
      }

      // 각 설정 항목 검증
      for (const setting of data.settings) {
        if (!setting.resource || !setting.level) {
          return res.status(400).json({
            success: false,
            error: '각 설정 항목에 resource와 level이 필요합니다.',
          });
        }

        if (typeof setting.can_read !== 'boolean' ||
            typeof setting.can_write !== 'boolean' ||
            typeof setting.can_delete !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'can_read, can_write, can_delete는 boolean 값이어야 합니다.',
          });
        }
      }

      await this.service.savePermissions(data);

      res.json({
        success: true,
        message: '권한 설정이 저장되었습니다.',
      });
    } catch (error: any) {
      console.error('권한 설정 저장 오류:', error);

      res.status(500).json({
        success: false,
        error: error.message || '권한 설정 저장 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 발주 상세 비용 입력 가능 여부 (사용자 ID 기준)
   * GET /api/permissions/can-edit-purchase-order-cost
   */
  getCanEditPurchaseOrderCost = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string | undefined;
      const allowed = isCostInputAllowed(userId);

      res.json({
        success: true,
        data: { allowed },
      });
    } catch (error) {
      console.error('비용 입력 권한 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '비용 입력 권한 조회 중 오류가 발생했습니다.',
      });
    }
  };
}

