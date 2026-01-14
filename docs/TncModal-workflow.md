# TncModal Component - Workflow Documentation

## Overview

The `TncModal` component (`src/components/TncModal.tsx`) handles the Terms and Conditions (T&C) agreement flow for users before they can interact with the dApp.

---

## What is Mixpanel?

**Mixpanel** is a product analytics tool used for tracking user behavior and events. In this codebase:

- **Client-side** (browser): Imported via `mixpanel-browser` package
- **Server-side** (API routes): Imported via `mixpanel` package

### Initialization

- Client-side: `template.tsx:26` - `mixpanel.init('118f29da6a372f0ccb6f541079cad56b')`
- Server-side: `api/tnc/signUser/route.ts:9` - `Mixpanel.init('118f29da6a372f0ccb6f541079cad56b')`

### Events Tracked in TncModal

| Event                | Location                       | When                                   |
| -------------------- | ------------------------------ | -------------------------------------- |
| `TnC agreed`         | `TncModal.tsx:169`             | User clicks "Agree" button             |
| `TnC declined`       | `TncModal.tsx:263`             | User clicks "Disconnect" button        |
| `TnC signing failed` | `TncModal.tsx:158`             | Signature processing fails             |
| `TnC signed`         | `api/tnc/signUser/route.ts:72` | Server verifies signature successfully |

---

## Current Workflow (What Happens When User Clicks "Agree")

### Step 1: Modal Display Logic (`TncModal.tsx:75-81`)

```typescript
useEffect(() => {
  if (!userTncInfo && address) {
    onOpen(); // Show modal if user hasn't signed and wallet is connected
  } else {
    onClose(); // Hide modal
  }
}, [userTncInfo, address]);
```

### Step 2: User TnC Status Check (`UserTnCAtom`)

```typescript
// Current implementation (SIMPLIFIED - session storage only)
export const UserTnCAtom = atomWithQuery((get) => {
  return {
    queryKey: ['tnc', get(addressAtom), get(referralCodeAtom)],
    queryFn: async (): Promise<boolean> => {
      const tncSigned = sessionStorage.getItem('RE7_Aggregator_tncSigned');
      return tncSigned === 'true';
    },
  };
});
```

**Note:** The actual API call to `/api/tnc/getUser/${address}` is commented out. Currently only checks session storage.

### Step 3: Handle Sign (`TncModal.tsx:165-176`)

```typescript
const handleSign = async () => {
  if (!address || !account) return;

  mixpanel.track('TnC agreed', { address }); // Track event
  sessionStorage.setItem('RE7_Aggregator_tncSigned', 'true'); // Store locally
  onClose(); // Close modal
  return;

  // COMMENTED OUT: Actual signature flow
  // setIsSigningPending(true);
  // signTypedData();
};
```

**Current State:** The actual blockchain signature flow is **bypassed**. Only session storage is used.

### Step 4: Signature Verification (CURRENTLY DISABLED)

When enabled, the flow would be:

1. `signTypedData()` triggers wallet signature request
2. User signs the typed data message (EIP-712 style)
3. `useEffect` at line 125 processes the signature
4. POST to `/api/tnc/signUser` with address and signature
5. Server verifies signature on-chain
6. Server updates database with signature record

---

## Database Schema (Prisma)

### User Model

```prisma
model User {
  id            Int           @id @default(autoincrement())
  address       String        @unique
  isTncSigned   Boolean?      @default(false)
  message       String?       // Stores the signature
  tncDocVersion String?       @default("1.0")
  referralCode  String        @unique
  Signatures    Signatures[]  // Historical signatures
  // ... other fields
}
```

### Signatures Model

```prisma
model Signatures {
  id            Int      @id @default(autoincrement())
  signature     String
  tncDocVersion String
  createdAt     DateTime @default(now())
  userId        Int
  User          User     @relation(fields: [userId], references: [id])

  @@unique([userId, tncDocVersion], name: "unique_signature")
}
```

---

## API Routes

### GET `/api/tnc/getUser/[address]`

**Purpose:** Fetch user's T&C status from database

**Returns:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "address": "0x...",
    "isTncSigned": true,
    "tncDocVersion": "tnc/v1",
    "Signatures": [...]
  }
}
```

### POST `/api/tnc/signUser`

**Purpose:** Verify and store user's T&C signature

**Payload:**

```json
{
  "address": "0x...",
  "signature": "[\"sig1\", \"sig2\"]"
}
```

**Flow:**

1. Parse and validate address/signature
2. Hash the `SIGNING_DATA` message
3. Verify signature on-chain (tries both `is_valid_signature` and `isValidSignature`)
4. If valid, update `User.isTncSigned = true` and create `Signatures` record
5. Return success/failure

---

## Constants (`src/constants.ts`)

```typescript
export const LATEST_TNC_DOC_VERSION = 'tnc/v1';
export const RE7_TnC_DOC_URL = `https://www.re7labs.xyz/terms`;

