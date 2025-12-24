import { Product } from "../types/product";

export const mockProducts: Product[] = [
  {
    id: "P001",
    name: "테디베어 봉제인형",
    category: "봉제",
    price: 89000,
    stock: 45,
    status: "판매중",
    size: "5x3x2 ",
    packagingSize: "10x8x6 ",
    weight: "50",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 100,
    mainImage:
      "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400",
    images: [
      "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400",
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
      "https://images.unsplash.com/photo-1517686748843-bb360cfc62b3?w=400",
    ],
    supplier: {
      name: "Supplier A",
      url: "https://www.suppliera.com",
    },
  },
  {
    id: "P002",
    name: "고양이 피규어",
    category: "피규어",
    price: 52000,
    stock: 30,
    status: "판매중",
    size: "8x6x4 ",
    packagingSize: "12x10x8 ",
    weight: "120",
    setCount: 1,
    smallPackCount: 12,
    boxCount: 144,
    mainImage:
      "https://images.unsplash.com/photo-1671490289892-502ca32a3a2a?w=400",
    images: [
      "https://images.unsplash.com/photo-1671490289892-502ca32a3a2a?w=400",
      "https://images.unsplash.com/photo-1635696860867-238c2fa072bb?w=400",
    ],
    supplier: {
      name: "Supplier B",
      url: "https://www.supplierb.com",
    },
  },
  {
    id: "P003",
    name: "토끼 인형 키링",
    category: "키링",
    price: 45000,
    stock: 0,
    status: "품절",
    size: "40x30x10 ",
    packagingSize: "45x35x15 ",
    weight: "800",
    setCount: 1,
    smallPackCount: 12,
    boxCount: 48,
    mainImage:
      "https://images.unsplash.com/photo-1727154085760-134cc942246e?w=400",
    images: [
      "https://images.unsplash.com/photo-1727154085760-134cc942246e?w=400",
      "https://images.unsplash.com/photo-1635696860867-238c2fa072bb?w=400",
    ],
    supplier: {
      name: "Supplier C",
      url: "https://www.supplierc.com",
    },
  },
];

// PO Number to Product ID mapping
export const poToProductMap: Record<string, string> = {
  "PO-001": "P001",
  "PO-002": "P002",
  "PO-003": "P003",
};
