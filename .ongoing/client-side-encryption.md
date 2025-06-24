# Client-Side Password Protection

## Status: Architecture Finalized, Starting Implementation
**Created**: June 24, 2025
**Updated**: June 24, 2025
**Priority**: HIGH - Enables removing Netlify password protection for PWA support

## Overview
Replace Netlify's password protection with client-side encryption to enable PWA functionality while maintaining privacy. Users enter a password once, which is stored locally and used to decrypt the family data.

## Problem
- Netlify password protection blocks PWA features (manifest.json returns 401)
- PWA can't install or work offline with server-side auth
- Need privacy protection for sensitive family data

## Solution Design

### Finalized Architecture
1. **Build time**: Encrypt JSON files only if `FAMILY_TREE_PASSWORD` environment variable is set
2. **No encryption**: If env var unset, build generates normal unencrypted `roots.json`
3. **With encryption**: If env var set, build generates `roots.json.enc` (encrypted version)
4. **Client auto-detection**: App tries encrypted version first, falls back to unencrypted
5. **Result**: Same codebase supports both encrypted and unencrypted deployments

### Security Model
- **Privacy-focused**: Deters casual access, not military-grade security
- **Password never transmitted**: Stays in browser localStorage only  
- **Offline capable**: Once decrypted and cached, works without network

### Implementation Plan

#### Phase 1: Build-Time Encryption
- [ ] Create Node.js script to encrypt `public/api/v1/*.json` files
- [ ] Use AES-GCM encryption with password-derived key  
- [ ] Output encrypted files as `.json.enc`
- [ ] Add encryption script to build process
- [ ] Update README.md to document FAMILY_TREE_PASSWORD environment variable
- [ ] Git-ignore unencrypted JSON files

#### Phase 2: Password UI
- [ ] Create password prompt component
- [ ] Check localStorage for existing password
- [ ] Validate password by attempting decryption
- [ ] Store password in localStorage on success
- [ ] Handle wrong password gracefully

#### Phase 3: Runtime Decryption  
- [ ] Update genea service to try `.json.enc` first, fallback to `.json`
- [ ] Implement client-side decryption using Web Crypto API
- [ ] Cache decrypted data in memory/IndexedDB
- [ ] Handle decryption errors

#### Phase 4: PWA Integration
- [ ] Ensure service worker caches encrypted files
- [ ] Test offline functionality with decryption
- [ ] Verify PWA installation works without auth

## Technical Details

### Environment Variable Convention
```bash
# No encryption (default) - generates roots.json
# FAMILY_TREE_PASSWORD unset

# With encryption - generates roots.json.enc  
FAMILY_TREE_PASSWORD="your-shared-secret"
```

### Encryption (Node.js build script)
```javascript
// Pseudo-code
const password = process.env.FAMILY_TREE_PASSWORD;
if (!password) {
  // Skip encryption, output normal JSON
  return;
}
const salt = crypto.randomBytes(16);
const key = await deriveKey(password, salt);
const encrypted = await encrypt(jsonData, key);
fs.writeFileSync('data.json.enc', encrypted);
```

### Decryption (Browser)
```javascript
// Auto-detection approach
try {
  const encryptedResponse = await fetch('/api/v1/roots.json.enc');
  if (encryptedResponse.ok) {
    // Encrypted mode - require password
    const password = localStorage.getItem('familyTreePassword');
    const key = await deriveKey(password, salt);
    return await decrypt(encryptedResponse, key);
  }
} catch (e) {
  // Fall through to unencrypted
}
// Unencrypted mode
return await fetch('/api/v1/roots.json');
```

### Password Storage
- Use localStorage key: `familyTreePassword`
- No expiration (user must explicitly log out)
- Optional: Add "remember me" checkbox

## Success Criteria
- [ ] PWA installs and works offline
- [ ] Password entered only once per device
- [ ] No passwords in network requests
- [ ] Graceful handling of wrong passwords
- [ ] Build process automatically encrypts data

## Dependencies
- Web Crypto API (browser support)
- Node.js crypto module (build time)
- Minimal UI for password prompt

## Security Notes
- This provides reasonable privacy for family data
- Not suitable for highly sensitive information
- Password can be shared among family members
- Consider adding password change functionality later