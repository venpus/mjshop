export interface ShopBuyerAddress {
  id?: number;
  address: string;
  recipientName: string;
  phoneNumber: string;
  sortOrder?: number;
}

export interface ShopBuyerListItem {
  id: number;
  companyName: string;
  kakaoId: string | null;
  businessRegistrationNumber: string | null;
  businessRegistrationImage: string | null;
  addresses: ShopBuyerAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopBuyer {
  id: number;
  companyName: string;
  kakaoId: string | null;
  businessRegistrationNumber: string | null;
  businessRegistrationImage: string | null;
  addresses: ShopBuyerAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopBuyerImageOptions {
  pendingFile?: File | null;
  removeExisting?: boolean;
}

export interface ShopBuyerFormData {
  companyName: string;
  kakaoId: string;
  businessRegistrationNumber: string;
  addresses: ShopBuyerAddress[];
}

export const MAX_BUYER_ADDRESSES = 10;

export function createEmptyAddress(): ShopBuyerAddress {
  return { address: '', recipientName: '', phoneNumber: '' };
}

export function createEmptyForm(): ShopBuyerFormData {
  return {
    companyName: '',
    kakaoId: '',
    businessRegistrationNumber: '',
    addresses: [createEmptyAddress()],
  };
}

export function buyerToForm(buyer: ShopBuyer): ShopBuyerFormData {
  return {
    companyName: buyer.companyName,
    kakaoId: buyer.kakaoId ?? '',
    businessRegistrationNumber: buyer.businessRegistrationNumber ?? '',
    addresses:
      buyer.addresses.length > 0
        ? buyer.addresses.map((a) => ({
            id: a.id,
            address: a.address,
            recipientName: a.recipientName,
            phoneNumber: a.phoneNumber,
          }))
        : [createEmptyAddress()],
  };
}
