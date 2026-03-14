export type AccessLogDevice = 'PC' | 'Mobile';

export interface AccessLog {
  id: number;
  user_id: string;
  accessed_at: Date;
  ip: string | null;
  url: string;
  device: AccessLogDevice;
}

export interface AccessLogWithUserName extends AccessLog {
  user_name: string;
}

export interface CreateAccessLogDTO {
  user_id: string;
  accessed_at: Date;
  ip: string | null;
  url: string;
  device: AccessLogDevice;
}
