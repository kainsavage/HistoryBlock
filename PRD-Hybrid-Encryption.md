# HistoryBlock Hybrid Encryption PRD

## Project Overview

**Product**: HistoryBlock Firefox Extension - Hybrid Encryption System  
**Version**: 3.0  
**Date**: December 2024  
**Author**: kain  

## Executive Summary

This PRD outlines the implementation of a hybrid encryption system for HistoryBlock that maintains the current security model (obfuscated blacklist for casual observers) while adding true encryption capabilities for users who want enhanced protection. The system will support both password-protected and key-based encryption modes with automatic synchronization.

## Problem Statement

### Current Limitations
1. **SHA1 Hashing**: Provides obfuscation but not true encryption
2. **Single Security Model**: All users must use the same approach
3. **No Cross-Device Sync**: Blacklists don't sync across devices
4. **Limited Flexibility**: Cannot mix domain/subdomain matching per entry

### User Requirements
1. **Casual Observer Protection**: Non-technical users shouldn't easily see blacklisted domains
2. **Enhanced Security**: Technical users want true encryption with password protection
3. **Cross-Device Sync**: Blacklists should sync across Firefox instances
4. **Per-Entry Matching**: Mix domain/subdomain/URL matching strategies
5. **Session-Based Access**: Single password unlock per session

## Solution Architecture

### Hybrid Encryption System

The system will maintain two parallel blacklist representations:

1. **User Blacklist** (Password-Protected)
   - Source of truth for all blacklist operations
   - Encrypted with user-provided password
   - Stored in `browser.storage.sync` for cross-device sync
   - Contains full entry details (domain, matching strategy, metadata)

2. **System Blacklist** (Key-Based)
   - Optimized for fast matching operations
   - Encrypted with auto-generated key stored in `browser.storage.sync`
   - Contains only matching keys (domain/subdomain/URL strings)
   - Automatically synchronized with User Blacklist

### Security Model

```
User Password → PBKDF2 → User Encryption Key → User Blacklist (Full Data)
                                    ↓
Auto-Generated Key → System Blacklist (Matching Keys Only)
```

## Technical Requirements

### 1. Encryption Implementation

#### User Blacklist Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Random 16-byte salt per user
- **Storage**: `browser.storage.sync`

#### System Blacklist Encryption
- **Algorithm**: AES-256-GCM
- **Key**: Auto-generated 256-bit key
- **Storage**: `browser.storage.sync`
- **Purpose**: Fast matching without password prompts

### 2. Data Structures

#### User Blacklist Entry
```javascript
{
  id: "uuid",
  domain: "example.com",
  matching: "domain|subdomain|url",
  addedDate: "2024-12-01T00:00:00Z",
  notes: "optional user notes"
}
```

#### System Blacklist Entry
```javascript
{
  key: "example.com", // or "www.example.com" or "example.com/path"
  type: "domain|subdomain|url"
}
```

### 3. Synchronization Logic

- **User → System**: When user blacklist changes, regenerate system blacklist
- **Conflict Resolution**: User blacklist always takes precedence
- **Cross-Device**: Changes sync automatically via `browser.storage.sync`

## User Experience Requirements

### 1. First-Time Setup

#### New Users
1. Choose encryption mode:
   - **Simple** (current SHA1 behavior)
   - **Enhanced** (password-protected)
2. If Enhanced: Set password with confirmation
3. System generates encryption keys
4. Migrate existing blacklist if present

#### Existing Users
1. Prompt to upgrade encryption mode
2. Migrate existing blacklist to new format
3. Maintain backward compatibility

### 2. Daily Usage

#### Simple Mode (Current Behavior)
- No password required
- SHA1 hashing for obfuscation
- All current functionality preserved

#### Enhanced Mode
- **Session Unlock**: Enter password once per browser session
- **Auto-Lock**: Lock after 30 minutes of inactivity
- **Quick Access**: Add/remove domains without re-entering password
- **Visual Indicators**: Clear indication of lock/unlock status

### 3. Blacklist Management

#### Adding Entries
1. User enters domain/URL
2. Selects matching strategy (domain/subdomain/URL)
3. System updates both blacklists
4. Confirmation with entry details

#### Removing Entries
1. User selects entry from list
2. System removes from both blacklists
3. Confirmation of removal

