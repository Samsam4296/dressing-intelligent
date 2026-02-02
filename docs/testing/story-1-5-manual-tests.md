# Story 1.5: Création Premier Profil - Manual Testing Checklist

## Overview

Test Date: ____________
Tester: ____________
Device: ____________
OS Version: ____________
App Version: ____________

## Prerequisites

- [ ] App is installed on device
- [ ] Fresh user account created (no existing profiles)
- [ ] Device has internet connection
- [ ] Supabase backend is running

---

## Test Cases

### TC-1: Profile Creation Form Display (AC#1)

**Steps:**
1. Sign in with a new user (no profiles)
2. Verify automatic redirect to profile creation screen

**Expected Results:**
- [ ] Header "Créer votre profil" is visible
- [ ] Subtitle "Personnalisez votre expérience" is visible
- [ ] Avatar picker is visible (circular, with camera icon)
- [ ] "Nom du profil" label is visible
- [ ] Text input with placeholder "Emma, Lucas, Sophie..." is visible
- [ ] Character counter "2-30 caractères" is visible
- [ ] "Créer mon profil" button is visible
- [ ] Button is disabled initially (grayed out)

**Result:** [ ] PASS / [ ] FAIL

**Notes:**
```


```

---

### TC-2: Name Validation - Minimum Length (AC#2)

**Steps:**
1. Tap on the name input field
2. Enter "A" (single character)
3. Observe validation feedback

**Expected Results:**
- [ ] Character counter shows "1/30"
- [ ] Error message appears: "Le nom doit contenir au moins 2 caractères"
- [ ] Input border turns red
- [ ] Button remains disabled

**Result:** [ ] PASS / [ ] FAIL

---

### TC-3: Name Validation - Valid Name (AC#2)

**Steps:**
1. Clear the input field
2. Enter "Em" (2 characters)
3. Observe validation feedback

**Expected Results:**
- [ ] Character counter shows "2/30"
- [ ] No error message
- [ ] Input border is normal
- [ ] Button becomes enabled (blue)

**Result:** [ ] PASS / [ ] FAIL

---

### TC-4: Name Validation - Maximum Length (AC#2)

**Steps:**
1. Clear the input field
2. Enter exactly 30 characters
3. Try to enter a 31st character

**Expected Results:**
- [ ] Input accepts exactly 30 characters
- [ ] 31st character is not accepted (maxLength)
- [ ] Character counter shows "30/30"
- [ ] Button is enabled

**Result:** [ ] PASS / [ ] FAIL

---

### TC-5: Name with Accents (AC#2)

**Steps:**
1. Clear the input field
2. Enter "Émilie" or "François"

**Expected Results:**
- [ ] Accented characters are accepted
- [ ] Character count is correct
- [ ] Button is enabled

**Result:** [ ] PASS / [ ] FAIL

---

### TC-6: Name with Spaces (AC#2)

**Steps:**
1. Clear the input field
2. Enter "Jean Marie"

**Expected Results:**
- [ ] Spaces are accepted
- [ ] Character count includes spaces
- [ ] Button is enabled

**Result:** [ ] PASS / [ ] FAIL

---

### TC-7: Avatar Selection (AC#3)

**Steps:**
1. Tap on the avatar picker
2. Grant camera/photo permissions if prompted
3. Select an image from gallery
4. Observe the avatar preview

**Expected Results:**
- [ ] Permission request appears (first time)
- [ ] Image picker opens
- [ ] Selected image appears in avatar circle
- [ ] Default camera icon is replaced by the image

**Result:** [ ] PASS / [ ] FAIL

---

### TC-8: Profile Creation Success (AC#5, AC#6, AC#8)

**Steps:**
1. Enter a valid name (e.g., "Emma")
2. Optionally select an avatar
3. Tap "Créer mon profil"
4. Wait for creation to complete

**Expected Results:**
- [ ] Button shows loading spinner during creation
- [ ] Haptic feedback occurs on success (vibration)
- [ ] App navigates to main screen (tabs)
- [ ] Profile creation screen is no longer visible

**Result:** [ ] PASS / [ ] FAIL

---

### TC-9: First Profile is Active (AC#6)

**Steps:**
1. Create first profile as above
2. Check profile state (via developer tools or API)

