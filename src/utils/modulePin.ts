export interface HashedModulePin {
  version: 1;
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  hash: string;
}

export type StoredModulePin = string | HashedModulePin;
export type ModulePinMap = Record<string, StoredModulePin>;

const PIN_PATTERN = /^\d{6}$/;
const PBKDF2_ITERATIONS = 210_000;

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const deriveHash = async (pin: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

export const isValidModulePin = (pin: string): boolean => PIN_PATTERN.test(pin);

export const isHashedModulePin = (value: unknown): value is HashedModulePin => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HashedModulePin>;
  return candidate.version === 1
    && candidate.algorithm === 'PBKDF2-SHA256'
    && typeof candidate.iterations === 'number'
    && candidate.iterations >= 100_000
    && typeof candidate.salt === 'string'
    && candidate.salt.length > 0
    && typeof candidate.hash === 'string'
    && candidate.hash.length > 0;
};

export const isModulePinConfigured = (value: unknown): value is StoredModulePin =>
  (typeof value === 'string' && isValidModulePin(value)) || isHashedModulePin(value);

export const createModulePin = async (pin: string): Promise<HashedModulePin> => {
  if (!isValidModulePin(pin)) {
    throw new Error('O PIN deve conter exatamente 6 dígitos.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    version: 1,
    algorithm: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    hash: await deriveHash(pin, salt, PBKDF2_ITERATIONS),
  };
};

export const verifyModulePin = async (pin: string, stored: StoredModulePin): Promise<boolean> => {
  if (!isValidModulePin(pin)) return false;
  // Compatibilidade temporária: valores antigos em texto puro são migrados após o primeiro desbloqueio.
  if (typeof stored === 'string') return pin === stored;
  if (!isHashedModulePin(stored)) return false;
  const candidateHash = await deriveHash(pin, base64ToBytes(stored.salt), stored.iterations);
  return candidateHash === stored.hash;
};

