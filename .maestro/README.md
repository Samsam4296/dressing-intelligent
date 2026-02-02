# E2E Tests with Maestro

Story 1.5: Création Premier Profil

## Installation

### macOS
```bash
brew install maestro
```

### Linux/Windows WSL
```bash
curl -Ls https://get.maestro.mobile.dev | bash
```

## Prerequisites

1. **Running Development Server**
   ```bash
   npm start
   ```

2. **iOS Simulator or Android Emulator**
   - iOS: Open Simulator.app
   - Android: Start emulator via Android Studio

3. **Test Users in Supabase**

   Create these users in your Supabase project:

   | Email | Password | Purpose |
   |-------|----------|---------|
   | test@example.com | testpassword123 | Existing user with profiles |
   | test-new@example.com | testpassword123 | New user without profiles |

## Running Tests

### Run all profile creation tests
```bash
maestro test .maestro/flows/profile-creation.yaml
```

### Run with custom test user
```bash
NEW_TEST_USER_EMAIL=mytest@example.com \
NEW_TEST_USER_PASSWORD=mypassword \
maestro test .maestro/flows/profile-creation.yaml
```

### Run specific flow
```bash
maestro test .maestro/flows/profile-creation.yaml --flow "First Profile Creation"
```

### Debug mode (slower, with visual feedback)
```bash
maestro test .maestro/flows/profile-creation.yaml --debug
```

### Record video
```bash
maestro record .maestro/flows/profile-creation.yaml
```

## Test Flows

### profile-creation.yaml

| Flow | Description | Story AC |
|------|-------------|----------|
| First Profile Creation | Happy path: enter name, create profile | AC#1, AC#5, AC#6, AC#8 |
| Name Validation - Too Short | Tests 1-char name rejection | AC#2, AC#11 |
| Name Validation - Too Long | Tests maxLength cap at 30 | AC#2 |
| Name with Accents | Tests French names (Émilie) | AC#2 |
| Offline Error | Tests network check (manual) | Dev Notes |

## Troubleshooting

### "App not found"
Build the app first:
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### "Element not visible"
- Check that `testID` props are set in React Native components
- Increase timeout in test file
- Use `maestro studio` to explore the view hierarchy

### Running in CI
```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: |
    npm install
    maestro test .maestro/flows/
```

## Writing New Tests

1. Add `testID` to components:
   ```tsx
   <TextInput testID="my-input" />
   ```

2. Create flow in `.maestro/flows/`:
   ```yaml
   - tapOn:
       id: "my-input"
   - inputText: "Hello"
   ```

3. Run with Maestro Studio for debugging:
   ```bash
   maestro studio
   ```