export const SIGNING_DATA = {
  types: {
    StarkNetDomain: [...],
    Tnc: [
      { name: 'message', type: 'felt' },
      { name: 'document', type: 'felt' },
    ],
  },
  primaryType: 'Tnc',
  domain: {
    name: 'Re7 Labs',
    version: '1',
    chainId: getNetwork(),
  },
  message: {
    message: 'Read and Agree T&C',
    document: `www.re7labs.xyz/terms...` // truncated URL
  },
};
```

---

## Component Hierarchy

```
template.tsx
  └── Navbar.tsx
        └── TncModal.tsx (line 285)
```

The `TncModal` is rendered inside `Navbar`, which is rendered on every page via `template.tsx`.

---

## Current Issues / What Needs to Change for v2

### 1. Signature Flow is Bypassed

The actual signature verification is commented out. Users just click "Agree" and it's stored in session storage only (clears when browser closes).

### 2. No Version Checking

Currently no check for `tncDocVersion` to force re-signing when T&C is updated.

### 3. T&C Page Should Be Exempt

The new `/terms-and-conditions` route should not show the modal (users need to read before signing).

### 4. No Real Blocking of Interactions

While the modal blocks the UI visually, API routes don't check T&C status before allowing transactions.

### 5. API Security Concerns

- No CORS restrictions on API routes
- API routes don't verify T&C acceptance before allowing other actions

---

## Files to Modify for v2

| File                                         | Changes Needed                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/constants.ts`                           | Update `LATEST_TNC_DOC_VERSION` to `'tnc/v2'`, update `SIGNING_DATA.message.document` |
| `src/components/TncModal.tsx`                | Re-enable signature flow, add version checking, exempt T&C page                       |
| `src/app/api/tnc/signUser/route.ts`          | No changes needed (already handles versioning)                                        |
| `src/app/api/tnc/getUser/[address]/route.ts` | No changes needed                                                                     |
| Other API routes                             | Add T&C verification middleware if needed                                             |

---

## T&C Page Setup (Already Done)

- Route: `/terms-and-conditions`
- Files:
  - `src/app/terms-and-conditions/page.mdx` - MDX content
  - `src/app/terms-and-conditions/layout.tsx` - Layout wrapper
  - `src/mdx-components.tsx` - MDX component mappings

---

## v2 Implementation Plan

### Approach: Click-to-Agree with DB Storage

We will use a simple click-to-agree flow (not wallet signatures) because:

- Works for all accounts (deployed or not) - wallet signatures fail for undeployed accounts
- Less friction for users (no wallet popup)
- Still legally valid as electronic consent
- Simpler implementation

The old wallet signature code will be removed (not just commented).

---

### Implementation Steps

#### Phase 1: Constants Update

**File:** `src/constants.ts`

```typescript
// Change from:
export const LATEST_TNC_DOC_VERSION = 'tnc/v1';
export const RE7_TnC_DOC_URL = `https://www.re7labs.xyz/terms`;

// Change to:
export const LATEST_TNC_DOC_VERSION = 'tnc/v2';
export const RE7_TnC_DOC_URL = `/terms-and-conditions`; // In-app URL
```

**Note:** The `SIGNING_DATA` constant can be removed or kept for potential future use.

---

#### Phase 2: New API Route - Accept T&C

**File:** `src/app/api/tnc/accept/route.ts` (NEW)

Create a new endpoint that handles T&C acceptance without wallet signature:

```typescript
// POST /api/tnc/accept
// Body: { address: string, referrerAddress?: string }
//
// Flow:
// 1. Validate and standardise address
// 2. Check if user exists in DB
//    - If NO: Create user with:
//      - address
//      - referralCode: generated server-side (6 alphanumeric chars)
//      - isTncSigned: true
//      - tncDocVersion: LATEST_TNC_DOC_VERSION
//      - Handle referrer if provided (update referrer's referralCount)
//    - If YES: Update user:
//      - isTncSigned: true
//      - tncDocVersion: LATEST_TNC_DOC_VERSION
// 3. Create Signatures record:
//    - signature: "click-to-agree" (not a real signature)
//    - tncDocVersion: LATEST_TNC_DOC_VERSION
// 4. Return { success: true, user }
```

**Referral Code Generation** (server-side):

```typescript
function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8); // e.g., "k8m2p4"
}
```

This is the same format used elsewhere in the codebase (6 alphanumeric characters).

---

#### Phase 3: Update UserTnCAtom

**File:** `src/components/TncModal.tsx`

Change from sessionStorage to API-based check with version validation:

```typescript
export const UserTnCAtom = atomWithQuery((get) => {
  return {
    queryKey: ['tnc', get(addressAtom)],
    queryFn: async (): Promise<boolean> => {
      const address = get(addressAtom);
      if (!address) return false;

      try {
        const res = await axios.get(`/api/tnc/getUser/${address}`);
        if (res.data?.success && res.data?.user) {
          const user = res.data.user;
          // Check BOTH signed AND correct version
          return (
            user.isTncSigned === true &&
            user.tncDocVersion === LATEST_TNC_DOC_VERSION
          );
        }
        return false;
      } catch {
        return false;
      }
    },
  };
});
```

---

#### Phase 4: Update TncModal Component

**File:** `src/components/TncModal.tsx`

**4.1: Exempt T&C page from modal**

```typescript
import { usePathname } from 'next/navigation';

