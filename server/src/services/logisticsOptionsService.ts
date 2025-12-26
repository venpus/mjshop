import { LogisticsOptionsRepository, InlandCompany, Warehouse } from '../repositories/logisticsOptionsRepository.js';

export class LogisticsOptionsService {
  private repository: LogisticsOptionsRepository;

  constructor() {
    this.repository = new LogisticsOptionsRepository();
  }

  /**
   * 모든 내륙운송회사 조회
   */
  async getAllInlandCompanies(): Promise<InlandCompany[]> {
    return await this.repository.findAllInlandCompanies();
  }

  /**
   * 모든 도착 창고 조회
   */
  async getAllWarehouses(): Promise<Warehouse[]> {
    return await this.repository.findAllWarehouses();
  }
}

