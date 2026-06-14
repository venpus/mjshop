export interface ShopBuyerAddress {
  id?: number;
  address: string;
  recipientName: string;
  phoneNumber: string;
  sortOrder?: number;
}

export interface ShopBuyer {
  id: number;
  companyName: string;
  kakaoId: string | null;
  businessRegistrationNumber: string | null;
  businessRegistrationImage: string | null;
  addresses: ShopBuyerAddress[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface ShopBuyerListItem {
  id: number;
  companyName: string;
  kakaoId: string | null;
  businessRegistrationNumber: string | null;
  businessRegistrationImage: string | null;
  addresses: ShopBuyerAddress[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShopBuyerDTO {
  companyName: string;
  kakaoId?: string | null;
  businessRegistrationNumber?: string | null;
  addresses?: ShopBuyerAddress[];
  createdBy?: string;
}

export interface UpdateShopBuyerDTO {
  companyName?: string;
  kakaoId?: string | null;
  businessRegistrationNumber?: string | null;
  addresses?: ShopBuyerAddress[];
  updatedBy?: string;
}

export const MAX_BUYER_ADDRESSES = 10;
