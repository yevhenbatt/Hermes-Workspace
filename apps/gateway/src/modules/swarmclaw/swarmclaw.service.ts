import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface SwarmClawExecutionRequest {
  gatewayTaskId: string;
  providerConnectionId: string;
  organizationId: string;
  workspaceId: string | null;
  projectId: string | null;
  userId: string;
  title: string;
  input: string;
  instructions: string;
}

export interface SwarmClawExecution {
  executionId: string;
  status: string;
  output?: string;
  error?: string;
}

interface SwarmClawExecutionResponse {
  executionId?: unknown;
  status?: unknown;
  output?: unknown;
  error?: unknown;
}

@Injectable()
export class SwarmClawService {
  private readonly baseUrl = process.env.HERMES_SWARMCLAW_BASE_URL;
  private readonly serviceKey = process.env.HERMES_SWARMCLAW_SERVICE_KEY;

  async startExecution(
    request: SwarmClawExecutionRequest,
  ): Promise<SwarmClawExecution> {
    return this.request('/api/internal/hermes/executions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getExecution(executionId: string): Promise<SwarmClawExecution> {
    return this.request(
      `/api/internal/hermes/executions/${encodeURIComponent(executionId)}`,
    );
  }

  async stopExecution(executionId: string): Promise<SwarmClawExecution> {
    return this.request(
      `/api/internal/hermes/executions/${encodeURIComponent(executionId)}/stop`,
      { method: 'POST' },
    );
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<SwarmClawExecution> {
    if (!this.baseUrl || !this.serviceKey) {
      throw new ServiceUnavailableException(
        'SwarmClaw private executor is not configured',
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-Hermes-Service-Key': this.serviceKey,
          ...init.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`unexpected status ${response.status}`);
      }
      return this.toExecution(
        (await response.json()) as SwarmClawExecutionResponse,
      );
    } catch {
      throw new ServiceUnavailableException(
        'SwarmClaw private executor is unavailable',
      );
    }
  }

  private toExecution(payload: SwarmClawExecutionResponse): SwarmClawExecution {
    if (
      typeof payload.executionId !== 'string' ||
      typeof payload.status !== 'string'
    ) {
      throw new ServiceUnavailableException(
        'SwarmClaw returned an invalid execution response',
      );
    }
    return {
      executionId: payload.executionId,
      status: payload.status,
      ...(typeof payload.output === 'string' ? { output: payload.output } : {}),
      ...(typeof payload.error === 'string' ? { error: payload.error } : {}),
    };
  }
}
