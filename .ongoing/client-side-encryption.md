# Client-Side Password Protection

## Status: Planning Phase
**Created**: June 24, 2025
**Priority**: HIGH - Enables removing Netlify password protection for PWA support

## Overview
Replace Netlify's password protection with client-side encryption to enable PWA functionality while maintaining privacy. Users enter a password once, which is stored locally and used to decrypt the family data.

## Problem
- Netlify password protection blocks PWA features (manifest.json returns 401)
- PWA can't install or work offline with server-side auth
- Need privacy protection for sensitive family data

## Solution Design

### Architecture
1. **Build time**: Encrypt all JSON data files with a password
2. **Client side**: Prompt for password, store in localStorage
3. **Runtime**: Decrypt data in browser before use
4. **Result**: Public manifest/PWA files, protected data

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
- [ ] Git-ignore unencrypted JSON files

#### Phase 2: Password UI
- [ ] Create password prompt component
- [ ] Check localStorage for existing password
- [ ] Validate password by attempting decryption
- [ ] Store password in localStorage on success
- [ ] Handle wrong password gracefully

#### Phase 3: Runtime Decryption  
- [ ] Update genea service to fetch `.json.enc` files
- [ ] Implement client-side decryption using Web Crypto API
- [ ] Cache decrypted data in memory/IndexedDB
- [ ] Handle decryption errors

#### Phase 4: PWA Integration
- [ ] Ensure service worker caches encrypted files
- [ ] Test offline functionality with decryption
- [ ] Verify PWA installation works without auth

## Technical Details

### Encryption (Node.js build script)
```javascript
// Pseudo-code
const password = process.env.FAMILY_TREE_PASSWORD;
const salt = crypto.randomBytes(16);
const key = await deriveKey(password, salt);
const encrypted = await encrypt(jsonData, key);
fs.writeFileSync('data.json.enc', encrypted);
```

### Decryption (Browser)
```javascript
// Pseudo-code
const password = localStorage.getItem('familyTreePassword');
const encryptedData = await fetch('/api/v1/roots.json.enc');
const key = await deriveKey(password, salt);
const decrypted = await decrypt(encryptedData, key);
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