import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type AgentHealthResponse = {
  ok?: unknown;
  version?: unknown;
};

@Injectable()
export class AgentService {
  private readonly baseUrl = process.env.HERMES_AGENT_BASE_URL;

  async getHealth() {
    if (!this.baseUrl) {
      throw new ServiceUnavailableException('Hermes Agent is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        throw new Error(`unexpected status ${response.status}`);
      }

      const payload = (await response.json()) as AgentHealthResponse;

      return {
        available: payload.ok === true,
        version: typeof payload.version === 'string' ? payload.version : undefined,
      };
    } catch {
      throw new ServiceUnavailableException('Hermes Agent is unavailable');
    }
  }
}
