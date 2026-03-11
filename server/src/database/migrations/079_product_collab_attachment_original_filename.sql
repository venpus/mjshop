-- product_collab_attachments에 다운로드 시 표시할 원본 파일명 컬럼 추가
ALTER TABLE product_collab_attachments
  ADD COLUMN original_filename VARCHAR(255) NULL COMMENT '다운로드 시 사용할 원본 파일명' AFTER url;
