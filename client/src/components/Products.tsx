import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Image,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ProductForm, ProductFormData } from "./ProductForm";
import { ProductDetailModal } from "./ProductDetailModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface Product {
  id: string;
  name: string;
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
}

const initialProducts: Product[] = [
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
  },
  {
    id: "P002",
    name: "브라운 곰돌이 인형",
    category: "봉제",
    price: 320000,
    stock: 12,
    status: "판매중",
    size: "4.5x4.5x1.5 ",
    packagingSize: "12x10x8 ",
    weight: "120",
    setCount: 1,
    smallPackCount: 5,
    boxCount: 50,
    mainImage:
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
    images: [
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
      "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400",
    ],
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
  },
  {
    id: "P004",
    name: "판다 봉제인형",
    category: "봉제",
    price: 125000,
    stock: 28,
    status: "판매중",
    size: "15x8x8 ",
    packagingSize: "20x12x12 ",
    weight: "450",
    setCount: 1,
    smallPackCount: 8,
    boxCount: 64,
    mainImage:
      "https://images.unsplash.com/photo-1517686748843-bb360cfc62b3?w=400",
    images: [
      "https://images.unsplash.com/photo-1517686748843-bb360cfc62b3?w=400",
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
    ],
  },
  {
    id: "P005",
    name: "고양이 피규어",
    category: "피규어",
    price: 25000,
    stock: 156,
    status: "판매중",
    size: "16x8x1 ",
    packagingSize: "18x10x5 ",
    weight: "35",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 200,
    mainImage:
      "https://images.unsplash.com/photo-1671490289892-502ca32a3a2a?w=400",
    images: [
      "https://images.unsplash.com/photo-1671490289892-502ca32a3a2a?w=400",
    ],
  },
  {
    id: "P006",
    name: "강아지 미니 인형",
    category: "키링",
    price: 35000,
    stock: 67,
    status: "판매중",
    size: "10x10x1 ",
    packagingSize: "15x12x5 ",
    weight: "150",
    setCount: 1,
    smallPackCount: 15,
    boxCount: 120,
    mainImage:
      "https://images.unsplash.com/photo-1635696860867-238c2fa072bb?w=400",
    images: [
      "https://images.unsplash.com/photo-1635696860867-238c2fa072bb?w=400",
      "https://images.unsplash.com/photo-1727154085760-134cc942246e?w=400",
    ],
  },
  {
    id: "P007",
    name: "펭귄 봉제인형",
    category: "봉제",
    price: 280000,
    stock: 8,
    status: "판매중",
    size: "60x20x20 ",
    packagingSize: "65x25x25 ",
    weight: "5",
    setCount: 1,
    smallPackCount: 2,
    boxCount: 10,
    mainImage:
      "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400",
    images: [
      "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400",
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
      "https://images.unsplash.com/photo-1517686748843-bb360cfc62b3?w=400",
    ],
  },
  {
    id: "P008",
    name: "사슴 인형",
    category: "봉제",
    price: 42000,
    stock: 34,
    status: "판매중",
    size: "180x60x1 ",
    packagingSize: "185x65x10 ",
    weight: "1.2g",
    setCount: 1,
    smallPackCount: 6,
    boxCount: 36,
    mainImage:
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
    images: [
      "https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400",
      "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400",
    ],
  },

  // ==================== DUMMY DATA START (실제 개발시 아래 데이터 삭제) ====================
  {
    id: "P009",
    name: "여우 봉제인형",
    category: "봉제",
    price: 55000,
    stock: 42,
    status: "판매중",
    size: "30x25x5 ",
    packagingSize: "35x30x10 ",
    weight: "600",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 80,
    mainImage: "fox.jpg",
    images: ["fox.jpg"],
  },
  {
    id: "P010",
    name: "다람쥐 키링",
    category: "키링",
    price: 48000,
    stock: 88,
    status: "판매중",
    size: "12x5x2 ",
    packagingSize: "15x8x6 ",
    weight: "120",
    setCount: 1,
    smallPackCount: 15,
    boxCount: 150,
    mainImage: "squirrelkeyring.jpg",
    images: ["squirrelkeyring.jpg"],
  },
  {
    id: "P011",
    name: "코끼리 봉제인형",
    category: "봉제",
    price: 125000,
    stock: 23,
    status: "판매중",
    size: "45x15x3 ",
    packagingSize: "50x20x8 ",
    weight: "850",
    setCount: 1,
    smallPackCount: 8,
    boxCount: 48,
    mainImage: "elephant.jpg",
    images: ["elephant.jpg"],
  },
  {
    id: "P012",
    name: "햄스터 피규어",
    category: "피규어",
    price: 18000,
    stock: 156,
    status: "판매중",
    size: "35x25x0.5 ",
    packagingSize: "40x30x5 ",
    weight: "200",
    setCount: 1,
    smallPackCount: 25,
    boxCount: 200,
    mainImage: "hamsterfigure.jpg",
    images: ["hamsterfigure.jpg"],
  },
  {
    id: "P013",
    name: "원숭이 인형",
    category: "봉제",
    price: 89000,
    stock: 15,
    status: "판매중",
    size: "8x8x6 ",
    packagingSize: "12x10x8 ",
    weight: "180",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 60,
    mainImage: "monkey.jpg",
    images: ["monkey.jpg"],
  },
  {
    id: "P014",
    name: "양 봉제인형",
    category: "봉제",
    price: 68000,
    stock: 31,
    status: "판매중",
    size: "20x20x45 ",
    packagingSize: "25x25x50 ",
    weight: "1.5",
    setCount: 1,
    smallPackCount: 6,
    boxCount: 36,
    mainImage: "sheep.jpg",
    images: ["sheep.jpg"],
  },
  {
    id: "P015",
    name: "돼지 미니 인형",
    category: "키링",
    price: 22000,
    stock: 94,
    status: "판매중",
    size: "15x10x5 ",
    packagingSize: "18x12x8 ",
    weight: "250",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 120,
    mainImage: "pigmini.jpg",
    images: ["pigmini.jpg"],
  },
  {
    id: "P016",
    name: "기린 봉제인형",
    category: "봉제",
    price: 78000,
    stock: 18,
    status: "판매중",
    size: "20x20x30 ",
    packagingSize: "25x25x35 ",
    weight: "2",
    setCount: 1,
    smallPackCount: 8,
    boxCount: 32,
    mainImage: "giraffe.jpg",
    images: ["giraffe.jpg"],
  },
  {
    id: "P017",
    name: "공룡 피규어 세트",
    category: "피규어",
    price: 350000,
    stock: 7,
    status: "판매중",
    size: "40x40x60 ",
    packagingSize: "45x45x65 ",
    weight: "8",
    setCount: 1,
    smallPackCount: 2,
    boxCount: 12,
    mainImage: "dinosaurset.jpg",
    images: ["dinosaurset.jpg"],
  },
  {
    id: "P018",
    name: "사자 봉제인형",
    category: "봉제",
    price: 45000,
    stock: 52,
    status: "판매중",
    size: "22x18x25 ",
    packagingSize: "28x22x30 ",
    weight: "1.2",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 60,
    mainImage: "lion.jpg",
    images: ["lion.jpg"],
  },
  {
    id: "P019",
    name: "호랑이 인형",
    category: "봉제",
    price: 28000,
    stock: 145,
    status: "판매중",
    size: "8x8x20 ",
    packagingSize: "12x10x25 ",
    weight: "350",
    setCount: 1,
    smallPackCount: 15,
    boxCount: 120,
    mainImage: "tiger.jpg",
    images: ["tiger.jpg"],
  },
  {
    id: "P020",
    name: "늑대 키링",
    category: "키링",
    price: 15000,
    stock: 88,
    status: "판매중",
    size: "20x15x8 ",
    packagingSize: "25x18x12 ",
    weight: "400",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 160,
    mainImage: "wolfkeyring.jpg",
    images: ["wolfkeyring.jpg"],
  },
  {
    id: "P021",
    name: "유니콘 봉제인형",
    category: "봉제",
    price: 95000,
    stock: 24,
    status: "판매중",
    size: "35x25x5 ",
    packagingSize: "40x30x10 ",
    weight: "1.8",
    setCount: 5,
    smallPackCount: 6,
    boxCount: 36,
    mainImage: "unicorn.jpg",
    images: ["unicorn.jpg"],
  },
  {
    id: "P022",
    name: "드래곤 피규어",
    category: "피규어",
    price: 125000,
    stock: 16,
    status: "판매중",
    size: "32x32x15 ",
    packagingSize: "38x38x20 ",
    weight: "3",
    setCount: 3,
    smallPackCount: 4,
    boxCount: 24,
    mainImage: "dragonfigure.jpg",
    images: ["dragonfigure.jpg"],
  },
  {
    id: "P023",
    name: "악어 봉제인형",
    category: "봉제",
    price: 88000,
    stock: 29,
    status: "판매중",
    size: "18x18x38 ",
    packagingSize: "22x22x42 ",
    weight: "2.5",
    setCount: 1,
    smallPackCount: 8,
    boxCount: 48,
    mainImage: "crocodile.jpg",
    images: ["crocodile.jpg"],
  },
  {
    id: "P024",
    name: "거북이 인형",
    category: "봉제",
    price: 95000,
    stock: 76,
    status: "판매중",
    size: "32x22x12 ",
    packagingSize: "36x26x16 ",
    weight: "600",
    setCount: 1,
    smallPackCount: 12,
    boxCount: 72,
    mainImage: "turtle.jpg",
    images: ["turtle.jpg"],
  },
  {
    id: "P025",
    name: "물개 봉제인형",
    category: "봉제",
    price: 68000,
    stock: 43,
    status: "판매중",
    size: "45x30x15 ",
    packagingSize: "50x35x20 ",
    weight: "900",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 50,
    mainImage: "whale.jpg",
    images: ["whale.jpg"],
  },
  {
    id: "P026",
    name: "돌고래 피규어",
    category: "피규어",
    price: 55000,
    stock: 64,
    status: "판매중",
    size: "18x8x5 ",
    packagingSize: "22x12x8 ",
    weight: "80",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 160,
    mainImage: "dolphinfigure.jpg",
    images: ["dolphinfigure.jpg"],
  },
  {
    id: "P027",
    name: "상어 인형",
    category: "봉제",
    price: 42000,
    stock: 91,
    status: "판매중",
    size: "12x10x2 ",
    packagingSize: "15x12x6 ",
    weight: "150",
    setCount: 1,
    smallPackCount: 25,
    boxCount: 200,
    mainImage: "shark.jpg",
    images: ["shark.jpg"],
  },
  {
    id: "P028",
    name: "문어 봉제인형",
    category: "봉제",
    price: 38000,
    stock: 57,
    status: "판매중",
    size: "120x4x0.5 ",
    packagingSize: "125x10x5 ",
    weight: "200",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 120,
    mainImage: "octopus.jpg",
    images: ["octopus.jpg"],
  },
  {
    id: "P029",
    name: "오리 키링 세트",
    category: "키링",
    price: 48000,
    stock: 35,
    status: "판매중",
    size: "15x10x10 ",
    packagingSize: "18x12x12 ",
    weight: "500",
    setCount: 12,
    smallPackCount: 10,
    boxCount: 60,
    mainImage: "duckkeyringset.jpg",
    images: ["duckkeyringset.jpg"],
  },
  {
    id: "P030",
    name: "닭 인형",
    category: "봉제",
    price: 65000,
    stock: 22,
    status: "판매중",
    size: "65x10x5 ",
    packagingSize: "70x15x10 ",
    weight: "450",
    setCount: 2,
    smallPackCount: 8,
    boxCount: 48,
    mainImage: "chicken.jpg",
    images: ["chicken.jpg"],
  },
  {
    id: "P031",
    name: "앵무새 피규어",
    category: "피규어",
    price: 32000,
    stock: 78,
    status: "판매중",
    size: "18x8x6 ",
    packagingSize: "22x10x8 ",
    weight: "100",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 160,
    mainImage: "parrotfigure.jpg",
    images: ["parrotfigure.jpg"],
  },
  {
    id: "P032",
    name: "부엉이 봉제인형",
    category: "봉제",
    price: 88000,
    stock: 19,
    status: "판매중",
    size: "30x25x20 ",
    packagingSize: "35x30x25 ",
    weight: "380",
    setCount: 1,
    smallPackCount: 8,
    boxCount: 48,
    mainImage: "owl.jpg",
    images: ["owl.jpg"],
  },
  {
    id: "P033",
    name: "독수리 인형",
    category: "봉제",
    price: 115000,
    stock: 41,
    status: "판매중",
    size: "32x22x12 ",
    packagingSize: "38x26x16 ",
    weight: "550",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 60,
    mainImage: "eagle.jpg",
    images: ["eagle.jpg"],
  },
  {
    id: "P034",
    name: "백조 키링",
    category: "키링",
    price: 52000,
    stock: 28,
    status: "판매중",
    size: "28x18x5 ",
    packagingSize: "32x22x10 ",
    weight: "600",
    setCount: 2,
    smallPackCount: 12,
    boxCount: 72,
    mainImage: "swankeyring.jpg",
    images: ["swankeyring.jpg"],
  },
  {
    id: "P035",
    name: "캥거루 봉제인형",
    category: "봉제",
    price: 45000,
    stock: 33,
    status: "판매중",
    size: "25x25x25 ",
    packagingSize: "30x30x30 ",
    weight: "620",
    setCount: 1,
    smallPackCount: 10,
    boxCount: 60,
    mainImage: "kangaroo.jpg",
    images: ["kangaroo.jpg"],
  },
  {
    id: "P036",
    name: "코알라 인형",
    category: "봉제",
    price: 42000,
    stock: 46,
    status: "판매중",
    size: "23x23x23 ",
    packagingSize: "28x28x28 ",
    weight: "450",
    setCount: 1,
    smallPackCount: 12,
    boxCount: 72,
    mainImage: "koala.jpg",
    images: ["koala.jpg"],
  },
  {
    id: "P037",
    name: "하마 피규어",
    category: "피규어",
    price: 68000,
    stock: 25,
    status: "판매중",
    size: "68x22x5 ",
    packagingSize: "72x26x10 ",
    weight: "380",
    setCount: 2,
    smallPackCount: 10,
    boxCount: 60,
    mainImage: "camelfigure.jpg",
    images: ["camelfigure.jpg"],
  },
  {
    id: "P038",
    name: "얼룩말 봉제인형",
    category: "봉제",
    price: 125000,
    stock: 14,
    status: "판매중",
    size: "80x20x12 ",
    packagingSize: "85x25x18 ",
    weight: "2.5",
    setCount: 1,
    smallPackCount: 4,
    boxCount: 24,
    mainImage: "zebra.jpg",
    images: ["zebra.jpg"],
  },
  {
    id: "P039",
    name: "인형 보관함",
    category: "잡화",
    price: 18000,
    stock: 126,
    status: "판매중",
    size: "20x15x2 ",
    packagingSize: "22x18x6 ",
    weight: "150",
    setCount: 3,
    smallPackCount: 30,
    boxCount: 240,
    mainImage: "dollcase.jpg",
    images: ["dollcase.jpg"],
  },
  {
    id: "P040",
    name: "인형 옷 세트",
    category: "잡화",
    price: 95000,
    stock: 17,
    status: "판매중",
    size: "40x20x15 ",
    packagingSize: "45x25x20 ",
    weight: "10",
    setCount: 2,
    smallPackCount: 4,
    boxCount: 24,
    mainImage: "dollclotheset.jpg",
    images: ["dollclotheset.jpg"],
  },
  {
    id: "P041",
    name: "미니 곰 키링",
    category: "키링",
    price: 65000,
    stock: 62,
    status: "판매중",
    size: "8x6x3 ",
    packagingSize: "10x8x5 ",
    weight: "45",
    setCount: 1,
    smallPackCount: 15,
    boxCount: 120,
    mainImage: "minibearkeyring.jpg",
    images: ["minibearkeyring.jpg"],
  },
  {
    id: "P042",
    name: "인형 거치대",
    category: "잡화",
    price: 22000,
    stock: 98,
    status: "판매중",
    size: "12x8x15 ",
    packagingSize: "15x10x18 ",
    weight: "250",
    setCount: 1,
    smallPackCount: 20,
    boxCount: 160,
    mainImage: "dollstand.jpg",
    images: ["dollstand.jpg"],
  },
  {
    id: "P043",
    name: "카멜레온 피규어",
    category: "피규어",
    price: 58000,
    stock: 71,
    status: "판매중",
    size: "15x7x2 ",
    packagingSize: "18x10x6 ",
    weight: "320",
    setCount: 1,
    smallPackCount: 12,
    boxCount: 96,
    mainImage: "chameleonfigure.jpg",
    images: ["chameleonfigure.jpg"],
  },
  {
    id: "P044",
    name: "고슴도치 인형",
    category: "봉제",
    price: 18000,
    stock: 143,
    status: "판매중",
    size: "20x15x2 ",
    packagingSize: "25x18x6 ",
    weight: "180",
    setCount: 1,
    smallPackCount: 25,
    boxCount: 200,
    mainImage: "beaver.jpg",
    images: ["beaver.jpg"],
  },
  {
    id: "P045",
    name: "라쿤 봉제인형",
    category: "봉제",
    price: 450000,
    stock: 9,
    status: "판매중",
    size: "25x18x1 ",
    packagingSize: "30x22x6 ",
    weight: "580",
    setCount: 1,
    smallPackCount: 5,
    boxCount: 30,
    mainImage: "raccoon.jpg",
    images: ["raccoon.jpg"],
  },
  // ==================== DUMMY DATA END ====================
];

