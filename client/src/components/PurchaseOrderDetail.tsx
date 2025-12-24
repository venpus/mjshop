import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  User,
  DollarSign,
  Ruler,
  Weight,
  Box,
  Truck,
  Factory,
  Wrench,
  Edit,
  Image,
  Plus,
  Trash2,
  Download,
  X,
  Images,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ProductDetailModal } from "./ProductDetailModal";
import { FactoryShippingTab, type FactoryShipment, type ReturnExchangeItem } from "./tabs/FactoryShippingTab";
import { ProcessingPackagingTab, type WorkItem } from "./tabs/ProcessingPackagingTab";
import { CostPaymentTab, type LaborCostItem } from "./tabs/CostPaymentTab";
import { LogisticsDeliveryTab, type PackageInfo, type LogisticsInfo, type DeliverySet } from "./tabs/LogisticsDeliveryTab";
import { MemoSection, type Memo, type Reply } from "./MemoSection";
import { ProgressStatusSection } from "./ProgressStatusSection";
import { ProductInfoSection } from "./ProductInfoSection";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { ProductImageModal } from "./ProductImageModal";
import { FactoryImageModal } from "./FactoryImageModal";
import { GalleryImageModal } from "./GalleryImageModal";
import { LogisticsImageModal } from "./LogisticsImageModal";
import { ImagePreviewTooltip } from "./ImagePreviewTooltip";
import { DetailHeader } from "./DetailHeader";
import { mockProducts, poToProductMap } from "../data/mockProducts";
import { mockOrders } from "../data/mockOrders";
import type { Product } from "../types/product";
import type { PurchaseOrder } from "../types/purchaseOrder";

interface PurchaseOrderDetailProps {
  orderId: string;
  onBack: () => void;
  initialTab?: 'cost' | 'factory' | 'work' | 'delivery';
}

