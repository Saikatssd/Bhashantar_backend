# Bhasantar Backend

Node.js + Express.js backend API for the Bhasantar document translation and management platform. Manages the full lifecycle of legal document translation — upload, translation, reviewer assignment, quality review, approval, and delivery.

## Tech Stack

- **Runtime:** Node.js (v22 on App Engine)
- **Framework:** Express.js
- **Database:** Google Cloud Firestore (NoSQL)
- **Authentication:** Firebase Authentication
- **File Storage:** Google Cloud Storage (bucket: `bhasantar`)
- **Deployment:** Google App Engine (standard, F2 instance class)
- **PDF Generation:** Puppeteer
- **DOCX Conversion:** html-to-docx
- **ZIP Packaging:** archiver
- **HTML Processing:** jsdom

## Prerequisites

- Node.js (LTS)
- Access to a Google Cloud project with Firestore, Cloud Storage, and App Engine enabled
- Firebase service account key

## Setup

```bash
git clone <repo-url>
cd server
npm install
```

Create a `config.env` file (or use the provided one) with the variables listed below.

## Configuration

All config is in `config.env` (loaded by dotenv at startup). Key variables:

| Variable | Description |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account key JSON |
| `GCP_PROJECT_ID` | GCP project ID |
| `GCS_BUCKET_NAME` | Cloud Storage bucket name |
| `FIREBASE_*` | Firebase Admin SDK credentials (type, project_id, private_key, client_email, etc.) |
| `PORT` | Server port (default: 5566 local / 8080 on App Engine) |
| `FRONTEND_URL` | CORS-allowed frontend origin |

## Running Locally

```bash
npm run dev    # nodemon with auto-reload
npm start      # production start
```

The API starts on the port defined by `PORT` (default `5566` for local, `8080` on App Engine).

## Deployment

Deployed to Google App Engine via `app.yaml`:

```bash
gcloud app deploy
```

The `gcp-build` script installs the Puppeteer Chrome binary during deployment. The browser cache directory is set to `node_modules/.puppeteer_cache` so it gets packaged with the app.

## API Endpoints

Base URL: `/api`

### Authentication & User Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/registerSuperAdmin` | Register a super admin |
| POST | `/auth/createUser` | Create a new user |
| POST | `/auth/bulkCreateUsers` | Bulk create users |
| GET | `/auth/getUserProfile` | Get user profile (requires token) |
| POST | `/auth/disableUser` | Disable a user |
| POST | `/auth/enableUser` | Enable a user |

### Role Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/role/createRole` | Create a new role |
| PUT | `/role/updateRole` | Update a role |
| DELETE | `/role/deleteRole` | Delete a role |
| PUT | `/role/disableRole` | Disable a role |
| POST | `/role/assignRole` | Assign role to user |
| GET | `/role/getAllRoles` | Get all roles |

### Company Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/company/createCompany` | Create a company |
| DELETE | `/company/deleteCompany` | Delete a company |
| GET | `/company/` | Get all companies |
| GET | `/company/getCompanyUsers/:companyId` | Get users by company |
| GET | `/company/getAllUsersInCompany` | Get all users in a company (query: `companyId`) |

### Project Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/project/createProject` | Create a project (judgement) |
| PUT | `/project/editProject` | Rename a project |
| GET | `/project/:companyId/getProjects` | Get projects for a company |
| GET | `/project/:companyId/getProjectsWithNotifications` | Get projects with notification counts (status-2 files) |
| GET | `/project/:companyId/getNotificationCounts` | Get notification counts for status-2 files |
| DELETE | `/project/deleteProject` | Delete a project |
| GET | `/project/files/inProgress` | Kyro user WIP files (requires token) |
| GET | `/project/files/completed` | Kyro user completed files (requires token) |
| GET | `/project/files/clientInProgress` | Client user WIP files (requires token) |
| GET | `/project/files/clientCompleted` | Client user completed files (requires token) |
| GET | `/project/user/fileCount` | User file count with date filter (query: `startDate`, `endDate`) |
| GET | `/project/user-wip-count` | User WIP count (requires token) |