export function Products() {
  const [products, setProducts] =
    useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredProduct, setHoveredProduct] = useState<
    string | null
  >(null);
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [detailProduct, setDetailProduct] =
    useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] =
    useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] =
    useState(false);

  const filteredProducts = products.filter(
    (product) =>
      product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      product.category
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Pagination calculations
  const totalPages = Math.ceil(
    filteredProducts.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(
    startIndex,
    endIndex,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSaveProduct = (formData: ProductFormData) => {
    if (formMode === "edit" && editingProduct) {
      // Edit existing product
      setProducts(
        products.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                name: formData.name,
                category: formData.category,
                price: formData.price,
                size: formData.size,
                packagingSize: formData.packagingSize,
                weight: formData.weight,
                setCount: formData.setCount,
                smallPackCount: formData.smallPackCount,
                boxCount: formData.boxCount,
              }
            : product,
        ),
      );
      setEditingProduct(null);
    } else {
      // Create new product
      const newId = `P${String(products.length + 1).padStart(3, "0")}`;

      const newProduct: Product = {
        id: newId,
        name: formData.name,
        category: formData.category,
        price: formData.price,
        stock: 0,
        status: "판매중",
        size: formData.size,
        packagingSize: formData.packagingSize,
        weight: formData.weight,
        setCount: formData.setCount,
        smallPackCount: formData.smallPackCount,
        boxCount: formData.boxCount,
        mainImage: "default.jpg",
        images: ["default.jpg"],
      };

      setProducts([newProduct, ...products]);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteProduct) {
      setProducts(
        products.filter(
          (product) => product.id !== deleteProduct.id,
        ),
      );
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenCreateForm = () => {
    setEditingProduct(null);
    setFormMode("create");
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setFormMode("create");
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">상품 관리</h2>
        <p className="text-gray-600">
          등록된 상품을 관리하고 수정할 수 있습니다
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="상품명 또는 카테고리로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>상품 등록</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  상품 ID
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  사진
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  상품명
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  카테고리
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  단가
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  사이즈
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  포장 사이즈
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  제품 무게
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  세트 모델수
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  소포장 입수
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  한박스 입수
                </th>
                <th className="px-4 py-2 text-left text-gray-600 whitespace-nowrap">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-2 text-gray-900">
                    {product.id}
                  </td>
                  <td className="px-4 py-2">
                    <div
                      className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center cursor-pointer"
                      onMouseEnter={() =>
                        setHoveredProduct(product.id)
                      }
                      onMouseLeave={() =>
                        setHoveredProduct(null)
                      }
                      onMouseMove={handleMouseMove}
                    >
                      {product.mainImage ? (
                        <img
                          src={product.mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setDetailProduct(product)}
                      className="text-gray-900 text-left cursor-pointer"
                    >
                      {product.name}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-4 py-2 text-gray-900">
                    ¥{product.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.size}
                    {product.size ? "cm" : ""}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.packagingSize}
                    {product.packagingSize ? "cm" : ""}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.weight}
                    {product.weight ? "g" : ""}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.setCount}개
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.smallPackCount}개
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.boxCount}개
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          handleEditProduct(product)
                        }
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteProduct(product)
                        }
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">
              페이지당 표시:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) =>
                handleItemsPerPageChange(Number(e.target.value))
              }
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={15}>15개</option>
              <option value={20}>20개</option>
              <option value={25}>25개</option>
              <option value={30}>30개</option>
            </select>
            <span className="text-gray-600 text-sm ml-4">
              전체 {filteredProducts.length}개 중{" "}
              {startIndex + 1}-
              {Math.min(endIndex, filteredProducts.length)}개
              표시
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from(
                { length: totalPages },
                (_, i) => i + 1,
              ).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 &&
                    page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        currentPage === page
                          ? "bg-purple-600 text-white"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span
                      key={page}
                      className="px-2 text-gray-400"
                    >
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Overlay */}
      {hoveredProduct &&
        (() => {
          const product = products.find(
            (p) => p.id === hoveredProduct,
          );
          return (
            <div
              className="fixed w-64 h-64 bg-white border-2 border-gray-300 rounded-lg shadow-xl overflow-hidden flex items-center justify-center pointer-events-none z-50"
              style={{
                left: `${mousePosition.x + 20}px`,
                top: `${mousePosition.y + 20}px`,
              }}
            >
              {product?.mainImage ? (
                <img
                  src={product.mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image className="w-16 h-16 text-gray-400" />
              )}
            </div>
          );
        })()}

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductForm
          onClose={handleCloseForm}
          onSave={handleSaveProduct}
          mode={formMode}
          initialData={
            editingProduct
              ? {
                  name: editingProduct.name,
                  category: editingProduct.category,
                  price: editingProduct.price,
                  size: editingProduct.size,
                  packagingSize: editingProduct.packagingSize,
                  weight: editingProduct.weight,
                  setCount: editingProduct.setCount,
                  smallPackCount: editingProduct.smallPackCount,
                  boxCount: editingProduct.boxCount,
                }
              : undefined
          }
        />
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteProduct && (
        <DeleteConfirmDialog
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}