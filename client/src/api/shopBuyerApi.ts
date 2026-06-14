import { getApiBaseUrl } from './baseUrl';
import { getFullImageUrl } from './purchaseOrderApi';
import type {
  ShopBuyer,
  ShopBuyerFormData,
  ShopBuyerListItem,
} from '../components/buyers/types';

const API_BASE_URL = getApiBaseUrl();

function mapAddress(item: Record<string, unknown>, index: number) {
  return {
    id: item.id != null ? Number(item.id) : undefined,
    address: String(item.address ?? ''),
    recipientName: String(item.recipientName ?? ''),
    phoneNumber: String(item.phoneNumber ?? ''),
    sortOrder: item.sortOrder != null ? Number(item.sortOrder) : index,
  };
}

function mapListItem(raw: Record<string, unknown>): ShopBuyerListItem {
  const addresses = Array.isArray(raw.addresses)
    ? raw.addresses.map((item: Record<string, unknown>, index: number) => mapAddress(item, index))
    : [];

  return {
    id: Number(raw.id),
    companyName: String(raw.companyName),
    kakaoId: raw.kakaoId != null ? String(raw.kakaoId) : null,
    businessRegistrationNumber:
      raw.businessRegistrationNumber != null ? String(raw.businessRegistrationNumber) : null,
    businessRegistrationImage:
      raw.businessRegistrationImage != null ? String(raw.businessRegistrationImage) : null,
    addresses,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

function mapBuyer(raw: Record<string, unknown>): ShopBuyer {
  const addresses = Array.isArray(raw.addresses)
    ? raw.addresses.map((item: Record<string, unknown>, index: number) => mapAddress(item, index))
    : [];

  return {
    id: Number(raw.id),
    companyName: String(raw.companyName),
    kakaoId: raw.kakaoId != null ? String(raw.kakaoId) : null,
    businessRegistrationNumber:
      raw.businessRegistrationNumber != null ? String(raw.businessRegistrationNumber) : null,
    businessRegistrationImage:
      raw.businessRegistrationImage != null ? String(raw.businessRegistrationImage) : null,
    addresses,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

function toPayload(form: ShopBuyerFormData) {
  const filledAddresses = form.addresses.filter(
    (a) => a.address.trim() || a.recipientName.trim() || a.phoneNumber.trim()
  );

  return {
    companyName: form.companyName.trim(),
    kakaoId: form.kakaoId.trim() || null,
    businessRegistrationNumber: form.businessRegistrationNumber.trim() || null,
    addresses: filledAddresses.map((a) => ({
      address: a.address.trim(),
      recipientName: a.recipientName.trim(),
      phoneNumber: a.phoneNumber.trim(),
    })),
  };
}

export async function getShopBuyers(): Promise<ShopBuyerListItem[]> {
  const response = await fetch(`${API_BASE_URL}/shop-buyers`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '구매자 목록을 불러오지 못했습니다.');
  }
  const data = await response.json();
  return (data.data as Record<string, unknown>[]).map(mapListItem);
}

export async function getShopBuyerById(id: number): Promise<ShopBuyer> {
  const response = await fetch(`${API_BASE_URL}/shop-buyers/${id}`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '구매자 정보를 불러오지 못했습니다.');
  }
  const data = await response.json();
  return mapBuyer(data.data);
}

export async function createShopBuyer(form: ShopBuyerFormData): Promise<ShopBuyer> {
  const response = await fetch(`${API_BASE_URL}/shop-buyers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(toPayload(form)),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '구매자 등록에 실패했습니다.');
  }
  return mapBuyer(data.data);
}

export async function updateShopBuyer(id: number, form: ShopBuyerFormData): Promise<ShopBuyer> {
  const response = await fetch(`${API_BASE_URL}/shop-buyers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(toPayload(form)),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '구매자 수정에 실패했습니다.');
  }
  return mapBuyer(data.data);
}

export async function deleteShopBuyer(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-buyers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '구매자 삭제에 실패했습니다.');
  }
}

export async function uploadShopBuyerBusinessRegistrationImage(
  id: number,
  file: File
): Promise<ShopBuyer> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/shop-buyers/${id}/business-registration-image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '사업자등록증 이미지 업로드에 실패했습니다.');
  }
  return mapBuyer(data.data);
}

export async function deleteShopBuyerBusinessRegistrationImage(id: number): Promise<ShopBuyer> {
  const response = await fetch(`${API_BASE_URL}/shop-buyers/${id}/business-registration-image`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '사업자등록증 이미지 삭제에 실패했습니다.');
  }
  return mapBuyer(data.data);
}

export { getFullImageUrl as getShopBuyerImageUrl };