### Document Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/document/:projectId/getDocuments` | Get documents in a project |
| GET | `/document/:projectId/documentInfo/:documentId` | Get document info |
| PUT | `/document/generateSignedUrlForHtmlUpdate` | Generate signed URL for HTML update |
| POST | `/document/deleteFile` | Delete a single file |
| POST | `/document/deleteBulkFiles` | Bulk delete files |
| GET | `/document/:projectId/:documentId/downloadDocx` | Download DOCX (with original PDF in ZIP) |
| GET | `/document/:projectId/:documentId/downloadPdf` | Download PDF (with original PDF in ZIP) |
| POST | `/document/downloadSelected` | Download multiple selected files as ZIP |

### Folder Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/folder/getAllFolders/:projectId` | Get folder hierarchy for a project |
| POST | `/folder/createFolder` | Create a folder |
| GET | `/folder/getFilesByFolder` | Get files in a folder (query: `projectId`, `folderId`) |

### Permission Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/permission/createPermission` | Create permissions for a role |
| PUT | `/permission/updatePermission` | Update permissions for a role |
| GET | `/permission/getAllPermissions` | Get all permissions |

Permissions follow this structure per role:
```json
{
  "users": { "read": false, "create": false, "update": false, "delete": false },
  "documents": { "read": false, "create": false, "update": false, "delete": false, "assign": false }
}
```

### File Tracking & Feedback

| Method | Endpoint | Description |
|---|---|---|
| POST | `/track/revert` | Log a revert action |
| GET | `/track/revert-history` | Fetch revert history |
| POST | `/track/file-submission` | Record file submission |
| GET | `/track/file-submission-history` | Fetch submission history |
| POST | `/track/feedback` | Submit feedback |
| GET | `/track/feedbacks` | Fetch feedbacks |
| PUT | `/track/feedback/status` | Update feedback status |

### Direct Endpoints (on `/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/server-timestamp` | Get current server timestamp |
| POST | `/generateSignedUrl` | Generate signed URL for file upload |
| POST | `/generateReadSignedUrl` | Generate signed URL for file read |

## Middleware

| Middleware | Purpose |
|---|---|
| `verifyToken` | Validates Firebase ID token from `Authorization: Bearer <token>` header |
| `checkPermission` | Checks that the authenticated user's role has the required permission (resource + action) |
| `checkRole` | Restricts access to specific role IDs |
| `errorMiddleware` | Global error handler — returns `{ success: false, message }` |
| `createZip` | PDF/DOCX generation pipeline (Puppeteer + html-to-docx) with embedded Nirmala UI fonts |

## Folder Structure

```
server/
├── controller/          # Route handlers (7 modules)
│   ├── authController.js
│   ├── companyController.js
│   ├── documentController.js
│   ├── folderController.js
│   ├── projectController.js
│   ├── roleController.js
│   └── trackFileController.js
├── middleware/           # Express middleware (5 modules)
│   ├── checkPermission.js
│   ├── checkRole.js
│   ├── createZip.js          # PDF/DOCX generation pipeline
│   ├── errorMiddleware.js
│   └── verifyToken.js
├── routes/              # Express route definitions (8 modules)
│   ├── auth.js
│   ├── company.js
│   ├── document.js
│   ├── folder.js
│   ├── permission.js
│   ├── project.js
│   ├── role.js
│   └── trackFile.js
├── utils/
│   └── errorHandler.js      # Custom Error class
├── public/fonts/            # Nirmala UI TTF files (Bengali font)
├── index.js                 # Express app entry point
├── firebaseAdmin.js         # Firebase Admin SDK init
├── app.yaml                 # App Engine config
├── config.env               # Environment variables
├── .puppeteerrc.cjs         # Puppeteer cache config
├── package.json
└── README.md
```

## PDF/DOCX Generation Pipeline

Located in `middleware/createZip.js`:

1. **Font Embedding** — Nirmala UI fonts (regular + bold) are base64-encoded and injected as `@font-face` CSS
2. **HTML Normalization** — Quill editor inline styles and classes are normalized into a canonical format
3. **PDF Generation** — Puppeteer renders the HTML with embedded fonts to PDF (Legal page size)
4. **DOCX Post-Processing** — Legal page size and 1.5 line-height are applied to the generated DOCX
5. **ZIP Packaging** — Output files (PDF/DOCX + original PDF) are bundled into a ZIP using archiver

## Permissions Model

Roles are stored in Firestore and linked to a permissions document. The `checkPermission` middleware:
1. Looks up the authenticated user's role
2. Fetches the associated permissions document
3. Verifies the required resource + action is allowed

Permission checks are currently not wired into all routes — many endpoints rely on route-level access only.

## License

ISC
