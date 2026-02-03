/**
 * Storage Tests
 *
 * Tests for AsyncStorage-based storage configuration and helpers.
 * @priority P1 - Foundation for app persistence
 */

// Reset modules to allow re-mocking
jest.resetModules();

// Mock AsyncStorage with a functional in-memory implementation
jest.mock('@react-native-async-storage/async-storage', () => {
  // Initialize store in module scope
  const store = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
      multiGet: jest.fn((keys: string[]) =>
        Promise.resolve(keys.map((key) => [key, store.get(key) ?? null]))
      ),
      multiSet: jest.fn((pairs: [string, string][]) => {
        pairs.forEach(([key, value]) => store.set(key, value));
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        keys.forEach((key) => store.delete(key));
        return Promise.resolve();
      }),
      // Expose store for test cleanup
      __store: store,
    },
  };
});

// Unmock the storage module to test the real implementation
jest.unmock('@/lib/storage');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, zustandStorage, storageHelpers } from '@/lib/storage';

describe('Storage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear the mock store between tests using the exposed __store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AsyncStorage as any).__store?.clear();
  });

  describe('STORAGE_KEYS', () => {
    it('[P1] defines all required storage keys', () => {
      // GIVEN: Storage keys constant
      // WHEN: Accessing defined keys
      // THEN: All expected keys are defined
      expect(STORAGE_KEYS.AUTH_STATE).toBe('auth-state');
      expect(STORAGE_KEYS.PROFILE_STATE).toBe('profile-state');
      expect(STORAGE_KEYS.SETTINGS_STATE).toBe('settings-state');
      expect(STORAGE_KEYS.WARDROBE_CACHE).toBe('wardrobe-cache');
      expect(STORAGE_KEYS.RECOMMENDATIONS_CACHE).toBe('recommendations-cache');
      expect(STORAGE_KEYS.LAST_SYNC).toBe('last-sync');
    });

    it('[P1] keys are readonly (as const)', () => {
      // GIVEN: Storage keys constant
      // WHEN: Checking type
      // THEN: Type is string literal (via TypeScript, runtime check for existence)
      expect(typeof STORAGE_KEYS.AUTH_STATE).toBe('string');
      expect(Object.keys(STORAGE_KEYS).length).toBe(6);
    });
  });

  describe('zustandStorage', () => {
    it('[P1] getItem returns null for non-existent key', async () => {
      // GIVEN: Empty storage
      // WHEN: Getting a non-existent key
      const result = await zustandStorage.getItem('non-existent');

      // THEN: Returns null
      expect(result).toBeNull();
    });

    it('[P1] setItem and getItem work together', async () => {
      // GIVEN: A value to store
      const testValue = JSON.stringify({ test: 'data' });

      // WHEN: Setting and getting the value
      await zustandStorage.setItem('test-key', testValue);
      const result = await zustandStorage.getItem('test-key');

      // THEN: Value is retrieved correctly
      expect(result).toBe(testValue);
    });

    it('[P1] removeItem deletes the key', async () => {
      // GIVEN: An existing key
      await zustandStorage.setItem('to-remove', 'value');

      // WHEN: Removing the key
      await zustandStorage.removeItem('to-remove');
      const result = await zustandStorage.getItem('to-remove');

      // THEN: Key no longer exists
      expect(result).toBeNull();
    });
  });

  describe('storageHelpers.getJSON', () => {
    it('[P1] returns parsed JSON for valid data', async () => {
      // GIVEN: Valid JSON stored
      const testData = { name: 'test', count: 42 };
      await AsyncStorage.setItem('json-key', JSON.stringify(testData));

      // WHEN: Getting JSON
      const result = await storageHelpers.getJSON<typeof testData>('json-key');

      // THEN: Returns parsed object
      expect(result).toEqual(testData);
    });

    it('[P1] returns null for non-existent key', async () => {
      // GIVEN: No stored data
      // WHEN: Getting JSON for non-existent key
      const result = await storageHelpers.getJSON('missing-key');

      // THEN: Returns null
      expect(result).toBeNull();
    });

    it('[P1] returns null for invalid JSON', async () => {
      // GIVEN: Invalid JSON stored
      await AsyncStorage.setItem('invalid-json', 'not valid json {');

      // WHEN: Getting JSON
      const result = await storageHelpers.getJSON('invalid-json');

      // THEN: Returns null (graceful handling)
      expect(result).toBeNull();
    });
  });

  describe('storageHelpers.setJSON', () => {
    it('[P1] stores JSON serialized value', async () => {
      // GIVEN: An object to store
      const testData = { items: [1, 2, 3], active: true };

      // WHEN: Setting JSON
      await storageHelpers.setJSON('json-data', testData);

      // THEN: Value is stored as JSON string
      const stored = await AsyncStorage.getItem('json-data');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('[P1] handles nested objects', async () => {
      // GIVEN: Nested object
      const nested = { user: { profile: { name: 'Test' } } };

      // WHEN: Setting and getting nested JSON
      await storageHelpers.setJSON('nested', nested);
      const result = await storageHelpers.getJSON<typeof nested>('nested');

      // THEN: Nested structure is preserved
      expect(result).toEqual(nested);
    });
  });

  describe('storageHelpers.has', () => {
    it('[P1] returns false for non-existent key', async () => {
      // GIVEN: Empty storage
      // WHEN: Checking for non-existent key
      const result = await storageHelpers.has('missing');

      // THEN: Returns false
      expect(result).toBe(false);
    });

    it('[P1] returns true for existing key', async () => {
      // GIVEN: Existing key
      await AsyncStorage.setItem('exists', 'value');

      // WHEN: Checking for existing key
      const result = await storageHelpers.has('exists');

      // THEN: Returns true
      expect(result).toBe(true);
    });
  });

  describe('storageHelpers.clearAll', () => {
    it('[P1] removes all stored data', async () => {
      // GIVEN: Multiple stored keys
      await AsyncStorage.setItem('key1', 'value1');
      await AsyncStorage.setItem('key2', 'value2');

      // WHEN: Clearing all
      await storageHelpers.clearAll();

      // THEN: All keys are removed
      expect(await storageHelpers.has('key1')).toBe(false);
      expect(await storageHelpers.has('key2')).toBe(false);
    });
  });

  describe('storageHelpers.getAllKeys', () => {
    it('[P1] returns empty array when no keys', async () => {
      // GIVEN: Empty storage
      await AsyncStorage.clear();

      // WHEN: Getting all keys
      const keys = await storageHelpers.getAllKeys();

      // THEN: Returns empty array
      expect(keys).toEqual([]);
    });

    it('[P1] returns all stored keys', async () => {
      // GIVEN: Multiple stored keys
      await AsyncStorage.setItem('alpha', 'a');
      await AsyncStorage.setItem('beta', 'b');

      // WHEN: Getting all keys
      const keys = await storageHelpers.getAllKeys();

      // THEN: All keys are returned
      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
    });
  });
});