**Expected Results:**
- [ ] Profile has `is_active: true` in database
- [ ] Profile appears in user's profile list

**Result:** [ ] PASS / [ ] FAIL

---

### TC-10: Avatar Upload (AC#7)

**Steps:**
1. Select an avatar before creating profile
2. Create the profile
3. Check Supabase Storage

**Expected Results:**
- [ ] Avatar is uploaded to `avatars` bucket
- [ ] Storage path format: `{user_id}/{profile_id}.jpg`
- [ ] Signed URL is generated

**Result:** [ ] PASS / [ ] FAIL

---

### TC-11: Touch Targets (AC#9)

**Steps:**
1. Measure button and input heights
2. Test touch responsiveness on edges

**Expected Results:**
- [ ] Create button min-height is 56px (≥44px requirement)
- [ ] Text input min-height is 56px (≥44px requirement)
- [ ] Tapping near edges still triggers action

**Result:** [ ] PASS / [ ] FAIL

---

### TC-12: Dark Mode Support (AC#10)

**Steps:**
1. Switch device to Dark Mode (Settings > Display)
2. Return to app
3. Navigate to profile creation screen

**Expected Results:**
- [ ] Background is dark (gray-900)
- [ ] Text is white/light gray
- [ ] Input field has dark background
- [ ] Button is visible with appropriate contrast
- [ ] No white/light elements bleeding through

**Result:** [ ] PASS / [ ] FAIL

---

### TC-13: Error Messages in French (AC#11)

**Steps:**
1. Enter invalid name (1 char)
2. Observe error message

**Expected Results:**
- [ ] Error message is in French: "Le nom doit contenir au moins 2 caractères"
- [ ] No English error messages

**Result:** [ ] PASS / [ ] FAIL

---

### TC-14: Haptic Feedback (AC#12)

**Steps:**
1. Enter invalid name, tap create button
2. Enter valid name, tap create button (success)

**Expected Results:**
- [ ] Error haptic (vibration pattern) on validation error
- [ ] Success haptic (different pattern) on successful creation

**Result:** [ ] PASS / [ ] FAIL

---

### TC-15: Offline Mode (Dev Notes)

**Steps:**
1. Enable Airplane Mode on device
2. Enter a valid name
3. Tap "Créer mon profil"

**Expected Results:**
- [ ] Alert appears: "Pas de connexion"
- [ ] Message: "Une connexion internet est requise pour créer votre profil"
- [ ] Profile is NOT created
- [ ] User remains on creation screen

**Result:** [ ] PASS / [ ] FAIL

---

### TC-16: Duplicate Name Error (FR1)

**Steps:**
1. Create a profile with name "Emma"
2. Log out, log back in
3. Try to create another profile with name "Emma"

**Expected Results:**
- [ ] Error message appears (French)
- [ ] Message indicates name already exists
- [ ] Profile is NOT created

**Result:** [ ] PASS / [ ] FAIL

---

### TC-17: Keyboard Handling

**Steps:**
1. Tap on name input
2. Verify keyboard appears
3. Scroll if needed
4. Tap "return" key on keyboard

**Expected Results:**
- [ ] Keyboard opens smoothly
- [ ] Screen scrolls to keep input visible
- [ ] Tapping "return" submits the form (if valid)
- [ ] Keyboard dismisses appropriately

**Result:** [ ] PASS / [ ] FAIL

---

### TC-18: Animation Feedback

**Steps:**
1. Enter invalid name
2. Tap create button
3. Observe input field

**Expected Results:**
- [ ] Input field shakes horizontally
- [ ] Button has press animation (scale)

**Result:** [ ] PASS / [ ] FAIL

---

## Summary

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| Form Display (AC#1) | | | |
| Name Validation (AC#2) | | | |
| Avatar (AC#3, AC#7) | | | |
| Data Persistence (AC#5, AC#6) | | | |
| Navigation (AC#8) | | | |
| Accessibility (AC#9) | | | |
| Dark Mode (AC#10) | | | |
| French Messages (AC#11) | | | |
| Haptic Feedback (AC#12) | | | |
| Offline Handling | | | |

**Total:** ___/18 tests passed

## Issues Found

| # | Description | Severity | Screenshot |
|---|-------------|----------|------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Sign-off

Tester Signature: _________________ Date: _____________

Developer Review: _________________ Date: _____________
