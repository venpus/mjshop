import { pool } from '../config/database.js';
import {
  Project,
  ProjectEntry,
  ProjectEntryImage,
  ProjectEntryImageReaction,
  ProjectEntryComment,
  ProjectEntryCommentReply,
  ProjectPublic,
  ProjectEntryPublic,
  ProjectEntryImagePublic,
  ProjectEntryCommentPublic,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateProjectEntryDTO,
  UpdateProjectEntryDTO,
  UpsertImageReactionDTO,
  CreateCommentDTO,
  CreateCommentReplyDTO,
} from '../models/project.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ProjectRow extends RowDataPacket {
  id: number;
  name: string;
  status: string;
  start_date: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ProjectEntryRow extends RowDataPacket {
  id: number;
  project_id: number;
  date: Date;
  title: string;
  content: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ProjectEntryImageRow extends RowDataPacket {
  id: number;
  entry_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

interface ProjectEntryImageReactionRow extends RowDataPacket {
  id: number;
  image_id: number;
  user_id: string;
  reaction: string;
  created_at: Date;
  updated_at: Date;
}

interface ProjectEntryCommentRow extends RowDataPacket {
  id: number;
  entry_id: number;
  content: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface ProjectEntryCommentReplyRow extends RowDataPacket {
  id: number;
  comment_id: number;
  content: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export class ProjectRepository {
  /**
   * 모든 프로젝트 조회
   */
  async findAll(): Promise<Project[]> {
    const [rows] = await pool.execute<ProjectRow[]>(
      `SELECT id, name, status, start_date, created_at, updated_at, created_by, updated_by
       FROM projects
       ORDER BY created_at DESC`
    );

    return rows.map(this.mapRowToProject);
  }

  /**
   * ID로 프로젝트 조회 (항목, 이미지, 댓글 포함)
   */
  async findById(id: number): Promise<ProjectPublic | null> {
    // 프로젝트 기본 정보 조회
    const [projectRows] = await pool.execute<ProjectRow[]>(
      `SELECT id, name, status, start_date, created_at, updated_at, created_by, updated_by
       FROM projects
       WHERE id = ?`,
      [id]
    );

    if (projectRows.length === 0) {
      return null;
    }

    const project = this.mapRowToProject(projectRows[0]);

    // 항목 조회 (날짜 역순)
    const [entryRows] = await pool.execute<ProjectEntryRow[]>(
      `SELECT id, project_id, date, title, content, created_at, updated_at, created_by, updated_by
       FROM project_entries
       WHERE project_id = ?
       ORDER BY date DESC, created_at DESC`,
      [id]
    );

    const entries: ProjectEntryPublic[] = [];

      for (const entryRow of entryRows) {
        const entryBase = this.mapRowToProjectEntry(entryRow);

      // 이미지 조회
      const [imageRows] = await pool.execute<ProjectEntryImageRow[]>(
        `SELECT id, entry_id, image_url, display_order, created_at
         FROM project_entry_images
         WHERE entry_id = ?
         ORDER BY display_order ASC, created_at ASC`,
        [entryBase.id]
      );

      const images: ProjectEntryImagePublic[] = [];

      for (const imageRow of imageRows) {
        const image = this.mapRowToProjectEntryImage(imageRow);

        // 이미지 반응 조회 (현재는 가장 최근 반응만, 필요시 사용자별로 변경 가능)
        const [reactionRows] = await pool.execute<ProjectEntryImageReactionRow[]>(
          `SELECT id, image_id, user_id, reaction, created_at, updated_at
           FROM project_entry_image_reactions
           WHERE image_id = ?
           ORDER BY updated_at DESC
           LIMIT 1`,
          [image.id]
        );

        const imagePublic: ProjectEntryImagePublic = {
          ...image,
          reactions: reactionRows.map(this.mapRowToProjectEntryImageReaction),
        };

        images.push(imagePublic);
      }

      // 댓글 조회 (최신순)
      const [commentRows] = await pool.execute<ProjectEntryCommentRow[]>(
        `SELECT id, entry_id, content, user_id, created_at, updated_at
         FROM project_entry_comments
         WHERE entry_id = ?
         ORDER BY created_at ASC`,
        [entryBase.id]
      );

      const comments: ProjectEntryCommentPublic[] = [];

      for (const commentRow of commentRows) {
        const commentBase = this.mapRowToProjectEntryComment(commentRow);

        // 답글 조회
        const [replyRows] = await pool.execute<ProjectEntryCommentReplyRow[]>(
          `SELECT id, comment_id, content, user_id, created_at, updated_at
           FROM project_entry_comment_replies
           WHERE comment_id = ?
           ORDER BY created_at ASC`,
          [commentBase.id]
        );

        const commentPublic: ProjectEntryCommentPublic = {
          ...commentBase,
          replies: replyRows.map(this.mapRowToProjectEntryCommentReply),
        };

        comments.push(commentPublic);
      }

      const entry: ProjectEntryPublic = {
        ...entryBase,
        images,
        comments,
      };

      entries.push(entry);
    }

    return {
      ...project,
      entries,
    };
  }

  /**
   * 프로젝트 생성
   */
  async create(data: CreateProjectDTO): Promise<Project> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO projects (name, status, start_date, created_by)
       VALUES (?, ?, ?, ?)`,
      [
        data.name,
        data.status || '진행중',
        data.start_date,
        data.created_by || null,
      ]
    );

    const project = await this.findByIdWithoutRelations(result.insertId);
    if (!project) {
      throw new Error('프로젝트 생성 후 조회에 실패했습니다.');
    }

    return project;
  }

  /**
   * 프로젝트 수정
   */
  async update(id: number, data: UpdateProjectDTO): Promise<Project> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(data.start_date);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      const project = await this.findByIdWithoutRelations(id);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }
      return project;
    }

    values.push(id);

    await pool.execute(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const project = await this.findByIdWithoutRelations(id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    return project;
  }

  /**
   * 프로젝트 삭제
   */
  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
  }

  /**
   * 프로젝트 항목 생성
   */
  async createEntry(data: CreateProjectEntryDTO): Promise<ProjectEntry> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entries (project_id, date, title, content, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.project_id,
        data.date,
        data.title,
        data.content || null,
        data.created_by || null,
      ]
    );

    const entry = await this.findEntryById(result.insertId);
    if (!entry) {
      throw new Error('프로젝트 항목 생성 후 조회에 실패했습니다.');
    }

    return entry;
  }

  /**
   * 프로젝트 항목 수정
   */
  async updateEntry(id: number, data: UpdateProjectEntryDTO): Promise<ProjectEntry> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      updates.push('date = ?');
      values.push(data.date);
    }
    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      const entry = await this.findEntryById(id);
      if (!entry) {
        throw new Error('프로젝트 항목을 찾을 수 없습니다.');
      }
      return entry;
    }

    values.push(id);

    await pool.execute(
      `UPDATE project_entries SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const entry = await this.findEntryById(id);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    return entry;
  }

  /**
   * 프로젝트 항목 삭제
   */
  async deleteEntry(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entries WHERE id = ?', [id]);
  }

  /**
   * 프로젝트 항목 이미지 추가
   */
  async createEntryImage(entryId: number, imageUrl: string, displayOrder: number): Promise<ProjectEntryImage> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entry_images (entry_id, image_url, display_order)
       VALUES (?, ?, ?)`,
      [entryId, imageUrl, displayOrder]
    );

    const [rows] = await pool.execute<ProjectEntryImageRow[]>(
      `SELECT id, entry_id, image_url, display_order, created_at
       FROM project_entry_images
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('이미지 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectEntryImage(rows[0]);
  }

  /**
   * 프로젝트 항목 이미지 삭제
   */
  async deleteEntryImage(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entry_images WHERE id = ?', [id]);
  }

  /**
   * 이미지 반응 생성/수정
   */
  async upsertImageReaction(data: UpsertImageReactionDTO): Promise<ProjectEntryImageReaction> {
    // 기존 반응 확인
    const [existingRows] = await pool.execute<ProjectEntryImageReactionRow[]>(
      `SELECT id, image_id, user_id, reaction, created_at, updated_at
       FROM project_entry_image_reactions
       WHERE image_id = ? AND user_id = ?`,
      [data.image_id, data.user_id]
    );

    if (existingRows.length > 0) {
      // 기존 반응 수정
      await pool.execute(
        `UPDATE project_entry_image_reactions 
         SET reaction = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [data.reaction, existingRows[0].id]
      );

      const [updatedRows] = await pool.execute<ProjectEntryImageReactionRow[]>(
        `SELECT id, image_id, user_id, reaction, created_at, updated_at
         FROM project_entry_image_reactions
         WHERE id = ?`,
        [existingRows[0].id]
      );

      if (updatedRows.length === 0) {
        throw new Error('반응 수정 후 조회에 실패했습니다.');
      }

      return this.mapRowToProjectEntryImageReaction(updatedRows[0]);
    } else {
      // 새 반응 생성
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO project_entry_image_reactions (image_id, user_id, reaction)
         VALUES (?, ?, ?)`,
        [data.image_id, data.user_id, data.reaction]
      );

      const [rows] = await pool.execute<ProjectEntryImageReactionRow[]>(
        `SELECT id, image_id, user_id, reaction, created_at, updated_at
         FROM project_entry_image_reactions
         WHERE id = ?`,
        [result.insertId]
      );

      if (rows.length === 0) {
        throw new Error('반응 생성 후 조회에 실패했습니다.');
      }

      return this.mapRowToProjectEntryImageReaction(rows[0]);
    }
  }

  /**
   * 이미지 반응 삭제
   */
  async deleteImageReaction(imageId: number, userId: string): Promise<void> {
    await pool.execute(
      'DELETE FROM project_entry_image_reactions WHERE image_id = ? AND user_id = ?',
      [imageId, userId]
    );
  }

  /**
   * 댓글 생성
   */
  async createComment(data: CreateCommentDTO): Promise<ProjectEntryComment> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entry_comments (entry_id, content, user_id)
       VALUES (?, ?, ?)`,
      [data.entry_id, data.content, data.user_id]
    );

    const [rows] = await pool.execute<ProjectEntryCommentRow[]>(
      `SELECT id, entry_id, content, user_id, created_at, updated_at
       FROM project_entry_comments
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('댓글 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectEntryComment(rows[0]);
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entry_comments WHERE id = ?', [id]);
  }

  /**
   * 답글 생성
   */
  async createCommentReply(data: CreateCommentReplyDTO): Promise<ProjectEntryCommentReply> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entry_comment_replies (comment_id, content, user_id)
       VALUES (?, ?, ?)`,
      [data.comment_id, data.content, data.user_id]
    );

    const [rows] = await pool.execute<ProjectEntryCommentReplyRow[]>(
      `SELECT id, comment_id, content, user_id, created_at, updated_at
       FROM project_entry_comment_replies
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('답글 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectEntryCommentReply(rows[0]);
  }

  /**
   * 답글 삭제
   */
  async deleteCommentReply(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entry_comment_replies WHERE id = ?', [id]);
  }

  /**
   * 댓글 ID로 항목 ID 조회
   */
  async findEntryIdByCommentId(commentId: number): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT entry_id FROM project_entry_comments WHERE id = ?',
      [commentId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].entry_id;
  }

  /**
   * 답글 ID로 항목 ID 조회
   */
  async findEntryIdByReplyId(replyId: number): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ce.entry_id 
       FROM project_entry_comment_replies r
       JOIN project_entry_comments ce ON r.comment_id = ce.id
       WHERE r.id = ?`,
      [replyId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].entry_id;
  }

  /**
   * Helper: ID로 프로젝트 조회 (관계 제외)
   */
  private async findByIdWithoutRelations(id: number): Promise<Project | null> {
    const [rows] = await pool.execute<ProjectRow[]>(
      `SELECT id, name, status, start_date, created_at, updated_at, created_by, updated_by
       FROM projects
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProject(rows[0]);
  }

  /**
   * Helper: ID로 항목 조회
   */
  private async findEntryById(id: number): Promise<ProjectEntry | null> {
    const [rows] = await pool.execute<ProjectEntryRow[]>(
      `SELECT id, project_id, date, title, content, created_at, updated_at, created_by, updated_by
       FROM project_entries
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProjectEntry(rows[0]);
  }

  /**
   * Helper: Row to Project 매핑
   */
  private mapRowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      status: row.status as any,
      start_date: row.start_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  /**
   * Helper: Row to ProjectEntry 매핑
   */
  private mapRowToProjectEntry(row: ProjectEntryRow): ProjectEntry {
    return {
      id: row.id,
      project_id: row.project_id,
      date: row.date,
      title: row.title,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  /**
   * Helper: Row to ProjectEntryImage 매핑
   */
  private mapRowToProjectEntryImage(row: ProjectEntryImageRow): ProjectEntryImage {
    return {
      id: row.id,
      entry_id: row.entry_id,
      image_url: row.image_url,
      display_order: row.display_order,
      created_at: row.created_at,
    };
  }

  /**
   * Helper: Row to ProjectEntryImageReaction 매핑
   */
  private mapRowToProjectEntryImageReaction(row: ProjectEntryImageReactionRow): ProjectEntryImageReaction {
    return {
      id: row.id,
      image_id: row.image_id,
      user_id: row.user_id,
      reaction: row.reaction as any,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper: Row to ProjectEntryComment 매핑
   */
  private mapRowToProjectEntryComment(row: ProjectEntryCommentRow): ProjectEntryComment {
    return {
      id: row.id,
      entry_id: row.entry_id,
      content: row.content,
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper: Row to ProjectEntryCommentReply 매핑
   */
  private mapRowToProjectEntryCommentReply(row: ProjectEntryCommentReplyRow): ProjectEntryCommentReply {
    return {
      id: row.id,
      comment_id: row.comment_id,
      content: row.content,
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

