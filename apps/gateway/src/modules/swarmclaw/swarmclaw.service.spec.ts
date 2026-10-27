import { ServiceUnavailableException } from '@nestjs/common';

import { SwarmClawService } from './swarmclaw.service';

describe('SwarmClawService', () => {
  const originalBaseUrl = process.env.HERMES_SWARMCLAW_BASE_URL;
  const originalServiceKey = process.env.HERMES_SWARMCLAW_SERVICE_KEY;

  afterEach(() => {
    process.env.HERMES_SWARMCLAW_BASE_URL = originalBaseUrl;
    process.env.HERMES_SWARMCLAW_SERVICE_KEY = originalServiceKey;
    jest.restoreAllMocks();
  });

  it('starts an execution using only the Gateway service key', async () => {
    process.env.HERMES_SWARMCLAW_BASE_URL = 'http://hermes-swarmclaw:3456';
    process.env.HERMES_SWARMCLAW_SERVICE_KEY = 'private-key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ executionId: 'execution-1', status: 'queued' }),
    } as Response);
    const service = new SwarmClawService();

    const result = await service.startExecution({
      gatewayTaskId: 'task-1',
      providerConnectionId: 'connection-1',
      organizationId: 'organization-1',
      workspaceId: null,
      projectId: null,
      userId: 'user-1',
      title: 'Task',
      input: 'Input',
      instructions: 'Instructions',
    });

    expect(result).toEqual({ executionId: 'execution-1', status: 'queued' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://hermes-swarmclaw:3456/api/internal/hermes/executions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Hermes-Service-Key': 'private-key',
        }),
      }),
    );
  });

  it('rejects execution when private configuration is missing', async () => {
    delete process.env.HERMES_SWARMCLAW_BASE_URL;
    delete process.env.HERMES_SWARMCLAW_SERVICE_KEY;
    const service = new SwarmClawService();

    await expect(service.getExecution('execution-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('verifies the exact connection and returns only safe metadata', async () => {
    process.env.HERMES_SWARMCLAW_BASE_URL = 'http://hermes-swarmclaw:3456';
    process.env.HERMES_SWARMCLAW_SERVICE_KEY = 'private-key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        providerConnectionId: 'connection-1',
        provider: 'codex',
        authenticated: true,
        method: 'codex_login_status',
        token: 'must-not-return',
      }),
    } as Response);
    await expect(
      new SwarmClawService().verifyProviderConnection('connection-1'),
    ).resolves.toEqual({
      providerConnectionId: 'connection-1',
      provider: 'codex',
      authenticated: true,
      method: 'codex_login_status',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://hermes-swarmclaw:3456/api/internal/hermes/provider-connections/connection-1/verify',
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
  });

  it.each([
    {
      providerConnectionId: 'other',
      provider: 'codex',
      authenticated: true,
      method: 'codex_login_status',
    },
    {
      providerConnectionId: 'connection-1',
      provider: 'codex',
      authenticated: 'true',
      method: 'codex_login_status',
    },
    null,
  ])(
    'rejects an invalid or mismatched verification response',
    async (payload) => {
      process.env.HERMES_SWARMCLAW_BASE_URL = 'http://hermes-swarmclaw:3456';
      process.env.HERMES_SWARMCLAW_SERVICE_KEY = 'private-key';
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, json: async () => payload } as Response);
      await expect(
        new SwarmClawService().verifyProviderConnection('connection-1'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );
});
