import { useState, useEffect, useCallback } from 'react';
import {
  listManufacturingDocuments,
  uploadManufacturingDocument,
  downloadManufacturingDocument,
  deleteManufacturingDocument,
} from '../api/manufacturingApi';
import type { ManufacturingDocument } from '../types/manufacturing';

export function usePurchaseOrderManufacturingFiles(purchaseOrderId: string | null) {
  const [docs, setDocs] = useState<ManufacturingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!purchaseOrderId) return;
    setLoading(true);
    try {
      const res = await listManufacturingDocuments({ purchaseOrderId, limit: 50 });
      setDocs(res.data);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      if (!purchaseOrderId) return;
      setUploading(true);
      try {
        await uploadManufacturingDocument(file, purchaseOrderId);
        await load();
      } finally {
        setUploading(false);
      }
    },
    [purchaseOrderId, load]
  );

  const download = useCallback(async (doc: ManufacturingDocument) => {
    await downloadManufacturingDocument(doc.id, doc.original_file_name || undefined);
  }, []);

  const remove = useCallback(
    async (doc: ManufacturingDocument) => {
      await deleteManufacturingDocument(doc.id);
      await load();
    },
    [load]
  );

  return { docs, loading, uploading, upload, download, remove, reload: load };
}
