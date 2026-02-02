/**
 * Storage Tests
 *
 * Tests for MMKV storage configuration and helpers.
 * @priority P1 - Foundation for app persistence
 */

// Unmock '@/lib/storage' to test the real implementation
// jest.setup.js mocks it globally, but we need the actual module here
jest.unmock('@/lib/storage');

// Create a shared store that persists across mock instances
const mockStore = new Map<string, string>();

// Mock MMKV with a persistent store
jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => mockStore.get(key),
      set: (key: string, value: string) => { mockStore.set(key, value); },
      delete: (key: string) => { mockStore.delete(key); },
      contains: (key: string) => mockStore.has(key),
      clearAll: () => { mockStore.clear(); },
      getAllKeys: () => Array.from(mockStore.keys()),
    })),
  };
});

// Mock Platform for encryption key logic
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Set dev environment for storage initialization
(global as any).__DEV__ = true;

import { STORAGE_KEYS, zustandStorage, storageHelpers, storage } from '@/lib/storage';

describe('Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the mock store directly to ensure clean state between tests
    mockStore.clear();
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
    it('[P1] getItem returns null for non-existent key', () => {
      // GIVEN: Empty storage
      // WHEN: Getting a non-existent key
      const result = zustandStorage.getItem('non-existent');

      // THEN: Returns null
      expect(result).toBeNull();
    });

    it('[P1] setItem and getItem work together', () => {
      // GIVEN: A value to store
      const testValue = JSON.stringify({ test: 'data' });

      // WHEN: Setting and getting the value
      zustandStorage.setItem('test-key', testValue);
      const result = zustandStorage.getItem('test-key');

      // THEN: Value is retrieved correctly
      expect(result).toBe(testValue);
    });

    it('[P1] removeItem deletes the key', () => {
      // GIVEN: An existing key
      zustandStorage.setItem('to-remove', 'value');

      // WHEN: Removing the key
      zustandStorage.removeItem('to-remove');
      const result = zustandStorage.getItem('to-remove');

      // THEN: Key no longer exists
      expect(result).toBeNull();
    });
  });

  describe('storageHelpers.getJSON', () => {
    it('[P1] returns parsed JSON for valid data', () => {
      // GIVEN: Valid JSON stored
      const testData = { name: 'test', count: 42 };
      storage.set('json-key', JSON.stringify(testData));

      // WHEN: Getting JSON
      const result = storageHelpers.getJSON<typeof testData>('json-key');

      // THEN: Returns parsed object
      expect(result).toEqual(testData);
    });

    it('[P1] returns null for non-existent key', () => {
      // GIVEN: No stored data
      // WHEN: Getting JSON for non-existent key
      const result = storageHelpers.getJSON('missing-key');

      // THEN: Returns null
      expect(result).toBeNull();
    });

    it('[P1] returns null for invalid JSON', () => {
      // GIVEN: Invalid JSON stored
      storage.set('invalid-json', 'not valid json {');

      // WHEN: Getting JSON
      const result = storageHelpers.getJSON('invalid-json');

      // THEN: Returns null (graceful handling)
      expect(result).toBeNull();
    });
  });

  describe('storageHelpers.setJSON', () => {
    it('[P1] stores JSON serialized value', () => {
      // GIVEN: An object to store
      const testData = { items: [1, 2, 3], active: true };

      // WHEN: Setting JSON
      storageHelpers.setJSON('json-data', testData);

      // THEN: Value is stored as JSON string
      const stored = storage.getString('json-data');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('[P1] handles nested objects', () => {
      // GIVEN: Nested object
      const nested = { user: { profile: { name: 'Test' } } };

      // WHEN: Setting and getting nested JSON
      storageHelpers.setJSON('nested', nested);
      const result = storageHelpers.getJSON<typeof nested>('nested');

      // THEN: Nested structure is preserved
      expect(result).toEqual(nested);
    });
  });

  describe('storageHelpers.has', () => {
    it('[P1] returns false for non-existent key', () => {
      // GIVEN: Empty storage
      // WHEN: Checking for non-existent key
      const result = storageHelpers.has('missing');

      // THEN: Returns false
      expect(result).toBe(false);
    });

    it('[P1] returns true for existing key', () => {
      // GIVEN: Existing key
      storage.set('exists', 'value');

      // WHEN: Checking for existing key
      const result = storageHelpers.has('exists');

      // THEN: Returns true
      expect(result).toBe(true);
    });
  });

  describe('storageHelpers.clearAll', () => {
    it('[P1] removes all stored data', () => {
      // GIVEN: Multiple stored keys
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      // WHEN: Clearing all
      storageHelpers.clearAll();

      // THEN: All keys are removed
      expect(storageHelpers.has('key1')).toBe(false);
      expect(storageHelpers.has('key2')).toBe(false);
    });
  });

  describe('storageHelpers.getAllKeys', () => {
    it('[P1] returns empty array when no keys', () => {
      // GIVEN: Empty storage
      storage.clearAll();

      // WHEN: Getting all keys
      const keys = storageHelpers.getAllKeys();

      // THEN: Returns empty array
      expect(keys).toEqual([]);
    });

    it('[P1] returns all stored keys', () => {
      // GIVEN: Multiple stored keys
      storage.set('alpha', 'a');
      storage.set('beta', 'b');

      // WHEN: Getting all keys
      const keys = storageHelpers.getAllKeys();

      // THEN: All keys are returned
      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
    });
  });
});
