export interface Material {
  id: number;
  date: string | Date;
  code: string;
  productName: string;
  productNameChinese: string;
  category: string;
  typeCount: number;
  link: string;
  purchaseComplete: boolean;
  images: string[];
  testImages: string[];
  price: number;
  currentStock: number;
}

export type TestImageReaction = 'like' | 'dislike' | null;

export interface TestImageConfirmation {
  confirmedBy: string;
  confirmedAt: string;
}

