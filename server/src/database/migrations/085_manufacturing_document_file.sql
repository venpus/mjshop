-- 제조 문서 파일 업로드/다운로드용 컬럼 추가
ALTER TABLE manufacturing_documents
  ADD COLUMN document_file_path VARCHAR(500) NULL DEFAULT NULL COMMENT '업로드된 문서 파일 경로(엑셀/PDF)' AFTER barcode,
  ADD COLUMN original_file_name VARCHAR(255) NULL DEFAULT NULL COMMENT '원본 파일명' AFTER document_file_path;