#### Editing Entries
1. User selects entry
2. Modify domain or matching strategy
3. System updates both blacklists
4. Confirmation of changes

## Implementation Plan

### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Implement encryption utilities (AES-256-GCM, PBKDF2)
- [ ] Create data structures for hybrid blacklist system
- [ ] Implement key generation and storage
- [ ] Add migration logic for existing blacklists

### Phase 2: User Interface (Weeks 3-4)
- [ ] Add encryption mode selection to options page
- [ ] Implement password setup/change dialogs
- [ ] Add session unlock interface
- [ ] Update blacklist display to show encryption status

### Phase 3: Synchronization (Weeks 5-6)
- [ ] Implement User ↔ System blacklist sync
- [ ] Add cross-device synchronization
- [ ] Implement conflict resolution
- [ ] Add error handling and recovery

### Phase 4: Enhanced Features (Weeks 7-8)
- [ ] Implement per-entry matching strategies
- [ ] Add session timeout and auto-lock
- [ ] Implement bulk operations
- [ ] Add export/import with encryption

### Phase 5: Testing & Polish (Weeks 9-10)
- [ ] Comprehensive testing of both modes
- [ ] Cross-device synchronization testing
- [ ] Performance optimization
- [ ] Documentation and user guides

## Security Considerations

### 1. Password Security
- **Minimum Requirements**: 8 characters, mixed case, numbers
- **Storage**: Never store password, only derived keys
- **Transmission**: All operations happen locally
- **Recovery**: No password recovery (by design)

### 2. Key Management
- **User Keys**: Derived from password, never stored
- **System Keys**: Auto-generated, stored in extension storage
- **Rotation**: Keys can be regenerated by changing password
- **Backup**: No automatic backup (user responsibility)

### 3. Attack Vectors
- **Physical Access**: Same as current system
- **Malware**: Same as current system
- **Browser Compromise**: Same as current system
- **Network**: No network transmission of sensitive data

## Migration Strategy

### 1. Existing Users
- **SHA1 Users**: Prompt to upgrade to Enhanced mode
- **Plaintext Users**: Migrate to Simple mode (current behavior)
- **Data Preservation**: All existing blacklists preserved

### 2. Backward Compatibility
- **Simple Mode**: Identical to current SHA1 behavior
- **API Compatibility**: All existing APIs maintained
- **Settings Migration**: Existing settings preserved

## Success Metrics

### 1. User Adoption
- **Target**: 30% of users upgrade to Enhanced mode within 6 months
- **Measurement**: Analytics on encryption mode selection

### 2. Performance
- **Target**: <100ms for blacklist matching operations
- **Measurement**: Performance profiling of matching logic

### 3. Reliability
- **Target**: <0.1% data loss during migration
- **Measurement**: Error tracking and user feedback

## Risk Assessment

### 1. High Risk
- **Data Loss**: During migration or sync operations
- **Mitigation**: Comprehensive backup and rollback procedures

### 2. Medium Risk
- **Performance**: Encryption/decryption overhead
- **Mitigation**: Optimized algorithms and caching

### 3. Low Risk
- **User Confusion**: New encryption options
- **Mitigation**: Clear documentation and default to Simple mode

## Future Enhancements

### 1. Advanced Security
- **Hardware Security**: Integration with hardware security modules
- **Biometric**: Fingerprint/face unlock support
- **Multi-Factor**: Additional authentication factors

### 2. Enhanced Features
- **Cloud Backup**: Optional encrypted cloud storage
- **Sharing**: Secure blacklist sharing between users
- **Analytics**: Privacy-preserving usage analytics

### 3. Platform Expansion
- **Chrome**: Port to Chrome extension
- **Mobile**: Firefox mobile support
- **Desktop**: Standalone application

## Conclusion

The hybrid encryption system provides a balanced approach that maintains HistoryBlock's core security model while offering enhanced protection for users who need it. The implementation preserves backward compatibility while adding powerful new features for cross-device synchronization and per-entry matching strategies.

The phased implementation approach ensures minimal risk while delivering incremental value to users. The system's design allows for future enhancements while maintaining the simplicity that has made HistoryBlock successful.

---

**Next Steps**: Review and approve this PRD, then begin Phase 1 implementation with core infrastructure development.
