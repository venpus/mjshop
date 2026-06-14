import { ShopBuyerRepository } from '../repositories/shopBuyerRepository.js';
import {
  ShopBuyer,
  ShopBuyerListItem,
  ShopBuyerAddress,
  CreateShopBuyerDTO,
  UpdateShopBuyerDTO,
  MAX_BUYER_ADDRESSES,
} from '../models/shopBuyer.js';
import {
  deleteShopBuyerBusinessRegistrationImage,
  deleteShopBuyerImageDir,
  getShopBuyerImageUrl,
  saveShopBuyerBusinessRegistrationImage,
} from '../utils/upload.js';

function validateAddresses(addresses: ShopBuyerAddress[]): void {
  if (addresses.length > MAX_BUYER_ADDRESSES) {
    throw new Error(`택배 주소지는 최대 ${MAX_BUYER_ADDRESSES}개까지 등록할 수 있습니다.`);
  }

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    if (!addr.address?.trim()) {
      throw new Error(`${i + 1}번째 주소지를 입력해 주세요.`);
    }
    if (!addr.recipientName?.trim()) {
      throw new Error(`${i + 1}번째 수령인을 입력해 주세요.`);
    }
    if (!addr.phoneNumber?.trim()) {
      throw new Error(`${i + 1}번째 전화번호를 입력해 주세요.`);
    }
  }
}

export class ShopBuyerService {
  private repository: ShopBuyerRepository;

  constructor() {
    this.repository = new ShopBuyerRepository();
  }

  async getAllBuyers(): Promise<ShopBuyerListItem[]> {
    return this.repository.findAllList();
  }

  async getBuyerById(id: number): Promise<ShopBuyer | null> {
    return this.repository.findById(id);
  }

  async createBuyer(data: CreateShopBuyerDTO): Promise<ShopBuyer> {
    if (!data.companyName?.trim()) {
      throw new Error('상호명은 필수입니다.');
    }

    const addresses = data.addresses ?? [];
    validateAddresses(addresses);

    return this.repository.create({
      ...data,
      companyName: data.companyName.trim(),
      addresses,
    });
  }

  async updateBuyer(id: number, data: UpdateShopBuyerDTO): Promise<ShopBuyer> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('구매자를 찾을 수 없습니다.');
    }

    if (data.companyName !== undefined && !data.companyName.trim()) {
      throw new Error('상호명은 필수입니다.');
    }

    if (data.addresses !== undefined) {
      validateAddresses(data.addresses);
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error('구매자 수정에 실패했습니다.');
    }
    return updated;
  }

  async deleteBuyer(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('구매자를 찾을 수 없습니다.');
    }

    await deleteShopBuyerImageDir(id);
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('구매자를 찾을 수 없습니다.');
    }
  }

  async uploadBusinessRegistrationImage(id: number, tempFilePath: string): Promise<ShopBuyer> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('구매자를 찾을 수 없습니다.');
    }

    if (existing.businessRegistrationImage) {
      await deleteShopBuyerBusinessRegistrationImage(id);
    }

    const relativePath = await saveShopBuyerBusinessRegistrationImage(tempFilePath, id);
    const imageUrl = getShopBuyerImageUrl(relativePath);
    const updated = await this.repository.updateBusinessRegistrationImage(id, imageUrl);
    if (!updated) {
      throw new Error('사업자등록증 이미지 저장에 실패했습니다.');
    }
    return updated;
  }

  async removeBusinessRegistrationImage(id: number): Promise<ShopBuyer> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('구매자를 찾을 수 없습니다.');
    }

    await deleteShopBuyerBusinessRegistrationImage(id);
    const updated = await this.repository.updateBusinessRegistrationImage(id, null);
    if (!updated) {
      throw new Error('사업자등록증 이미지 삭제에 실패했습니다.');
    }
    return updated;
  }
}
