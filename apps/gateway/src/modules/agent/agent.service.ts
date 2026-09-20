import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type AgentHealthResponse = {
  ok?: unknown;
  status?: unknown;
  version?: unknown;
};

export interface AgentRun {
  runId: string;
  status: string;
  output?: string;
  error?: string;
  usage?: Record<string, unknown>;
}

interface AgentRunResponse {
  run_id?: unknown;
  status?: unknown;
  output?: unknown;
  error?: unknown;
  usage?: unknown;
}

@Injectable()
export class AgentService {
  private readonly baseUrl = process.env.HERMES_AGENT_BASE_URL;
  private readonly apiKey = process.env.HERMES_AGENT_API_KEY;

  async getHealth() {
    if (!this.baseUrl) {
      throw new ServiceUnavailableException('Hermes Agent is not configured');
    }

    try {
      const payload = await this.requestHealth();

      return {
        available: payload.ok === true || payload.status === 'ok',
        version:
          typeof payload.version === 'string' ? payload.version : undefined,
      };
    } catch {
      throw new ServiceUnavailableException('Hermes Agent is unavailable');
    }
  }

  async startRun(
    input: string,
    instructions: string,
    sessionId: string,
  ): Promise<AgentRun> {
    const payload = await this.requestRun('/v1/runs', {
      method: 'POST',
      body: JSON.stringify({
        input,
        instructions,
        session_id: sessionId,
      }),
    });

    if (!payload.run_id || typeof payload.run_id !== 'string') {
      throw new ServiceUnavailableException(
        'Hermes Agent returned an invalid task response',
      );
    }

    return this.toRun(payload);
  }

  async getRun(agentRunId: string): Promise<AgentRun> {
    return this.toRun(
      await this.requestRun(`/v1/runs/${encodeURIComponent(agentRunId)}`),
    );
  }

  async stopRun(agentRunId: string): Promise<AgentRun> {
    return this.toRun(
      await this.requestRun(`/v1/runs/${encodeURIComponent(agentRunId)}/stop`, {
        method: 'POST',
      }),
    );
  }

  private async requestRun(
    path: string,
    init: RequestInit = {},
  ): Promise<AgentRunResponse> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException(
        'Hermes Agent task API is not configured',
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`unexpected status ${response.status}`);
      }

      return (await response.json()) as AgentRunResponse;
    } catch {
      throw new ServiceUnavailableException(
        'Hermes Agent task API is unavailable',
      );
    }
  }

  private toRun(payload: AgentRunResponse): AgentRun {
    if (
      typeof payload.run_id !== 'string' ||
      typeof payload.status !== 'string'
    ) {
      throw new ServiceUnavailableException(
        'Hermes Agent returned an invalid task response',
      );
    }

    return {
      runId: payload.run_id,
      status: payload.status,
      ...(typeof payload.output === 'string' ? { output: payload.output } : {}),
      ...(typeof payload.error === 'string' ? { error: payload.error } : {}),
      ...(this.isRecord(payload.usage) ? { usage: payload.usage } : {}),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async requestHealth(): Promise<AgentHealthResponse> {
    const endpoints = ['/health', '/api/health'];

    for (const [index, endpoint] of endpoints.entries()) {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        return (await response.json()) as AgentHealthResponse;
      }

      const canTryLegacyEndpoint =
        response.status === 404 && index < endpoints.length - 1;

      if (!canTryLegacyEndpoint) {
        throw new Error(`unexpected status ${response.status}`);
      }
    }

    throw new Error('health endpoint is unavailable');
  }
}
