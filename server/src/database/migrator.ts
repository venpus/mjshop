import { pool } from '../config/database.js';
import { readdir, readFile, existsSync } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationFile {
  filename: string;
  path: string;
  version: number;
}

/**
 * 마이그레이션 파일을 읽고 실행하는 클래스
 */
export class Migrator {
  private migrationsPath: string;

  constructor() {
    // 마이그레이션 파일들이 있는 디렉토리 경로
    // tsx로 실행 시 __dirname은 소스 파일의 위치를 가리킴
    // src/database/migrator.ts -> src/database/migrations
    this.migrationsPath = join(__dirname, 'migrations');
    console.log(`📁 마이그레이션 경로: ${this.migrationsPath}`);
  }

  /**
   * 마이그레이션 테이블 생성 (최초 실행 시)
   */
  private async ensureMigrationsTable(): Promise<void> {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE COMMENT '마이그레이션 파일명',
          executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '실행 시간',
          INDEX idx_filename (filename)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마이그레이션 이력 테이블'
      `);
    } catch (error) {
      console.error('마이그레이션 테이블 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 이미 실행된 마이그레이션 목록 조회
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const [rows] = await pool.execute<any[]>(
        'SELECT filename FROM migrations ORDER BY filename'
      );
      const filenames = rows.map((row) => row.filename);
      if (filenames.length > 0) {
        console.log(`  실행된 마이그레이션 목록: ${filenames.join(', ')}`);
      }
      return filenames;
    } catch (error: any) {
      // migrations 테이블이 없는 경우 빈 배열 반환
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('  migrations 테이블이 없습니다 (최초 실행)');
        return [];
      }
      console.error('실행된 마이그레이션 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 마이그레이션 파일 목록 조회 및 정렬
   */
  private async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      console.log(`🔍 마이그레이션 디렉토리 검색: ${this.migrationsPath}`);
      const files = await readdir(this.migrationsPath);
      console.log(`📄 발견된 파일: ${files.join(', ')}`);
      
      const sqlFiles = files
        .filter((file) => file.endsWith('.sql'))
        .map((file) => {
          // 파일명에서 버전 번호 추출 (예: 001_create_table.sql -> 1)
          const match = file.match(/^(\d+)_/);
          const version = match ? parseInt(match[1], 10) : 0;
          return {
            filename: file,
            path: join(this.migrationsPath, file),
            version,
          };
        })
        .sort((a, b) => a.version - b.version); // 버전 순으로 정렬

      console.log(`📋 SQL 파일 ${sqlFiles.length}개 발견:`, sqlFiles.map(f => f.filename).join(', '));
      return sqlFiles;
    } catch (error: any) {
      console.error('마이그레이션 파일 목록 조회 실패:', error.message);
      console.error(`경로: ${this.migrationsPath}`);
      throw error;
    }
  }

  /**
   * 단일 마이그레이션 실행
   */
  private async executeMigration(filename: string, sql: string): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 주석 제거 및 SQL 정리
      const cleanSql = sql
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        })
        .join('\n')
        .trim();

      // 세미콜론으로 SQL 문 분리
      const statements = cleanSql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      console.log(`📝 실행할 SQL 문 ${statements.length}개 발견`);

      // 각 SQL 문 실행
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length > 0) {
          console.log(`  [${i + 1}/${statements.length}] SQL 실행 중...`);
          const result = await connection.query(statement);
          console.log(`  [${i + 1}/${statements.length}] SQL 실행 완료`);
        }
      }

      // 마이그레이션 실행 이력 저장
      await connection.execute(
        'INSERT INTO migrations (filename) VALUES (?)',
        [filename]
      );

      await connection.commit();
      console.log(`✅ 마이그레이션 실행 완료: ${filename}`);
    } catch (error: any) {
      await connection.rollback();
      console.error(`❌ 마이그레이션 실행 실패: ${filename}`);
      console.error(`오류 내용: ${error.message}`);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 모든 마이그레이션 실행
   */
  async migrate(): Promise<void> {
    try {
      console.log('🔄 마이그레이션 시작...');

      // 마이그레이션 테이블 확인/생성
      await this.ensureMigrationsTable();
      console.log('✅ 마이그레이션 테이블 확인 완료');

      // 실행된 마이그레이션 목록 조회
      const executedMigrations = await this.getExecutedMigrations();
      console.log(`📊 실행된 마이그레이션: ${executedMigrations.length}개`, executedMigrations);

      // 마이그레이션 파일 목록 조회
      const migrationFiles = await this.getMigrationFiles();

      // 실행되지 않은 마이그레이션 필터링
      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file.filename)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ 실행할 마이그레이션이 없습니다.');
        return;
      }

      console.log(`📋 ${pendingMigrations.length}개의 마이그레이션을 실행합니다.`);
      pendingMigrations.forEach(m => console.log(`  - ${m.filename}`));

      // 각 마이그레이션 실행
      for (const migration of pendingMigrations) {
        console.log(`\n🚀 실행 중: ${migration.filename}`);
        const sql = await readFile(migration.path, 'utf-8');
        await this.executeMigration(migration.filename, sql);
      }

      console.log('\n✅ 모든 마이그레이션이 완료되었습니다.');
    } catch (error: any) {
      console.error('❌ 마이그레이션 실행 중 오류 발생:', error.message);
      console.error(error);
      throw error;
    }
  }

  /**
   * 마이그레이션 상태 확인
   */
  async status(): Promise<void> {
    try {
      await this.ensureMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file.filename)
      );

      console.log('\n📊 마이그레이션 상태:');
      console.log(`✅ 실행 완료: ${executedMigrations.length}개`);
      console.log(`⏳ 대기 중: ${pendingMigrations.length}개\n`);

      if (pendingMigrations.length > 0) {
        console.log('대기 중인 마이그레이션:');
        pendingMigrations.forEach((migration) => {
          console.log(`  - ${migration.filename}`);
        });
      }
    } catch (error) {
      console.error('마이그레이션 상태 확인 실패:', error);
      throw error;
    }
  }
}