// Inside component:
const pathname = usePathname();
const isTncPage = pathname === '/terms-and-conditions';

useEffect(() => {
  if (isTncPage) {
    onClose(); // Never show modal on T&C page
    return;
  }
  if (!userTncInfo && address) {
    onOpen();
  } else {
    onClose();
  }
}, [userTncInfo, address, isTncPage]);
```

**4.2: Update handleSign to use new API**

```typescript
const searchParams = useSearchParams(); // already imported

const handleSign = async () => {
  if (!address || !account) return;

  setIsSigningPending(true);
  try {
    // Get referrer from URL if present (e.g., /?referrer=0x123...)
    const referrerAddress = searchParams.get('referrer');

    const res = await axios.post('/api/tnc/accept', {
      address,
      referrerAddress, // pass to API for referral tracking
    });

    if (res.data?.success) {
      mixpanel.track('TnC agreed', { address, version: 'v2' });
      // Refetch the UserTnCAtom to update state
      // This will close the modal via the useEffect
      // Note: Need to invalidate the query - see implementation details
    } else {
      toast.error(res.data?.message || 'Failed to accept T&C');
    }
  } catch (error) {
    console.error('Error accepting T&C:', error);
    toast.error('Failed to accept T&C. Please try again.');
    mixpanel.track('TnC acceptance failed', { address });
  } finally {
    setIsSigningPending(false);
  }
};
```

**4.3: Update T&C link to in-app page**

```typescript
// Change href from RE7_TnC_DOC_URL (external) to internal route
<Text
  as={'a'}
  href="/terms-and-conditions"
  target="_blank" // Opens in new tab so users don't lose modal context
  // ...
>
  T&C Document <ExternalLinkIcon />
</Text>
```

#### Phase 5: Cleanup

**File:** `src/components/TncModal.tsx`

Remove dead code:

- Remove `useSignTypedData` hook and related imports
- Remove `sigData` and `signingError` handling
- Remove the `processSign` function and its useEffect
- Remove sessionStorage usage entirely
- Clean up unused imports (`SIGNING_DATA`, etc.)

---

### Migration Considerations

#### Existing Users

Users who accepted v1 will need to re-accept v2 because:

- `user.tncDocVersion` will be `'tnc/v1'`
- The check `tncDocVersion === LATEST_TNC_DOC_VERSION` will be `false`
- Modal will show, prompting them to accept v2

This is the desired behavior for T&C updates.

#### New Users

1. Connect wallet
2. Modal appears (no user record in DB yet)
3. Click "Agree"
4. `/api/tnc/accept` creates user record with T&C v2 accepted
5. Modal closes

---

### Testing Checklist

- [ ] New user: Modal shows, accept creates user + signature record
- [ ] Existing user (v1): Modal shows, accept updates to v2
- [ ] Existing user (v2): Modal does not show
- [ ] T&C page (`/terms-and-conditions`): Modal never shows
- [ ] Disconnect: Modal doesn't show (no address)
- [ ] Browser refresh: T&C state persists (from DB, not sessionStorage)
- [ ] Multiple tabs: State consistent across tabs

---

### Files Summary

| File                              | Action | Changes                                                            |
| --------------------------------- | ------ | ------------------------------------------------------------------ |
| `src/constants.ts`                | EDIT   | Update `LATEST_TNC_DOC_VERSION` to `'tnc/v2'`, update URL          |
| `src/app/api/tnc/accept/route.ts` | NEW    | New accept endpoint with user creation + referral code generation  |
| `src/components/TncModal.tsx`     | EDIT   | API-based check, path exemption, new handler, remove dead code     |

---

### Decisions (Resolved)

1. **Existing users must re-accept for v2?**
   - **YES** - This is the core purpose of this feature

2. **Remove sessionStorage fallback?**
   - **YES** - It's confusing and doesn't persist across sessions

3. **Add T&C middleware to API routes?**
   - **NO** - UI blocking via modal is sufficient for now. Can be added later if needed.

4. **Referral code for new users?**
   - **Server-side generation** using same format: `Math.random().toString(36).slice(2, 8)` (6 alphanumeric chars)
