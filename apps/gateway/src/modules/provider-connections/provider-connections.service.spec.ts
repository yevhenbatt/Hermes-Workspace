import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { ProviderConnectionsService } from './provider-connections.service';
import { SwarmClawService } from '../swarmclaw/swarmclaw.service';

jest.mock('@mikro-orm/postgresql', () => ({ MikroORM: class {} }));

describe('ProviderConnectionsService verification', () => {
  const connectionId = '6a5fb5be-ebaf-4aa9-af04-645b335510e6';
  const userId = 'a11eed4b-b570-407d-8634-004f81bff19b';
  const createFixture = (status = 'pending', provider = 'codex') => {
    const row = {
      id: connectionId,
      ownerUserId: userId,
      provider,
      displayName: 'Personal Codex',
      status,
    };
    const execute = jest
      .fn()
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([]);
    const orm = {
      em: { getConnection: () => ({ execute }) },
    } as unknown as MikroORM;
    const verifyProviderConnection = jest.fn().mockResolvedValue({
      providerConnectionId: connectionId,
      provider: 'codex',
      authenticated: true,
      method: 'codex_login_status',
    });
    const adapter = { verifyProviderConnection } as unknown as SwarmClawService;
    return {
      service: new ProviderConnectionsService(orm, adapter),
      execute,
      verifyProviderConnection,
    };
  };

  it('does not probe or mutate a connection owned by another user', async () => {
    const fixture = createFixture();
    fixture.execute.mockReset().mockResolvedValueOnce([]);
    await expect(
      fixture.service.verifyConnection('another-user', connectionId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(fixture.verifyProviderConnection).not.toHaveBeenCalled();
    expect(fixture.execute).toHaveBeenCalledTimes(1);
    expect(fixture.execute.mock.calls[0][1]).toEqual([
      connectionId,
      'another-user',
    ]);
  });

  it.each([
    ['revoked', 'codex'],
    ['pending', 'claude'],
  ])(
    'rejects status %s and provider %s without probing',
    async (status, provider) => {
      const fixture = createFixture(status, provider);
      await expect(
        fixture.service.verifyConnection(userId, connectionId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fixture.verifyProviderConnection).not.toHaveBeenCalled();
      expect(fixture.execute).toHaveBeenCalledTimes(2);
    },
  );

  it('activates a verified pending connection and audits in the same statement', async () => {
    const fixture = createFixture();
    fixture.execute.mockResolvedValueOnce([
      { id: connectionId, status: 'active', previousStatus: 'pending' },
    ]);
    await expect(
      fixture.service.verifyConnection(userId, connectionId),
    ).resolves.toEqual({
      id: connectionId,
      status: 'active',
      authenticated: true,
      verificationMethod: 'codex_login_status',
      changed: true,
    });
    expect(fixture.verifyProviderConnection).toHaveBeenCalledWith(connectionId);
    const [sql, params] = fixture.execute.mock.calls[2] as [string, unknown[]];
    expect(sql).toContain('for update of pc');
    expect(sql).toContain('insert into workspace.audit_events');
    expect(params).toEqual([
      connectionId,
      userId,
      'active',
      expect.any(String),
      userId,
      true,
      true,
    ]);
  });

  it('keeps failed authentication pending and disables an active connection', async () => {
    const fixture = createFixture('active');
    fixture.verifyProviderConnection.mockResolvedValueOnce({
      providerConnectionId: connectionId,
      provider: 'codex',
      authenticated: false,
      method: 'codex_login_status',
    });
    fixture.execute.mockResolvedValueOnce([
      { id: connectionId, status: 'pending', previousStatus: 'active' },
    ]);
    await expect(
      fixture.service.verifyConnection(userId, connectionId),
    ).resolves.toMatchObject({
      status: 'pending',
      authenticated: false,
      changed: true,
    });
    expect(fixture.execute.mock.calls[2][1][2]).toBe('pending');
  });

  it('leaves the database unchanged when SwarmClaw is unavailable', async () => {
    const fixture = createFixture();
    fixture.verifyProviderConnection.mockRejectedValueOnce(
      new ServiceUnavailableException(),
    );
    await expect(
      fixture.service.verifyConnection(userId, connectionId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fixture.execute).toHaveBeenCalledTimes(2);
  });

  it('does not reactivate a connection revoked during the remote check', async () => {
    const fixture = createFixture();
    fixture.execute.mockResolvedValueOnce([]);
    await expect(
      fixture.service.verifyConnection(userId, connectionId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechecks an active connection without reporting a status change', async () => {
    const fixture = createFixture('active');
    fixture.execute.mockResolvedValueOnce([
      { id: connectionId, status: 'active', previousStatus: 'active' },
    ]);
    await expect(
      fixture.service.verifyConnection(userId, connectionId),
    ).resolves.toMatchObject({ status: 'active', changed: false });
    expect(fixture.verifyProviderConnection).toHaveBeenCalledTimes(1);
  });
});
