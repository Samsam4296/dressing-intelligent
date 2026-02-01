# Test Suite

## Overview

Comprehensive test suite for the Dressing Intelligent application using Jest and React Native Testing Library.

## Test Structure

```
__tests__/
├── lib/                           # Library/utility tests
│   ├── logger.test.ts            # Logging with Sentry integration
│   ├── performance.test.ts       # Performance monitoring helpers
│   ├── storage.test.ts           # MMKV storage and helpers
│   └── utils.test.ts             # Utility functions
├── stores/                        # Zustand store tests
│   ├── auth.store.test.ts        # Authentication state management
│   ├── profile.store.test.ts     # Profile state management
│   └── settings.store.test.ts    # Settings state management
└── support/                       # Test infrastructure
    └── factories/                 # Data factories
        ├── index.ts              # Factory exports
        ├── profile.factory.ts    # Profile test data
        └── user.factory.ts       # User/Session test data
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run specific test file
pnpm test -- __tests__/stores/auth.store.test.ts

# Run tests with coverage
pnpm test -- --coverage

# Run tests matching pattern
pnpm test -- --testNamePattern="P1"
```

## Priority Tags

Tests are tagged with priority levels in their names:

- **[P0]**: Critical paths - run on every commit
- **[P1]**: High priority - core functionality
- **[P2]**: Medium priority - important but not critical
- **[P3]**: Low priority - edge cases

Example:
```typescript
it('[P1] sets session and user from session', () => { ... });
```

## Test Patterns

### Given-When-Then Format

All tests follow the Given-When-Then pattern with comments:

```typescript
it('[P1] should do something', () => {
  // GIVEN: Initial state
  const input = createMockData();

  // WHEN: Action is performed
  performAction(input);

  // THEN: Expected outcome
  expect(result).toEqual(expected);
});
```

### Factory Usage

Use factories for test data instead of hardcoded values:

```typescript
import { createMockUser, createMockSession } from '../support/factories';

const user = createMockUser();
const session = createMockSession(user);
```

### Store Testing

Zustand stores are tested directly via `getState()`:

```typescript
import { useAuthStore } from '@/stores/auth.store';

beforeEach(() => {
  useAuthStore.getState().reset();
});

it('sets user correctly', () => {
  useAuthStore.getState().setUser(mockUser);
  expect(useAuthStore.getState().user).toEqual(mockUser);
});
```

## Best Practices

1. **Isolation**: Each test should be independent - use `beforeEach` to reset state
2. **Deterministic**: No random values or timing-dependent assertions
3. **Descriptive names**: Test names should describe expected behavior
4. **One assertion per test**: Keep tests atomic
5. **No hardcoded data**: Use factories for all test data
6. **Mock external dependencies**: Storage, Sentry, etc. should be mocked

## Writing New Tests

1. Create test file in appropriate directory (`lib/`, `stores/`, `features/`)
2. Import factories and mocks from `support/`
3. Use priority tags `[P0]`, `[P1]`, `[P2]` in test names
4. Follow Given-When-Then format
5. Reset store state in `beforeEach`

## Coverage

Current focus areas:
- `lib/` - Utility functions, storage, logging, performance
- `stores/` - Zustand state management
- `features/` - Feature-specific logic and components
