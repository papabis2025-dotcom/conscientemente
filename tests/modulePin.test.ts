import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createModulePin,
  isHashedModulePin,
  isModulePinConfigured,
  verifyModulePin,
} from '../src/utils/modulePin.ts';

test('cria um registro PBKDF2 e valida somente o PIN correto', async () => {
  const stored = await createModulePin('123456');

  assert.equal(isHashedModulePin(stored), true);
  assert.equal(isModulePinConfigured(stored), true);
  assert.equal(await verifyModulePin('123456', stored), true);
  assert.equal(await verifyModulePin('654321', stored), false);
  assert.equal(JSON.stringify(stored).includes('123456'), false);
});

test('mantém compatibilidade de leitura com PIN legado para permitir migração', async () => {
  assert.equal(await verifyModulePin('112233', '112233'), true);
  assert.equal(await verifyModulePin('000000', '112233'), false);
});

test('rejeita PINs fora do formato de seis dígitos', async () => {
  await assert.rejects(() => createModulePin('12345'));
  assert.equal(await verifyModulePin('abcdef', 'abcdef'), false);
  assert.equal(isModulePinConfigured('12345'), false);
});

