# 발주 상세 탭 컴포넌트

발주 상세 화면의 탭 부분을 별도 컴포넌트로 분리했습니다.

## 사용된 컴포넌트

### 1. CostPaymentTab (비용/결제 탭)
- 위치: `/components/tabs/CostPaymentTab.tsx`
- 기능: 기본 비용, 운송비, 옵션, 인건비 관리 및 선금/잔금 계산

### 2. FactoryShippingTab (업체 출고 탭)
- 위치: `/components/tabs/FactoryShippingTab.tsx`
- 기능: 업체 출고 항목 관리 및 반품/교환 항목 관리

### 3. ProcessingPackagingTab (가공/포장 작업 탭)
- 위치: `/components/tabs/ProcessingPackagingTab.tsx`
- 기능: 가공 및 포장 작업 항목 관리, 작업 진척도 추적

### 4. LogisticsDeliveryTab (물류회사로 배송 탭)
- 위치: `/components/tabs/LogisticsDeliveryTab.tsx`
- 기능: 포장 정보 관리, 물류 정보 관리 (송장번호, 물류회사, 사진)

## 사용 방법

메인 `PurchaseOrderDetail.tsx` 컴포넌트에서:

```tsx
// 1. import 추가
import { CostPaymentTab } from "./tabs/CostPaymentTab";
import { FactoryShippingTab } from "./tabs/FactoryShippingTab";
import { ProcessingPackagingTab } from "./tabs/ProcessingPackagingTab";
import { LogisticsDeliveryTab } from "./tabs/LogisticsDeliveryTab";

// 2. 탭 렌더링 시 컴포넌트 사용
{activeTab === "cost" && (
  <CostPaymentTab
    unitPrice={unitPrice}
    quantity={quantity}
    commissionType={commissionType}
    commissionAmount={commissionAmount}
    basicCostTotal={basicCostTotal}
    onSetUnitPrice={setUnitPrice}
    onSetQuantity={setQuantity}
    onHandleCommissionTypeChange={handleCommissionTypeChange}
    commissionOptions={commissionOptions}
    // ... 기타 props
  />
)}

{activeTab === "factory" && (
  <FactoryShippingTab
    factoryShipments={factoryShipments}
    returnExchangeItems={returnExchangeItems}
    currentFactoryStatus={currentFactoryStatus}
    onAddFactoryShipment={addFactoryShipment}
    onRemoveFactoryShipment={removeFactoryShipment}
    onUpdateFactoryShipment={updateFactoryShipment}
    // ... 기타 props
  />
)}

{activeTab === "work" && (
  <ProcessingPackagingTab
    workItems={workItems}
    workStatus={workStatus}
    workStartDate={workStartDate}
    workEndDate={workEndDate}
    // ... 기타 props
  />
)}

{activeTab === "delivery" && (
  <LogisticsDeliveryTab
    newPackingCode={newPackingCode}
    newPackingDate={newPackingDate}
    deliverySets={deliverySets}
    hoveredImage={hoveredImage}
    onSetNewPackingCode={setNewPackingCode}
    onSetNewPackingDate={setNewPackingDate}
    onAddDeliverySet={addDeliverySet}
    onRemoveDeliverySet={removeDeliverySet}
    // ... 기타 props
  />
)}
```

이렇게 분리함으로써 메인 컴포넌트의 코드 크기를 줄일 수 있습니다.
