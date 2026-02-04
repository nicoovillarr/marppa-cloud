import { Injectable } from '@nestjs/common';
import { CacheStorage } from '@/shared/domain/services/cache.service';

type Entry = { value: string; expires: number };

@Injectable()
export class InMemoryCacheService implements CacheStorage {
  private store = new Map<string, Entry>();
  private readonly defaultTtl = 3600; // 1h por defecto

  set<T>(key: string, value: T, ttlSeconds: number = this.defaultTtl): void {
    // Si el usuario pasa `undefined`, lo interpretamos como delete
    if (value === undefined) {
      this.store.delete(key);
      return;
    }

    const expires = Date.now() + ttlSeconds * 1000;

    // Serializamos con try/catch por seguridad
    try {
      const serialized = JSON.stringify(value);
      this.store.set(key, { value: serialized, expires });
    } catch {
      // Opcional: loggear o rethrow según política
      // Para no romper la app, podemos ignorar el set cuando no se puede serializar.
      // throw new Error(`Cache serialization failed for key ${key}: ${err}`);
      // Aquí opto por no lanzar para no interrumpir el flujo.
      /* noop */
    }
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }

    try {
      // Parse puede devolver null (si se guardó null)
      const parsed = JSON.parse(entry.value) as T;
      return parsed;
    } catch {
      // Si parse falla, eliminamos la entrada corrupta y devolvemos undefined
      this.store.delete(key);
      return undefined;
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
