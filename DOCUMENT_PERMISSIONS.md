# Document Permissions System - Client & Accountant Collaboration

## Overview

This system allows clients and accountants (in active relationships) to collaborate on documents while maintaining clear ownership and edit permissions.

## Database Schema Changes

### New Fields Added to Document Model

```prisma
model Document {
  // Existing fields...
  companyId         Int?      // Always the CLIENT company
  createdBy         Int?      // User ID who created (client or accountant user)
  createdByCompanyId Int?     // Company ID who created (client or accountant firm)

  // Relations
  createdByUser     User?     @relation("DocumentCreatedBy", fields: [createdBy], references: [id])
  createdByCompany  Company?  @relation("DocumentCreatedByCompany", fields: [createdByCompanyId], references: [id])
}
```

### New Relations Added

**User Model:**

- `createdDocuments` - Documents created by this user

**Company Model:**

- `createdDocuments` - Documents created by this company

---

## Permission Logic

### 1. Document Creation

#### When CLIENT creates a document:

```
POST /api/documents/folders
{
  "name": "My Folder"
  // No clientCompanyId needed - uses user.companyId
}

Logic:
1. Get user.companyId (client's company)
2. Create document with:
   - companyId = user.companyId
   - createdBy = user.id
   - createdByCompanyId = user.companyId

Result:
{
  companyId: 123,           // Client's company
  createdBy: 456,           // Client's user ID
  createdByCompanyId: 123   // Client's company
}
```

#### When ACCOUNTANT creates a document:

```
POST /api/documents/folders
{
  "name": "Accountant Folder",
  "clientCompanyId": 123    // REQUIRED - which client's space
}

Logic:
1. Get user.companyId (accountant's company)
2. Validate active relationship: accountingFirmId = user.companyId, clientCompanyId = 123
3. Create document with:
   - companyId = clientCompanyId (from request)
   - createdBy = user.id
   - createdByCompanyId = user.companyId

Result (for each client):
{
  companyId: 123,           // Client's company (from request)
  createdBy: 999,           // Accountant's user ID
  createdByCompanyId: 789   // Accountant's company
}
```

**Key Difference:**

- CLIENT: Creates in their own space (user.companyId) - clientCompanyId optional/ignored
- ACCOUNTANT: Must provide clientCompanyId and have active relationship

---

### 2. Document Visibility

#### When CLIENT lists documents:

```
GET /api/documents?page=1&limit=20

Query:
WHERE companyId = user.companyId AND status = 'active'

Result: Shows ALL documents in their space:
- Documents they created (createdByCompanyId = user.companyId)
- Documents accountant created (createdByCompanyId = accountant.companyId)
- Each document includes canEdit and canDelete flags
```

#### When ACCOUNTANT lists documents:

```
GET /api/documents?page=1&limit=20

Query:
WHERE companyId = user.companyId AND status = 'active'

Result: Shows ALL documents in their space
- Each document includes canEdit and canDelete flags
```

---

### 3. Edit/Delete Permissions

#### CLIENT can EDIT/DELETE:

- ✅ Documents where `createdByCompanyId = client.companyId`
- ❌ Documents where `createdByCompanyId = accountant.companyId`

#### ACCOUNTANT can EDIT/DELETE:

- ✅ Documents where `createdByCompanyId = accountant.companyId`
- ✅ Documents where `createdByCompanyId = client.companyId` (can organize client's docs)

#### Permission Check Logic:

```typescript
const isCreator = document.createdByCompanyId === userCompanyId;
const isAccountantEditingClient =
  document.createdByCompanyId === document.companyId &&
  document.createdByCompanyId !== userCompanyId;

const canEdit = isCreator || isAccountantEditingClient;
const canDelete = isCreator || isAccountantEditingClient;
```

---

## API Response Format

### GET /api/documents?page=1&limit=20

```json
{
  "status": "success",
  "code": "200",
  "data": [
    {
      "id": 1,
      "name": "Client Invoice",
      "companyId": 123,
      "createdByCompanyId": 123,
      "createdBy": 456,
      "isFolder": false,
      "canEdit": true,
      "canDelete": true,
      "createdAt": "2025-03-10T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Accountant Folder",
      "companyId": 123,
      "createdByCompanyId": 789,
      "createdBy": 999,
      "isFolder": true,
      "canEdit": false, // Client cannot edit
      "canDelete": false, // Client cannot delete
      "createdAt": "2025-03-10T11:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "limitPerPage": 20,
    "totalCount": 100
  }
}
```

---

## Implementation Status

### Database Changes ✅

- [x] Added `createdBy` field to Document
- [x] Added `createdByCompanyId` field to Document
- [x] Added relations in User model
- [x] Added relations in Company model
- [x] Added indexes for performance

### Service Implementation ✅

- [x] Updated createFolder() with permission logic
- [x] Updated uploadFile() with permission logic
- [x] Updated getDocuments() with canEdit/canDelete flags
- [x] Updated updateDocument() with permission checks
- [x] Updated deleteDocument() with permission checks
- [x] Added helper methods for permission validation

### Controller Updates ✅

- [x] Updated createFolder endpoint to pass userId
- [x] Updated uploadFile endpoint to accept clientCompanyId
- [x] Updated getDocuments endpoint to pass userId
- [x] Updated updateDocument endpoint with permission checks
- [x] Updated deleteDocument endpoint with permission checks

### DTOs Updated ✅

- [x] Added clientCompanyId to CreateFolderDto
- [x] Added clientCompanyId to UploadFileDto

---

## Key Points

1. **`companyId` is always the CLIENT** - This ensures all documents appear in client's space
2. **`createdByCompanyId` tracks who created it** - Used for permission checks
3. **Accountant needs active relationship** - Validated before any operation
4. **Client sees everything** - But can only edit their own documents
5. **Accountant can organize** - Can edit/delete both their docs and client's docs
6. **clientCompanyId is optional for clients** - Required for accountants to specify which client space

---

## Next Steps

- [ ] Run `npx prisma generate` to regenerate Prisma client
- [ ] Run `npx prisma db push` to sync schema with database
- [ ] Restart the server
- [ ] Test the permission system with both client and accountant users
- [ ] Add integration tests for permission logic

---

## Status

**Schema Changes:** ✅ DONE
**Logic Design:** ✅ CONFIRMED
**Service Implementation:** ✅ DONE
**Controller Updates:** ✅ DONE
**DTOs Updated:** ✅ DONE

**Ready to test!**
