import * as Crypto from 'expo-crypto';

/** Collision-resistant unique id (UUID v4) for every persisted entity. */
export function newId(): string {
  return Crypto.randomUUID();
}
