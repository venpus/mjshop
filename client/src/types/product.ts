export interface Product {
  id: string;
  name: string;
  nameChinese?: string;
  category: string;
  price: number;
  stock: number;
  status: "판매중" | "품절" | "숨김";
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  mainImage: string;
  images: string[];
  supplier: {
    name: string;
    url: string;
  };
}
