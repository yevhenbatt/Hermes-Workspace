import { ServiceUnavailableException } from '@nestjs/common';

import { AgentService } from './agent.service';

describe('AgentService', () => {
  const originalBaseUrl = process.env.HERMES_AGENT_BASE_URL;
  const originalApiKey = process.env.HERMES_AGENT_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.HERMES_AGENT_BASE_URL = originalBaseUrl;
    process.env.HERMES_AGENT_API_KEY = originalApiKey;
    global.fetch = originalFetch;
  });

  it('starts a private Agent run with the configured bearer key', async () => {
    process.env.HERMES_AGENT_BASE_URL = 'http://hermes-agent:9119';
    process.env.HERMES_AGENT_API_KEY = 'test-agent-key';
    const fetchMock = jest.fn(
      async () =>
        new Response(JSON.stringify({ run_id: 'run_123', status: 'started' }), {
          status: 202,
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new AgentService();
    await expect(
      service.startRun(
        'Summarize this project',
        'Workspace context',
        'gateway-task-1',
      ),
    ).resolves.toEqual({ runId: 'run_123', status: 'started' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://hermes-agent:9119/v1/runs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-agent-key',
        }),
      }),
    );
  });

  it('does not call Agent when its task API key is missing', async () => {
    process.env.HERMES_AGENT_BASE_URL = 'http://hermes-agent:9119';
    delete process.env.HERMES_AGENT_API_KEY;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new AgentService();

    await expect(
      service.startRun('Task', 'Context', 'gateway-task-2'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
