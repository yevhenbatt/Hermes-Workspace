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

export interface SwarmClawProviderVerification {
  providerConnectionId: string;
  provider: 'codex';
  authenticated: boolean;
  method: 'codex_login_status';
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
    return this.toExecution(
      await this.request('/api/internal/hermes/executions', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    );
  }

  async getExecution(executionId: string): Promise<SwarmClawExecution> {
    return this.toExecution(
      await this.request(
        `/api/internal/hermes/executions/${encodeURIComponent(executionId)}`,
      ),
    );
  }

  async stopExecution(executionId: string): Promise<SwarmClawExecution> {
    return this.toExecution(
      await this.request(
        `/api/internal/hermes/executions/${encodeURIComponent(executionId)}/stop`,
        { method: 'POST' },
      ),
    );
  }

  async verifyProviderConnection(
    connectionId: string,
  ): Promise<SwarmClawProviderVerification> {
    const payload = await this.request(
      `/api/internal/hermes/provider-connections/${encodeURIComponent(connectionId)}/verify`,
      { method: 'POST' },
    );
    if (!payload || typeof payload !== 'object') {
      throw new ServiceUnavailableException(
        'SwarmClaw returned an invalid verification response',
      );
    }
    const result = payload as Record<string, unknown>;
    if (
      result.providerConnectionId !== connectionId ||
      result.provider !== 'codex' ||
      typeof result.authenticated !== 'boolean' ||
      result.method !== 'codex_login_status'
    ) {
      throw new ServiceUnavailableException(
        'SwarmClaw returned an invalid verification response',
      );
    }
    return {
      providerConnectionId: connectionId,
      provider: 'codex',
      authenticated: result.authenticated,
      method: 'codex_login_status',
    };
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
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
        redirect: 'error',
      });
      if (!response.ok) {
        throw new Error(`unexpected status ${response.status}`);
      }
      return await response.json();
    } catch {
      throw new ServiceUnavailableException(
        'SwarmClaw private executor is unavailable',
      );
    }
  }

  private toExecution(value: unknown): SwarmClawExecution {
    if (!value || typeof value !== 'object') {
      throw new ServiceUnavailableException(
        'SwarmClaw returned an invalid execution response',
      );
    }
    const payload = value as SwarmClawExecutionResponse;
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