export function PurchaseOrderDetail({
  orderId,
  onBack,
  initialTab = 'cost',
}: PurchaseOrderDetailProps) {
  const order = mockOrders[orderId];

  // Editable cost state
  const [unitPrice, setUnitPrice] = useState(
    order?.unitPrice || 0,
  );
  const [quantity, setQuantity] = useState(
    order?.quantity || 0,
  );
  const [shippingCost, setShippingCost] = useState(150.0);
  const [warehouseShippingCost, setWarehouseShippingCost] =
    useState(80.0);
  const [commissionRate, setCommissionRate] = useState(5);
  const [commissionType, setCommissionType] =
    useState("5만위안 이상 재주문 5%");
  const [optionCost, setOptionCost] = useState(
    order?.optionCost || 0,
  );
  const [optionItems, setOptionItems] = useState<
    LaborCostItem[]
  >([
    {
      id: "1",
      name: "기본 옵션",
      cost: order?.optionCost || 0,
    },
  ]);
  const [laborCostItems, setLaborCostItems] = useState<
    LaborCostItem[]
  >([{ id: "1", name: "포장비", cost: 50.0 }]);
  const [orderDate, setOrderDate] = useState(order?.date || "");
  const [deliveryDate, setDeliveryDate] = useState(
    order?.estimatedDelivery || "",
  );

  // 이미지 모달 상태
  const [isImageModalOpen, setIsImageModalOpen] =
    useState(false);

  // 발주 컨펌 상태
  const [isOrderConfirmed, setIsOrderConfirmed] =
    useState(false);

  // 상품 상세 모달 상태
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  // 사진모아보기 모달 상태
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] =
    useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<string | null>(null);

  // 소포장 개수
  const [packaging, setPackaging] = useState(
    order?.packaging || 0,
  );

  // 선금/잔금 관리
  const [advancePaymentRate, setAdvancePaymentRate] =
    useState(50); // 선금 지불 % (기본 50%)
  const [advancePaymentDate, setAdvancePaymentDate] =
    useState(""); // 선금 지불일자
  const [balancePaymentDate, setBalancePaymentDate] =
    useState(""); // 잔금 지불일자

  // 메모 관리
  const [memos, setMemos] = useState<Memo[]>([
    {
      id: "1",
      content: order?.notes || "",
      userId: "admin",
      createdAt: new Date().toISOString(),
      replies: [],
    },
  ]);
  const [newMemoContent, setNewMemoContent] = useState("");
  const [replyInputs, setReplyInputs] = useState<
    Record<string, string>
  >({});
  const currentUserId = "admin"; // 실제로는 로그인한 사용자 ID

  // 탭 상태
  const [activeTab, setActiveTab] = useState<
    "cost" | "factory" | "work" | "delivery"
  >(initialTab || 'cost');

  // initialTab이 변경되면 activeTab 업데이트
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, orderId]);

  // 업체 출고 관련 상태
  const [factoryShipments, setFactoryShipments] = useState<
    FactoryShipment[]
  >([]);
  const [selectedFactoryImage, setSelectedFactoryImage] =
    useState<string | null>(null);

  // 반품/교환 관련 상태 (출고 항목과 동일한 구조)
  const [returnExchangeItems, setReturnExchangeItems] =
    useState<ReturnExchangeItem[]>([]);

  // 가공/포장 작업 관련 상태
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workStartDate, setWorkStartDate] =
    useState<string>("");
  const [workEndDate, setWorkEndDate] = useState<string>("");

  // 물류회사로 배송 관련 상태
  const [newPackingCode, setNewPackingCode] = useState<string>("");
  const [newPackingDate, setNewPackingDate] = useState<string>("");
  const [deliverySets, setDeliverySets] = useState<DeliverySet[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [hoveredImage, setHoveredImage] = useState<string>("");

  // 작업 완료 체크 처리
  const handleWorkItemComplete = (
    id: string,
    checked: boolean,
  ) => {
    const updatedItems = workItems.map((item) =>
      item.id === id ? { ...item, isCompleted: checked } : item,
    );
    setWorkItems(updatedItems);

    // 모든 작업이 완료되었는지 확인
    const allCompleted = updatedItems.every(
      (item) => item.isCompleted,
    );
    if (allCompleted && updatedItems.length > 0) {
      // 모든 작업이 완료되면 오늘 날짜로 작업완료일 자동 설정
      const today = new Date().toISOString().split("T")[0];
      setWorkEndDate(today);
    } else if (!allCompleted && workEndDate) {
      // 하나라도 체크 해제되면 작업완료일 초기화
      setWorkEndDate("");
    }
  };

  // 작업 상태 자동 계산
  const workStatus = workEndDate
    ? "완료"
    : workStartDate
      ? "작업중"
      : "작업대기";

  // 배송 세트 추가
  const addDeliverySet = () => {
    if (!newPackingCode || !newPackingDate) {
      alert("포장 코드와 날짜를 입력해주세요.");
      return;
    }

    const newSet: DeliverySet = {
      id: Date.now().toString(),
      packingCode: newPackingCode,
      date: newPackingDate,
      packageInfoList: [
        { id: "1", types: "", pieces: "", sets: "", total: "", method: "박스", weight: "" }
      ],
      logisticsInfoList: [
        { id: "1", trackingNumber: "", company: "", imageUrls: [] }
      ]
    };

    setDeliverySets([...deliverySets, newSet]);
    setNewPackingCode("");
    setNewPackingDate("");
  };

  // 배송 세트 삭제
  const removeDeliverySet = (setId: string) => {
    setDeliverySets(deliverySets.filter(s => s.id !== setId));
  };

  // 포장 정보 추가/삭제 함수
  const addPackageInfo = (setId: string) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId) {
        const newId = (Math.max(...set.packageInfoList.map(p => parseInt(p.id)), 0) + 1).toString();
        return {
          ...set,
          packageInfoList: [...set.packageInfoList, { 
            id: newId, 
            types: "", 
            pieces: "", 
            sets: "", 
            total: "", 
            method: "박스", 
            weight: "" 
          }]
        };
      }
      return set;
    }));
  };

  const removePackageInfo = (setId: string, pkgId: string) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId && set.packageInfoList.length > 1) {
        return {
          ...set,
          packageInfoList: set.packageInfoList.filter(p => p.id !== pkgId)
        };
      }
      return set;
    }));
  };

  const updatePackageInfo = (setId: string, pkgId: string, field: keyof PackageInfo, value: string) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          packageInfoList: set.packageInfoList.map(p => {
            if (p.id === pkgId) {
              const updated = { ...p, [field]: value };
              // 종, 개, 세트가 변경되면 합계 자동 계산
              const types = field === 'types' ? value : updated.types;
              const pieces = field === 'pieces' ? value : updated.pieces;
              const sets = field === 'sets' ? value : updated.sets;
              
              const typesNum = parseFloat(types) || 0;
              const piecesNum = parseFloat(pieces) || 0;
              const setsNum = parseFloat(sets) || 0;
              
              updated.total = (typesNum * piecesNum * setsNum).toString();
              
              return updated;
            }
            return p;
          })
        };
      }
      return set;
    }));
  };

  // 물류 정보 추가/삭제 함수
  const addLogisticsInfo = (setId: string) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId) {
        const newId = (Math.max(...set.logisticsInfoList.map(l => parseInt(l.id)), 0) + 1).toString();
        return {
          ...set,
          logisticsInfoList: [...set.logisticsInfoList, { 
            id: newId, 
            trackingNumber: "", 
            company: "", 
            imageUrls: [] 
          }]
        };
      }
      return set;
    }));
  };

  const removeLogisticsInfo = (setId: string, logId: string) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId && set.logisticsInfoList.length > 1) {
        return {
          ...set,
          logisticsInfoList: set.logisticsInfoList.filter(l => l.id !== logId)
        };
      }
      return set;
    }));
  };

  const updateLogisticsInfo = (setId: string, logId: string, field: keyof LogisticsInfo, value: string) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          logisticsInfoList: set.logisticsInfoList.map(l => 
            l.id === logId ? { ...l, [field]: value } : l
          )
        };
      }
      return set;
    }));
  };

  // 이미지 업로드 처리 (최대 10장)
  const handleImageUpload = (setId: string, logId: string, files: FileList) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          logisticsInfoList: set.logisticsInfoList.map(log => {
            if (log.id === logId) {
              const currentCount = log.imageUrls.length;
              const remainingSlots = 10 - currentCount;
              
              if (remainingSlots <= 0) {
                alert("최대 10장까지 업로드할 수 있습니다.");
                return log;
              }
              
              const filesToUpload = Array.from(files).slice(0, remainingSlots);
              
              filesToUpload.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const imageUrl = reader.result as string;
                  setDeliverySets(prev => prev.map(s => {
                    if (s.id === setId) {
                      return {
                        ...s,
                        logisticsInfoList: s.logisticsInfoList.map(l => 
                          l.id === logId 
                            ? { ...l, imageUrls: [...l.imageUrls, imageUrl] }
                            : l
                        )
                      };
                    }
                    return s;
                  }));
                };
                reader.readAsDataURL(file);
              });
            }
            return log;
          })
        };
      }
      return set;
    }));
  };

  // 이미지 삭제
  const removeLogisticsImage = (setId: string, logId: string, imageIndex: number) => {
    setDeliverySets(deliverySets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          logisticsInfoList: set.logisticsInfoList.map(log => 
            log.id === logId 
              ? { ...log, imageUrls: log.imageUrls.filter((_, idx) => idx !== imageIndex) }
              : log
          )
        };
      }
      return set;
    }));
  };

  // 이미지 확대 보기
  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  // 수수료 타입 옵션
  const commissionOptions = [
    { label: "5만위안 이상 재주문 5%", rate: 5 },
    { label: "5만위안 이하 재주문 7%", rate: 7 },
    { label: "5만위안 이상 신규주문 8%", rate: 8 },
    { label: "5만위안이하 신규주문 10%", rate: 10 },
  ];

  // 수수료 타입 변경 핸들러
  const handleCommissionTypeChange = (value: string) => {
    setCommissionType(value);
    const selected = commissionOptions.find(
      (opt) => opt.label === value,
    );
    if (selected) {
      setCommissionRate(selected.rate);
    }
  };

  // 인건비 항목 추가
  const addLaborCostItem = () => {
    const newItem: LaborCostItem = {
      id: Date.now().toString(),
      name: "",
      cost: 0,
    };
    setLaborCostItems([...laborCostItems, newItem]);
  };

  // 인건비 항목 삭제
  const removeLaborCostItem = (id: string) => {
    setLaborCostItems(
      laborCostItems.filter((item) => item.id !== id),
    );
  };

  // 인건비 항목명 수정
  const updateLaborCostItemName = (
    id: string,
    name: string,
  ) => {
    setLaborCostItems(
      laborCostItems.map((item) =>
        item.id === id ? { ...item, name } : item,
      ),
    );
  };

  // 인건비 비용 수정
  const updateLaborCostItemCost = (
    id: string,
    cost: number,
  ) => {
    setLaborCostItems(
      laborCostItems.map((item) =>
        item.id === id ? { ...item, cost } : item,
      ),
    );
  };

  // 옵션 항목 추가
  const addOptionItem = () => {
    const newItem: LaborCostItem = {
      id: Date.now().toString(),
      name: "",
      cost: 0,
    };
    setOptionItems([...optionItems, newItem]);
  };

  // 옵션 항목 삭제
  const removeOptionItem = (id: string) => {
    setOptionItems(
      optionItems.filter((item) => item.id !== id),
    );
  };

  // 옵션 항목명 수정
  const updateOptionItemName = (id: string, name: string) => {
    setOptionItems(
      optionItems.map((item) =>
        item.id === id ? { ...item, name } : item,
      ),
    );
  };

  // 옵션 비용 수정
  const updateOptionItemCost = (id: string, cost: number) => {
    setOptionItems(
      optionItems.map((item) =>
        item.id === id ? { ...item, cost } : item,
      ),
    );
  };

  // 메모 추가
  const addMemo = () => {
    if (!newMemoContent.trim()) return;

    const newMemo: Memo = {
      id: Date.now().toString(),
      content: newMemoContent,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setMemos([...memos, newMemo]);
    setNewMemoContent("");
  };

  // 메모 삭제
  const deleteMemo = (id: string) => {
    setMemos(memos.filter((memo) => memo.id !== id));
  };

  // 댓글 추가
  const addReply = (memoId: string) => {
    const replyContent = replyInputs[memoId];
    if (!replyContent || !replyContent.trim()) return;

    const newReply: Reply = {
      id: Date.now().toString(),
      content: replyContent,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    setMemos(
      memos.map((memo) =>
        memo.id === memoId
          ? { ...memo, replies: [...memo.replies, newReply] }
          : memo,
      ),
    );

    // 입력창 초기화
    setReplyInputs({ ...replyInputs, [memoId]: "" });
  };

  // 댓글 삭제
  const deleteReply = (memoId: string, replyId: string) => {
    setMemos(
      memos.map((memo) =>
        memo.id === memoId
          ? {
              ...memo,
              replies: memo.replies.filter(
                (reply) => reply.id !== replyId,
              ),
            }
          : memo,
      ),
    );
  };



  // 업체 출고 항목 추가
  const addFactoryShipment = () => {
    const newShipment: FactoryShipment = {
      id: Date.now().toString(),
      date: "",
      quantity: 0,
      trackingNumber: "",
      receiveDate: "",
      images: [],
    };
    setFactoryShipments([...factoryShipments, newShipment]);
  };

  // 업체 출고 항목 삭제
  const removeFactoryShipment = (id: string) => {
    setFactoryShipments(
      factoryShipments.filter((s) => s.id !== id),
    );
  };

  // 업체 출고 항목 업데이트
  const updateFactoryShipment = (
    id: string,
    field: keyof FactoryShipment,
    value: any,
  ) => {
    setFactoryShipments(
      factoryShipments.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    );
  };

  // 업체 출고 이미지 업로드 핸들러
  const handleFactoryImageUpload = (
    shipmentId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const shipment = factoryShipments.find(
      (s) => s.id === shipmentId,
    );
    if (!shipment) return;

    // 파���을 URL로 변환하여 미리보기
    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          updateFactoryShipment(shipmentId, "images", [
            ...shipment.images,
            ...newImages,
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 업체 출고 이미지 삭제
  const removeFactoryImage = (
    shipmentId: string,
    imageIndex: number,
  ) => {
    const shipment = factoryShipments.find(
      (s) => s.id === shipmentId,
    );
    if (!shipment) return;
    updateFactoryShipment(
      shipmentId,
      "images",
      shipment.images.filter((_, i) => i !== imageIndex),
    );
  };

  // 반품/교환 항목 추가
  const addReturnExchangeItem = () => {
    const newItem: ReturnExchangeItem = {
      id: Date.now().toString(),
      date: "",
      quantity: 0,
      trackingNumber: "",
      receiveDate: "",
      images: [],
    };
    setReturnExchangeItems([...returnExchangeItems, newItem]);
  };

  // 반품/교환 항목 삭제
  const removeReturnExchangeItem = (id: string) => {
    setReturnExchangeItems(
      returnExchangeItems.filter((item) => item.id !== id),
    );
  };

  // 반품/교환 항목 업데이트
  const updateReturnExchangeItem = (
    id: string,
    field: keyof ReturnExchangeItem,
    value: any,
  ) => {
    setReturnExchangeItems(
      returnExchangeItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  // 반품/교환 이미지 업로드 핸들러
  const handleReturnExchangeImageUpload = (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const item = returnExchangeItems.find(
      (i) => i.id === itemId,
    );
    if (!item) return;

    // 파일을 URL로 변환하여 미리보기
    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          updateReturnExchangeItem(itemId, "images", [
            ...item.images,
            ...newImages,
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 반품/교환 이미지 삭제
  const removeReturnExchangeImage = (
    itemId: string,
    imageIndex: number,
  ) => {
    const item = returnExchangeItems.find(
      (i) => i.id === itemId,
    );
    if (!item) return;
    updateReturnExchangeItem(
      itemId,
      "images",
      item.images.filter((_, i) => i !== imageIndex),
    );
  };

  // 가공/포장 작업 이미지 업로드 핸들러
  const handleWorkImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const newWorkItems: WorkItem[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newWorkItems.push({
          id: Date.now().toString() + Math.random(),
          image: reader.result as string,
          descriptionKo: "",
          descriptionZh: "",
          isCompleted: false,
        });
        if (newWorkItems.length === files.length) {
          setWorkItems([...workItems, ...newWorkItems]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 가공/포장 작업 항목 삭제
  const removeWorkItem = (id: string) => {
    setWorkItems(workItems.filter((item) => item.id !== id));
  };

  // 가공/포장 작업 설명 업데이트
  const updateWorkItemDescription = (
    id: string,
    field: "descriptionKo" | "descriptionZh",
    value: string,
  ) => {
    setWorkItems(
      workItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  if (!order) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>목록으로 돌아가기</span>
        </button>
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">
            발주 정보를 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const finalUnitPrice = unitPrice + optionCost;
  const totalAmount = finalUnitPrice * quantity;
  const commissionAmount = totalAmount * (commissionRate / 100);
  const totalOptionCost = optionItems.reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const totalLaborCost = laborCostItems.reduce(
    (sum, item) => sum + item.cost,
    0,
  );

  // 업체 출고 상태 자동 계산
  const totalShippedQuantity = factoryShipments.reduce(
    (sum, shipment) => sum + shipment.quantity,
    0,
  );
  const totalReturnQuantity = returnExchangeItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalReceivedQuantity =
    totalShippedQuantity - totalReturnQuantity;

  const getFactoryStatus = () => {
    if (totalReceivedQuantity >= quantity) {
      return "수령완료";
    } else if (factoryShipments.length > 0) {
      return "배송중";
    } else {
      return "준비중";
    }
  };

  const currentFactoryStatus = getFactoryStatus();

  // 각 영역별 총액 계산
  const basicCostTotal =
    unitPrice * quantity * (1 + commissionRate / 100);
  const shippingCostTotal =
    shippingCost + warehouseShippingCost;

  const finalPaymentAmount =
    basicCostTotal +
    shippingCostTotal +
    totalOptionCost +
    totalLaborCost;

  // 최종 예상 단가 계산 (최종 결제 금액 / 수량)
  const expectedFinalUnitPrice = quantity > 0 ? finalPaymentAmount / quantity : 0;

  // 선금/잔금 계산
  const advancePaymentAmount =
    unitPrice * quantity * (advancePaymentRate / 100);
  const balancePaymentAmount =
    finalPaymentAmount - advancePaymentAmount;

  return (
    <div className="p-6 min-h-[1080px]">
      {/* Header */}
      <DetailHeader onBack={onBack} />

      <div className="grid grid-cols-[1fr_380px] gap-6">
        {/* Left Column - Main Info */}
        <div className="space-y-6">
          {/* Product Information */}
          <ProductInfoSection
            productName={order.product}
            poNumber={order.poNumber}
            productImage={order.productImage}
            size={order.size}
            weight={order.weight}
            packaging={packaging}
            finalUnitPrice={expectedFinalUnitPrice}
            orderDate={orderDate}
            deliveryDate={deliveryDate}
            isOrderConfirmed={isOrderConfirmed}
            onPackagingChange={setPackaging}
            onOrderDateChange={setOrderDate}
            onDeliveryDateChange={setDeliveryDate}
            onOrderConfirmedChange={setIsOrderConfirmed}
            onProductClick={() => {
              const productId = poToProductMap[order.poNumber];
              const product = mockProducts.find((p) => p.id === productId);
              if (product) {
                setSelectedProduct(product);
              }
            }}
            onPhotoGalleryClick={() => setIsPhotoGalleryOpen(true)}
            onImageClick={() => setIsImageModalOpen(true)}
          />

          {/* Cost Breakdown - Editable */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  발주 진행 관리
                </h3>
              </div>
            </div>

            {/* 탭 버튼 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("cost")}
                className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
                  activeTab === "cost"
                    ? "bg-purple-600 text-white border-purple-600 shadow-md"
                    : "bg-purple-50 text-purple-700 border-transparent hover:bg-purple-100"
                }`}
              >
                비용 / 결제
              </button>
              <button
                onClick={() => setActiveTab("factory")}
                className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
                  activeTab === "factory"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-blue-50 text-blue-700 border-transparent hover:bg-blue-100"
                }`}
              >
                업체 출고
              </button>
              <button
                onClick={() => setActiveTab("work")}
                className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
                  activeTab === "work"
                    ? "bg-green-600 text-white border-green-600 shadow-md"
                    : "bg-green-50 text-green-700 border-transparent hover:bg-green-100"
                }`}
              >
                가공/포장 작업
              </button>
              <button
                onClick={() => setActiveTab("delivery")}
                className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
                  activeTab === "delivery"
                    ? "bg-orange-600 text-white border-orange-600 shadow-md"
                    : "bg-orange-50 text-orange-700 border-transparent hover:bg-orange-100"
                }`}
              >
                물류회사로 배송
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === "cost" && (
              <div className="space-y-4">
                {/* Cost sections in columns */}
                <div className="grid grid-cols-4 gap-6">
                  {/* 기본 비용 */}
                  <div className="space-y-3">
                    <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
                      <span>기본 비용</span>
                      <span className="text-lg font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded">
                        ¥{basicCostTotal.toFixed(2)}
                      </span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs whitespace-nowrap w-16 font-semibold text-center">
                          기본 단가
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 text-sm">
                            ¥
                          </span>
                          <input
                            type="number"
                            value={unitPrice}
                            onChange={(e) =>
                              setUnitPrice(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            step="0.01"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs whitespace-nowrap w-16 font-semibold text-center">
                          수량
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-gray-500 text-xs w-4">
                            개
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs whitespace-nowrap w-16">
                          수수료율
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          <select
                            value={commissionType}
                            onChange={(e) =>
                              handleCommissionTypeChange(
                                e.target.value,
                              )
                            }
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {commissionOptions.map((opt) => (
                              <option
                                key={opt.label}
                                value={opt.label}
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs whitespace-nowrap w-16">
                          수수료 금액
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 text-sm">
                            ¥
                          </span>
                          <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-right text-sm text-gray-700">
                            {commissionAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 운송비 */}
                  <div className="space-y-3 border-l border-gray-200 pl-6">
                    <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
                      <span>운송비</span>
                      <span className="text-lg font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded">
                        ¥{shippingCostTotal.toFixed(2)}
                      </span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs whitespace-nowrap w-16">
                          업체 배송비
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 text-sm">
                            ¥
                          </span>
                          <input
                            type="number"
                            value={shippingCost}
                            onChange={(e) =>
                              setShippingCost(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            step="0.01"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs whitespace-nowrap w-16">
                          창고 배송비
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 text-sm">
                            ¥
                          </span>
                          <input
                            type="number"
                            value={warehouseShippingCost}
                            onChange={(e) =>
                              setWarehouseShippingCost(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            step="0.01"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 옵션 */}
                  <div className="space-y-3 border-l border-gray-200 pl-6">
                    <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
                      <span>포장 및 가공 부자재</span>
                      <span className="text-lg font-semibold text-green-700 bg-green-100 px-3 py-1 rounded">
                        ¥{totalOptionCost.toFixed(2)}
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {optionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateOptionItemName(
                                item.id,
                                e.target.value,
                              )
                            }
                            placeholder="항목명"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-gray-500 text-xs">
                            ¥
                          </span>
                          <input
                            type="number"
                            value={item.cost}
                            onChange={(e) =>
                              updateOptionItemCost(
                                item.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            step="0.01"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() =>
                              removeOptionItem(item.id)
                            }
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addOptionItem}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs w-full justify-center mt-2"
                      >
                        <Plus className="w-3 h-3" />
                        <span>추가</span>
                      </button>
                    </div>
                  </div>

                  {/* 인건비 */}
                  <div className="space-y-3 border-l border-gray-200 pl-6">
                    <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
                      <span>인건비</span>
                      <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded">
                        ¥{totalLaborCost.toFixed(2)}
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {laborCostItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateLaborCostItemName(
                                item.id,
                                e.target.value,
                              )
                            }
                            placeholder="항목명"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-gray-500 text-xs">
                            ¥
                          </span>
                          <input
                            type="number"
                            value={item.cost}
                            onChange={(e) =>
                              updateLaborCostItemCost(
                                item.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            step="0.01"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() =>
                              removeLaborCostItem(item.id)
                            }
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addLaborCostItem}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs w-full justify-center mt-2"
                      >
                        <Plus className="w-3 h-3" />
                        <span>추가</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 최종 결제 금액 */}
                <div className="pt-4 border-t-2 border-gray-300">
                  <div className="flex items-start gap-6">
                    {/* 선금/잔금 정보 */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-6">
                        {/* 선금 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900 font-semibold">
                              선금
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={advancePaymentRate}
                                  onChange={(e) =>
                                    setAdvancePaymentRate(
                                      parseFloat(
                                        e.target.value,
                                      ) || 0,
                                    )
                                  }
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-600">
                                  %
                                </span>
                              </div>
                              <span className="text-lg font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded">
                                ¥
                                {advancePaymentAmount.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              선금 지불일자
                            </span>
                            <input
                              type="date"
                              value={advancePaymentDate}
                              onChange={(e) =>
                                setAdvancePaymentDate(
                                  e.target.value,
                                )
                              }
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>

                        {/* 잔금 */}
                        <div className="space-y-3 border-l border-gray-300 pl-6">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900 font-semibold">
                              잔금
                            </span>
                            <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded">
                              ¥
                              {balancePaymentAmount.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              잔금 지불일자
                            </span>
                            <input
                              type="date"
                              value={balancePaymentDate}
                              onChange={(e) =>
                                setBalancePaymentDate(
                                  e.target.value,
                                )
                              }
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 최종 결제 금액 라벨 및 금액 표시 */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-gray-900 font-semibold whitespace-nowrap">
                        최종 결제 금액
                      </span>
                      <span className="text-2xl font-bold text-purple-700 bg-purple-100 px-4 py-2 rounded-lg whitespace-nowrap">
                        ¥
                        {finalPaymentAmount.toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "factory" && (
              <div className="space-y-6">
                {/* Factory Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Factory className="w-6 h-6 text-gray-700" />
                      <h3 className="text-xl font-bold text-gray-900">
                        업체 출고 상태
                      </h3>
                      {(factoryShipments.length > 0 ||
                        returnExchangeItems.length > 0) && (
                        <span className="text-lg text-gray-600">
                          (총 입고수량:{" "}
                          <span className="font-semibold text-blue-600">
                            {(
                              factoryShipments.reduce(
                                (sum, shipment) =>
                                  sum + shipment.quantity,
                                0,
                              ) -
                              returnExchangeItems.reduce(
                                (sum, item) =>
                                  sum + item.quantity,
                                0,
                              )
                            ).toLocaleString()}
                          </span>
                          개)
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex px-3 py-1.5 rounded-full text-sm ${
                        currentFactoryStatus === "수령완료"
                          ? "bg-green-100 text-green-800"
                          : currentFactoryStatus === "배송중"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {currentFactoryStatus}
                    </span>
                  </div>

                  {/* 출고 항목 추가 버튼 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={addFactoryShipment}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>출고 항목 추가</span>
                    </button>
                    <button
                      onClick={addReturnExchangeItem}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>반품/교환 추가</span>
                    </button>
                  </div>
                </div>

                {/* Factory Shipping Information List */}
                {factoryShipments.length === 0 ? (
                  <div className="bg-blue-50 rounded-lg p-8 text-center">
                    <p className="text-gray-600">
                      출고 항목이 없습니다. 위의 "출고 항목
                      추가" 버튼을 눌러 추가해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {factoryShipments.map(
                      (shipment, shipmentIndex) => (
                        <div
                          key={shipment.id}
                          className="bg-blue-50 rounded-lg p-4 relative"
                        >
                          {/* 항목 번호 및 삭제 버튼 */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-blue-700">
                              출고 항목 #{shipmentIndex + 1}
                            </span>
                            <button
                              onClick={() =>
                                removeFactoryShipment(
                                  shipment.id,
                                )
                              }
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>삭제</span>
                            </button>
                          </div>

                          <div className="flex items-end gap-4">
                            {/* 날짜 */}
                            <div className="flex-1">
                              <label className="text-sm text-gray-700 mb-1.5 block">
                                출고날짜
                              </label>
                              <input
                                type="date"
                                value={shipment.date}
                                onChange={(e) =>
                                  updateFactoryShipment(
                                    shipment.id,
                                    "date",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* 출고수량 */}
                            <div className="flex-1">
                              <label className="text-sm text-gray-700 mb-1.5 block">
                                출고수량
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={shipment.quantity}
                                  onChange={(e) =>
                                    updateFactoryShipment(
                                      shipment.id,
                                      "quantity",
                                      parseInt(
                                        e.target.value,
                                      ) || 0,
                                    )
                                  }
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600">
                                  개
                                </span>
                              </div>
                            </div>

                            {/* 송장번호 */}
                            <div className="flex-1">
                              <label className="text-sm text-gray-700 mb-1.5 block">
                                송장번호
                              </label>
                              <input
                                type="text"
                                value={shipment.trackingNumber}
                                onChange={(e) =>
                                  updateFactoryShipment(
                                    shipment.id,
                                    "trackingNumber",
                                    e.target.value,
                                  )
                                }
                                placeholder="송장번호 입력"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* 수령일 */}
                            <div className="flex-1">
                              <label className="text-sm text-gray-700 mb-1.5 block">
                                수령일
                              </label>
                              <input
                                type="date"
                                value={shipment.receiveDate}
                                onChange={(e) =>
                                  updateFactoryShipment(
                                    shipment.id,
                                    "receiveDate",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* 사진 업로드 */}
                            <div>
                              <label className="text-sm text-gray-700 mb-1.5 block">
                                사진
                              </label>
                              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors h-[38px]">
                                <Plus className="w-4 h-4" />
                                <span>추가</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleFactoryImageUpload(
                                      shipment.id,
                                      e,
                                    )
                                  }
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {/* 업로드된 이미지 썸네일 */}
                            {shipment.images.length > 0 && (
                              <div className="flex items-center gap-2">
                                {shipment.images.map(
                                  (image, index) => (
                                    <div
                                      key={index}
                                      className="relative group"
                                    >
                                      {/* 썸네일 */}
                                      <div
                                        className="w-12 h-12 rounded-lg border-2 border-blue-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-all"
                                        onClick={() =>
                                          setSelectedFactoryImage(
                                            image,
                                          )
                                        }
                                      >
                                        <img
                                          src={image}
                                          alt={`업체 출고 ${index + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      {/* 호버 시 크게 보기 */}
                                      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                                        <img
                                          src={image}
                                          alt={`업체 출고 ${index + 1} 미리보기`}
                                          className="w-96 h-96 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                                        />
                                      </div>

                                      {/* 삭제 버튼 */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeFactoryImage(
                                            shipment.id,
                                            index,
                                          );
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* 반품/교환 항목 섹션 */}
                <div className="border-t-2 border-gray-300 pt-6 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      반품/교환 항목
                    </h3>
                    {returnExchangeItems.length > 0 && (
                      <span className="text-lg text-gray-600">
                        (총 반품/교환 수량:{" "}
                        <span className="font-semibold text-orange-600">
                          {returnExchangeItems
                            .reduce(
                              (sum, item) =>
                                sum + item.quantity,
                              0,
                            )
                            .toLocaleString()}
                        </span>
                        개)
                      </span>
                    )}
                  </div>

                  {returnExchangeItems.length === 0 ? (
                    <div className="bg-orange-50 rounded-lg p-8 text-center">
                      <p className="text-gray-600">
                        반품/교환 항목이 없습니다. 위의
                        "반품/교환 추가" 버튼을 눌러
                        추가해주세요.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {returnExchangeItems.map(
                        (item, itemIndex) => (
                          <div
                            key={item.id}
                            className="bg-orange-50 rounded-lg p-4 relative"
                          >
                            {/* 항목 번호 및 삭제 버튼 */}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-orange-700">
                                반품/교환 항목 #{itemIndex + 1}
                              </span>
                              <button
                                onClick={() =>
                                  removeReturnExchangeItem(
                                    item.id,
                                  )
                                }
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>삭제</span>
                              </button>
                            </div>

                            <div className="flex items-end gap-4">
                              {/* 날짜 */}
                              <div className="flex-1">
                                <label className="text-sm text-gray-700 mb-1.5 block">
                                  반품/교환 날짜
                                </label>
                                <input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) =>
                                    updateReturnExchangeItem(
                                      item.id,
                                      "date",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              {/* 수량 */}
                              <div className="flex-1">
                                <label className="text-sm text-gray-700 mb-1.5 block">
                                  수량
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateReturnExchangeItem(
                                        item.id,
                                        "quantity",
                                        parseInt(
                                          e.target.value,
                                        ) || 0,
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                  <span className="text-sm text-gray-600">
                                    개
                                  </span>
                                </div>
                              </div>

                              {/* 송장번호 */}
                              <div className="flex-1">
                                <label className="text-sm text-gray-700 mb-1.5 block">
                                  송장번호
                                </label>
                                <input
                                  type="text"
                                  value={item.trackingNumber}
                                  onChange={(e) =>
                                    updateReturnExchangeItem(
                                      item.id,
                                      "trackingNumber",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="송장번호 입력"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              {/* 수령일 */}
                              <div className="flex-1">
                                <label className="text-sm text-gray-700 mb-1.5 block">
                                  수령일
                                </label>
                                <input
                                  type="date"
                                  value={item.receiveDate}
                                  onChange={(e) =>
                                    updateReturnExchangeItem(
                                      item.id,
                                      "receiveDate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              {/* 사진 업로드 */}
                              <div>
                                <label className="text-sm text-gray-700 mb-1.5 block">
                                  사진
                                </label>
                                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-orange-300 rounded-lg text-sm text-orange-700 hover:bg-orange-50 cursor-pointer transition-colors h-[38px]">
                                  <Plus className="w-4 h-4" />
                                  <span>추가</span>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleReturnExchangeImageUpload(
                                        item.id,
                                        e,
                                      )
                                    }
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {/* 업로드된 이미지 썸네일 */}
                              {item.images.length > 0 && (
                                <div className="flex items-center gap-2">
                                  {item.images.map(
                                    (image, index) => (
                                      <div
                                        key={index}
                                        className="relative group"
                                      >
                                        {/* 썸네일 */}
                                        <div
                                          className="w-12 h-12 rounded-lg border-2 border-orange-300 overflow-hidden cursor-pointer hover:border-orange-500 transition-all"
                                          onClick={() =>
                                            setSelectedFactoryImage(
                                              image,
                                            )
                                          }
                                        >
                                          <img
                                            src={image}
                                            alt={`반품/교환 ${index + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>

                                        {/* 호버 시 크게 보기 */}
                                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                                          <img
                                            src={image}
                                            alt={`반품/교환 ${index + 1} 미리보기`}
                                            className="w-96 h-96 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                                          />
                                        </div>

                                        {/* 삭제 버튼 */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeReturnExchangeImage(
                                              item.id,
                                              index,
                                            );
                                          }}
                                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "work" && (
              <div className="space-y-4">
                {/* Work Status & Add Button */}
                <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                        <Wrench className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        가공/포장 작업
                      </h3>
                      {/* 작업 항목 개수 배지 */}
                      {workItems.length > 0 && (
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-bold shadow-md">
                          {workItems.length}개
                        </span>
                      )}
                    </div>

                    {/* 작업 상태 배지 */}
                    <span
                      className={`inline-flex px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                        workStatus === "완료"
                          ? "bg-green-500 text-white"
                          : workStatus === "작업중"
                            ? "bg-blue-500 text-white"
                            : "bg-yellow-500 text-white"
                      }`}
                    >
                      {workStatus}
                    </span>

                    {/* 작업 일정 */}
                    <div className="flex items-center gap-2 text-sm">
                      {/* 작업시작일 */}
                      <div className="flex items-center gap-1">
                        <label className="text-gray-600">
                          시작일:
                        </label>
                        <input
                          type="date"
                          value={workStartDate}
                          onChange={(e) =>
                            setWorkStartDate(e.target.value)
                          }
                          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* 작업완료일 */}
                      <div className="flex items-center gap-1">
                        <label className="text-gray-600">
                          완료일:
                        </label>
                        <input
                          type="date"
                          value={workEndDate}
                          onChange={(e) =>
                            setWorkEndDate(e.target.value)
                          }
                          min={workStartDate}
                          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 사진 추가 버튼 */}
                  <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>작업 항목 추가</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleWorkImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 작업 항목 목록 */}
                {workItems.length === 0 ? (
                  <div className="bg-purple-50 rounded-lg p-6 text-center">
                    <Image className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">
                      작업 항목이 없습니다. 위의 "작업 ���목
                      추가" 버튼을 눌러 추가해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {workItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-purple-50 rounded-lg p-4"
                      >
                        {/* 항목 번호, 완료 체크박스, 삭제 버튼 */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-purple-700">
                              작업 #{index + 1}
                            </span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={
                                  item.isCompleted || false
                                }
                                onChange={(e) =>
                                  handleWorkItemComplete(
                                    item.id,
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-xs text-gray-600">
                                완료
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={() =>
                              removeWorkItem(item.id)
                            }
                            className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* 썸네일 이미지 */}
                          <div className="relative group mx-auto w-1/2">
                            <div
                              className="w-full aspect-square rounded-lg border-2 border-purple-300 overflow-hidden cursor-pointer hover:border-purple-500 transition-all"
                              onClick={() =>
                                setSelectedFactoryImage(
                                  item.image,
                                )
                              }
                            >
                              <img
                                src={item.image}
                                alt={`작업 사진 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* 호버 시 크게 보기 */}
                            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                              <img
                                src={item.image}
                                alt={`작업 사진 ${index + 1} 미리보기`}
                                className="w-80 h-80 object-contain rounded-lg shadow-2xl border-4 border-white bg-white"
                              />
                            </div>
                          </div>

                          {/* 설명 입력 영역 */}
                          <div className="space-y-2">
                            {/* 한국어 설명 */}
                            <div>
                              <label className="text-xs text-gray-700 mb-1 block font-medium">
                                작업 설명 (한국어)
                              </label>
                              <textarea
                                value={item.descriptionKo}
                                onChange={(e) =>
                                  updateWorkItemDescription(
                                    item.id,
                                    "descriptionKo",
                                    e.target.value,
                                  )
                                }
                                placeholder="작업 설명을 입력하세요..."
                                rows={2}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            </div>

                            {/* 중국어 설명 */}
                            <div>
                              <label className="text-xs text-gray-700 mb-1 block font-medium">
                                作业说明 (中文)
                              </label>
                              <textarea
                                value={item.descriptionZh}
                                onChange={(e) =>
                                  updateWorkItemDescription(
                                    item.id,
                                    "descriptionZh",
                                    e.target.value,
                                  )
                                }
                                placeholder="请输入作业说明..."
                                rows={2}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "delivery" && (
              <div className="space-y-6">
                {/* 포장 코드 및 날짜 입력 */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        포장 코드
                      </label>
                      <input
                        type="text"
                        value={newPackingCode}
                        onChange={(e) => setNewPackingCode(e.target.value)}
                        placeholder="포장 코드를 입력하세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        날짜
                      </label>
                      <input
                        type="date"
                        value={newPackingDate}
                        onChange={(e) => setNewPackingDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        onClick={addDeliverySet}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        추가
                      </button>
                    </div>
                  </div>
                </div>

                {/* 배송 세트 목록 */}
                <div className="space-y-6">
                  {deliverySets.map((set) => (
                    <div key={set.id} className="bg-white border-2 border-orange-200 rounded-lg p-5">
                      {/* 헤더: 포장 코드와 날짜 */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-200">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">포장 코드:</span>
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded font-semibold">
                              {set.packingCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">날짜:</span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded">
                              {set.date}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDeliverySet(set.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* 포장 정보 영역 */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">포장 정보</h4>
                          <button
                            onClick={() => addPackageInfo(set.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            추가
                          </button>
                        </div>
                        
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">종</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center">×</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">개</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center">×</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">세트</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center">=</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">합계</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">포장방식</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">중량(kg)</th>
                              <th className="border border-gray-300 px-2 py-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {set.packageInfoList.map((pkg) => (
                              <tr key={pkg.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={pkg.types}
                                    onChange={(e) => updatePackageInfo(set.id, pkg.id, "types", e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">×</td>
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={pkg.pieces}
                                    onChange={(e) => updatePackageInfo(set.id, pkg.id, "pieces", e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">×</td>
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={pkg.sets}
                                    onChange={(e) => updatePackageInfo(set.id, pkg.id, "sets", e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">=</td>
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={pkg.total}
                                    readOnly
                                    placeholder="0"
                                    className="w-full px-2 py-1 border-0 bg-gray-50 text-gray-700 cursor-default"
                                  />
                                </td>
                                <td className="border border-gray-300 p-0">
                                  <select
                                    value={pkg.method}
                                    onChange={(e) => updatePackageInfo(set.id, pkg.id, "method", e.target.value as "박스" | "마대")}
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  >
                                    <option value="박스">박스</option>
                                    <option value="마대">마대</option>
                                  </select>
                                </td>
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={pkg.weight}
                                    onChange={(e) => updatePackageInfo(set.id, pkg.id, "weight", e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-center">
                                  <button
                                    onClick={() => removePackageInfo(set.id, pkg.id)}
                                    disabled={set.packageInfoList.length === 1}
                                    className={`p-0.5 rounded transition-colors ${
                                      set.packageInfoList.length === 1
                                        ? "text-gray-300 cursor-not-allowed"
                                        : "text-red-600 hover:bg-red-100"
                                    }`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 물류 정보 영역 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">물류 정보</h4>
                          <button
                            onClick={() => addLogisticsInfo(set.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            추가
                          </button>
                        </div>
                        
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">송장번호</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">물류회사</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-left">사진</th>
                              <th className="border border-gray-300 px-2 py-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {set.logisticsInfoList.map((logistics) => (
                              <tr key={logistics.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={logistics.trackingNumber}
                                    onChange={(e) => updateLogisticsInfo(set.id, logistics.id, "trackingNumber", e.target.value)}
                                    placeholder="송장번호를 입력하세요"
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="border border-gray-300 p-0">
                                  <input
                                    type="text"
                                    value={logistics.company}
                                    onChange={(e) => updateLogisticsInfo(set.id, logistics.id, "company", e.target.value)}
                                    placeholder="물류회사명"
                                    className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {/* 썸네일 목록 */}
                                    {logistics.imageUrls.map((imageUrl, imgIdx) => (
                                      <div 
                                        key={imgIdx} 
                                        className="relative group"
                                        onMouseEnter={() => setHoveredImage(imageUrl)}
                                        onMouseLeave={() => setHoveredImage("")}
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={`이미지 ${imgIdx + 1}`}
                                          className="w-8 h-8 object-cover rounded cursor-pointer hover:ring-2 hover:ring-orange-500"
                                          onClick={() => openImageModal(imageUrl)}
                                        />
                                        {/* 삭제 버튼 */}
                                        <button
                                          onClick={() => removeLogisticsImage(set.id, logistics.id, imgIdx)}
                                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                          title="삭제"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                    
                                    {/* 업로드 버튼 */}
                                    {logistics.imageUrls.length < 10 && (
                                      <label className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-orange-600 px-1 py-1">
                                        <Image className="w-3.5 h-3.5" />
                                        {logistics.imageUrls.length === 0 && <span className="text-xs">업로드</span>}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                              handleImageUpload(set.id, logistics.id, e.target.files);
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                    
                                    {/* 이미지 개수 표시 */}
                                    {logistics.imageUrls.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        {logistics.imageUrls.length}/10
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-center">
                                  <button
                                    onClick={() => removeLogisticsInfo(set.id, logistics.id)}
                                    disabled={set.logisticsInfoList.length === 1}
                                    className={`p-0.5 rounded transition-colors ${
                                      set.logisticsInfoList.length === 1
                                        ? "text-gray-300 cursor-not-allowed"
                                        : "text-red-600 hover:bg-red-100"
                                    }`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 배송 세트가 없을 때 안내 메시지 */}
                {deliverySets.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">
                      포장 코드와 날짜를 입력하고 추가 버튼을 눌러주세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status & Summary */}
        <div className="space-y-6">
          {/* Status Information */}
          <ProgressStatusSection
            currentFactoryStatus={currentFactoryStatus}
            totalShippedQuantity={totalShippedQuantity}
            totalReturnQuantity={totalReturnQuantity}
            totalReceivedQuantity={totalReceivedQuantity}
            hasFactoryShipments={factoryShipments.length > 0}
            hasReturnItems={returnExchangeItems.length > 0}
            workStatus={workStatus}
            workItems={workItems}
            deliveryStatus={order.deliveryStatus}
            paymentStatus={order.paymentStatus}
          />

          {/* 메모 섹션 */}
          <MemoSection
            memos={memos}
            newMemoContent={newMemoContent}
            replyInputs={replyInputs}
            onSetNewMemoContent={setNewMemoContent}
            onSetReplyInputs={setReplyInputs}
            onAddMemo={addMemo}
            onDeleteMemo={deleteMemo}
            onAddReply={addReply}
            onDeleteReply={deleteReply}
          />
        </div>
      </div>

      {/* 상품 이미지 모달 */}
      <ProductImageModal
        isOpen={isImageModalOpen}
        imageUrl={order.productImage}
        productName={order.product}
        poNumber={order.poNumber}
        onClose={() => setIsImageModalOpen(false)}
        onOpenGallery={() => setIsPhotoGalleryOpen(true)}
      />

      {/* 업체 출고 이미지 모달 */}
      <FactoryImageModal
        imageUrl={selectedFactoryImage}
        onClose={() => setSelectedFactoryImage(null)}
      />

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* 사진모아보기 모달 */}
      <PhotoGalleryModal
        isOpen={isPhotoGalleryOpen}
        productName={order.product}
        poNumber={order.poNumber}
        images={
          (() => {
            const productId = poToProductMap[order.poNumber];
            const product = mockProducts.find((p) => p.id === productId);
            return product?.images || [];
          })()
        }
        onClose={() => {
          setIsPhotoGalleryOpen(false);
          setSelectedGalleryImage(null);
        }}
        onImageClick={(imageUrl) => setSelectedGalleryImage(imageUrl)}
      />

      {/* 갤러리 이미지 크게 보기 */}
      <GalleryImageModal
        imageUrl={selectedGalleryImage}
        onClose={() => setSelectedGalleryImage(null)}
      />

      {/* 물류 사진 크게 보기 모달 */}
      <LogisticsImageModal
        imageUrl={selectedImage}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
      />

      {/* 마우스 오버 시 이미지 미리보기 */}
      <ImagePreviewTooltip
        imageUrl={hoveredImage}
        isModalOpen={imageModalOpen}
      />
    </div>
  );
}