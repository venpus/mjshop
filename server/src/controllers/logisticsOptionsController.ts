import { Request, Response } from 'express';
import { LogisticsOptionsService } from '../services/logisticsOptionsService.js';

export class LogisticsOptionsController {
  private service: LogisticsOptionsService;

  constructor() {
    this.service = new LogisticsOptionsService();
  }

  /**
   * 모든 내륙운송회사 조회
   * GET /api/logistics-options/inland-companies
   */
  getAllInlandCompanies = async (req: Request, res: Response): Promise<void> => {
    try {
      const companies = await this.service.getAllInlandCompanies();
      res.json(companies);
    } catch (error) {
      console.error('내륙운송회사 조회 오류:', error);
      res.status(500).json({ 
        error: '내륙운송회사 목록을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * 모든 도착 창고 조회
   * GET /api/logistics-options/warehouses
   */
  getAllWarehouses = async (req: Request, res: Response): Promise<void> => {
    try {
      const warehouses = await this.service.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error('도착 창고 조회 오류:', error);
      res.status(500).json({ 
        error: '도착 창고 목록을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };
}

