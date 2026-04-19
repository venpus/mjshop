import { Routes, Route, Navigate } from 'react-router-dom';
import { ProductCollabLayout } from './ProductCollabLayout';
import { ProductCollabDashboard } from './Dashboard/ProductCollabDashboard';
import { DashboardSectionMore } from './Dashboard/DashboardSectionMore';
import { ProductCollabList } from './ProductList/ProductCollabList';
import { ProductCollabThread } from './ProductThread/ProductCollabThread';
import { ProductCollabArchive } from './CompletedArchive/ProductCollabArchive';
import { ProductCollabCancelled } from './CancelledList/ProductCollabCancelled';
import { UnreadThreadListPage } from './unread/UnreadThreadListPage';

export function ProductCollabRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProductCollabLayout />}>
        <Route index element={<ProductCollabDashboard />} />
        <Route path="dashboard/more/:section" element={<DashboardSectionMore />} />
        <Route path="list" element={<ProductCollabList />} />
        <Route path="unread" element={<UnreadThreadListPage />} />
        <Route path="thread/:productId" element={<ProductCollabThread />} />
        <Route path="archive" element={<ProductCollabArchive />} />
        <Route path="cancelled" element={<ProductCollabCancelled />} />
        <Route path="*" element={<Navigate to="/admin/product-collab" replace />} />
      </Route>
    </Routes>
  );
}
