import { ShopOrderRepository } from '../repositories/shopOrderRepository.js';
import { ShopShipmentRepository } from '../repositories/shopShipmentRepository.js';
import {
  CreateShopShipmentBatchDTO,
  ShopShipmentBatchListItem,
  ShopShipmentListRow,
  UpdateShopShipmentDTO,
  UpdateShopShipmentBatchDTO,
} from '../models/shopShipment.js';
import { assertSameDeliveryTargets } from '../utils/shopShipmentDelivery.js';

export class ShopShipmentService {
  private repository = new ShopShipmentRepository();
  private orderRepository = new ShopOrderRepository();

  async listRows(): Promise<ShopShipmentListRow[]> {
    return this.repository.listRows();
  }

  async listBatches(): Promise<ShopShipmentBatchListItem[]> {
    return this.repository.listBatches();
  }

  async listAssignedLineIds(): Promise<string[]> {
    return this.repository.listAssignedLineIds();
  }

  async createBatch(data: CreateShopShipmentBatchDTO): Promise<{ batchId: string }> {
    if (!data.shipmentDate) {
      throw new Error('발송일을 입력해 주세요.');
    }
    if (!Array.isArray(data.shipments) || data.shipments.length === 0) {
      throw new Error('등록할 송장을 1개 이상 입력해 주세요.');
    }

    const assignedLineIds = new Set(await this.repository.listAssignedLineIds());
    const seenTracking = new Set<string>();
    const sharedLineItems = new Map<string, { shopOrderId: string; lineId: string }>();

    for (const shipment of data.shipments) {
      for (const item of shipment.lineItems) {
        sharedLineItems.set(item.lineId, item);
      }
    }

    if (sharedLineItems.size === 0) {
      throw new Error('포함할 주문건을 선택해 주세요.');
    }

    const deliveryTargets: Array<{ recipientName?: string | null; address?: string | null }> = [];

    for (const item of sharedLineItems.values()) {
      if (assignedLineIds.has(item.lineId)) {
        throw new Error('이미 다른 송장에 포함된 주문건이 있습니다.');
      }

      const order = await this.orderRepository.findById(item.shopOrderId);
      if (!order) {
        throw new Error('주문을 찾을 수 없습니다.');
      }
      const line = order.lines.find((row) => row.id === item.lineId);
      if (!line) {
        throw new Error('주문 건을 찾을 수 없습니다.');
      }

      deliveryTargets.push({
        recipientName: line.recipientName,
        address: line.address,
      });
    }
    assertSameDeliveryTargets(deliveryTargets);

    for (const shipment of data.shipments) {
      const trackingNumber = shipment.trackingNumber.replace(/\D/g, '').slice(0, 32);
      if (!trackingNumber) {
        throw new Error('송장번호를 입력해 주세요.');
      }
      if (seenTracking.has(trackingNumber)) {
        throw new Error(`중복된 송장번호입니다: ${trackingNumber}`);
      }
      seenTracking.add(trackingNumber);
    }

    return this.repository.createBatchWithShipments(data);
  }

  async updateShipment(shipmentId: string, data: UpdateShopShipmentDTO) {
    const shipment = await this.repository.findById(shipmentId);
    if (!shipment) {
      throw new Error('송장을 찾을 수 없습니다.');
    }
    return this.repository.updateShipment(shipmentId, data);
  }

  async updateBatch(batchId: string, data: UpdateShopShipmentBatchDTO) {
    await this.repository.updateBatch(batchId, data);
  }

  async deleteShipment(shipmentId: string): Promise<void> {
    const shipment = await this.repository.findById(shipmentId);
    if (!shipment) {
      throw new Error('송장을 찾을 수 없습니다.');
    }
    await this.repository.deleteShipment(shipmentId);
  }

  async deleteBatch(batchId: string): Promise<void> {
    await this.repository.deleteBatch(batchId);
  }
}
