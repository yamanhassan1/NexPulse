# File Service

The file service owns each project's file and folder tree. It stores text and
binary content in MongoDB and exposes project import/export operations to the
frontend.

- **Package:** `backend/services/file/`
- **Entry point:** `backend/services/file/src/index.js`
- **Port:** `8003` by default
- **Needs:** MongoDB; gateway internal secret in production

## Structure

```text
backend/services/file/
├── src/
│   ├── config/db.js
│   ├── controllers/file.controller.js
│   ├── models/file.model.js
│   ├── routes/file.route.js
│   └── utils/buildTree.js
├── .env.example
└── package.json
```

Routes map HTTP methods to controller functions; the controller owns
authorization, tree operations, and persistence. The `File` model stores folders
and files as nodes related through `parentId`.

## File representation

Each node is scoped to an owner and project. A node records its name, type,
parent, language/extension, size, content type, and encoding. Text uses `utf8`;
binary content is stored as base64. Deleted subtrees receive a shared batch id
so one undo action can restore the full delete.

The partial unique index on `{ projectId, parentId, name }` prevents duplicate
active sibling names while allowing soft-deleted names to be reused.

## Routes

These endpoints are mounted at `/api/file` by the gateway and require a valid
session. The gateway forwards the authenticated user id as `x-user-id`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/create-root-folder` | Create the root folder for a project. |
| `POST` | `/create-folder` | Create a folder beneath a parent. |
| `POST` | `/create-file` | Create a file beneath a parent. |
| `POST` | `/import` | Import a file/folder tree. |
| `POST` | `/copy` | Copy a node and its descendants. |
| `PATCH` | `/move` | Move a node to another parent. |
| `PATCH` | `/restore/:batchId` | Restore a soft-deleted batch. |
| `PATCH` | `/project-root/:projectId` | Rename a project's root folder. |
| `PATCH` | `/update/:id` | Update file content and metadata. |
| `DELETE` | `/project/:projectId` | Delete project file data. |
| `DELETE` | `/:id` | Soft-delete a file or folder. |
| `GET` | `/tree/:projectId` | Get a project file tree. |
| `GET` | `/export/:projectId` | Export a project tree for download. |
| `GET` | `/:id/raw` | Get raw file content for browser download. |
| `GET` | `/:id` | Get one file. |

For request bodies and response details, see the frontend's file API calls in
`frontend/src/features/file.js` and the controller in
`backend/services/file/src/controllers/file.controller.js`.
