import { ApiClient } from '../client';

export interface SystemStatus {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: boolean;
    redis: boolean;
    api: boolean;
  };
}

export class StatusApi extends ApiClient {
  async getStatus(): Promise<SystemStatus> {
    return this.get<SystemStatus>('/status');
  }

  async getHealth(): Promise<{ status: string }> {
    return this.get<{ status: string }>('/status/health');
  }

  async getVersion(): Promise<{ version: string }> {
    return this.get<{ version: string }>('/status/version');
  }
} 