-- 마이그레이션: 072_create_ai_chat_messages
-- 설명: AI 대화 저장 테이블 (사용자별 대화 이력, AI 컨텍스트/학습용)
-- 날짜: 2025-01-28

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메시지 ID',
  user_id VARCHAR(50) NOT NULL COMMENT '관리자 사용자 ID',
  role ENUM('user', 'assistant') NOT NULL COMMENT '역할 (system은 저장하지 않음)',
  content TEXT NOT NULL COMMENT '메시지 내용',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',

  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 채팅 메시지 (대화 이력 저장)';
