import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AiChatMessageRow {
  id: number;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

const DEFAULT_LIMIT = 100;

/**
 * AI 채팅 메시지 저장/조회 (대화 이력, AI 컨텍스트용)
 */
export class AiChatMessageRepository {
  /**
   * 사용자별 최근 메시지 목록 조회 (created_at 오름차순 = 대화 순서)
   */
  async findByUserId(userId: string, limit: number = DEFAULT_LIMIT): Promise<AiChatMessageRow[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_id, role, content, created_at
       FROM ai_chat_messages
       WHERE user_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [userId, limit]
    );
    return rows as AiChatMessageRow[];
  }

  /**
   * 메시지 일괄 저장 (한 턴: user + assistant)
   */
  async insertMany(
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<void> {
    if (messages.length === 0) return;
    const placeholders = messages.map(() => '(?, ?, ?)').join(', ');
    const values: (string | number)[] = [];
    for (const m of messages) {
      values.push(userId, m.role, m.content);
    }
    await pool.execute<ResultSetHeader>(
      `INSERT INTO ai_chat_messages (user_id, role, content) VALUES ${placeholders}`,
      values
    );
  }
}
