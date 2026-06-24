# AirPaste — Agent Developer Guide

Welcome, AI Agent! This document provides a high-level overview, technical architecture, file map, and development guidelines for the **AirPaste** application to help you understand and contribute to this codebase efficiently.

---

## 1. Overview
AirPaste is a lightweight, cross-platform remote clipboard manager. It allows users to copy and paste text or code snippets between devices instantly using a synchronized **6-digit numeric code** or a magic link URL. 
- **Storage Model**: Ephemeral. Pastes are stored in an Upstash Redis database and automatically expire after **24 hours**.
- **Target Deployment**: Deno-based environment (e.g., Deno Deploy).

---

## 2. Tech Stack
- **Runtime**: [Deno](https://deno.com/) (using TypeScript)
- **Database**: [Upstash Redis](https://upstash.com/) (accessed via `@upstash/redis` NPM package)
- **Templating**: [Eta](https://eta.js.org/) (for rendering HTML views dynamically)
- **Logging**: [DyeLog](https://jsr.io/@littlelite/dyelog) (colorized and structured console logs)
- **Styling**: Vanilla CSS with modern aesthetics (gradients, glassmorphism, responsive flex/grid)

---

## 3. Project Structure
The repository is structured as follows:

```
├── .env                  # Local environment variables (DB URLs/credentials)
├── deno.json             # Task runner, JSR/NPM imports, and compiler options
├── deno.lock             # Lockfile for Deno dependencies
├── run.sh / lint.sh      # Utility scripts for starting & linting the application
├── src/                  # Backend application source code
│   ├── controllers/      # Route controllers
│   │   └── index_controller.ts  # Serves the main UI with dynamic data injection
│   ├── db.ts             # Upstash Redis initialization and data operations
│   ├── logger.ts         # Global logger instance configuration
│   ├── main.ts           # HTTP server and routing logic (Entrypoint)
│   ├── main_test.ts      # Unit and integration tests
│   └── version.ts        # Parses and exports the current version from deno.json
└── static/               # Client-side static assets
    ├── css/
    │   └── style.css     # Modern, premium glassmorphism styling
    ├── img/              # Image resources / assets
    └── template/
        └── index.eta     # Main Eta template containing UI and client scripts
```

---

## 4. Environment Variables
To run and test the application, a `.env` file must be configured in the project root with the following keys:
- `UPSTASH_DB_URL`: The HTTPS URL of the Upstash Redis database.
- `UPSTASH_REDIS_TOKEN`: The write-enabled authentication token for Upstash Redis.
- `UPSTASH_REDIS_READONLY_TOKEN`: Read-only token (optional, for read-only clients).

---

## 5. Architectural & Implementation Details

### Database Schema & Logic (`src/db.ts`)
- **Key Schema**: Pastes are saved with the key pattern: `paste:<6-digit-code>` (e.g., `paste:482910`).
- **Data Structure**:
  ```typescript
  interface Paste {
    content: string;   // The text or code snippet
    updatedAt: number; // Timestamp (milliseconds) when created or updated
  }
  ```
- **TTL**: Formally set to **86400 seconds (24 hours)** upon save.
- **Code Generation**: A random 6-digit number is generated. To prevent collisions, the system checks Redis using `exists`. It will try up to 10 times to find an unused code before throwing an error.

### HTTP Routing & API Routes (`src/main.ts`)
The server listens for incoming HTTP requests and delegates them as follows:

| Method | Path | Description |
| :--- | :--- | :--- |
| **GET** | `/` or `/index.html` | Serves the main web application UI. |
| **GET** | `/:code` (6 digits) | Magic Link. Fetches the paste for the code, then renders the UI pre-filled with the paste data. If not found/expired, redirects to `/?error=notfound`. |
| **GET** | `/css/style.css` | Serves the static CSS stylesheet. |
| **POST** | `/api/paste` | Creates a new paste. Expects JSON: `{ "content": string }`. Returns: `{ "code": string }`. |
| **GET** | `/api/paste/:code` | Fetches raw paste data. Returns JSON: `{ "content": string, "updatedAt": number }` or a `404` error if expired/not found. |
| **POST** | `/api/paste/:code` | Updates or sets paste content for a specific code. Expects JSON: `{ "content": string }`. Returns: `{ "code": string }`. |

### Rendering & Client Interaction (`static/template/index.eta`)
- Renders the web interface dynamically, embedding the snippet contents and sharing details when accessed through a magic link.
- **QR Code Generation**: Uses the public `https://api.qrserver.com` utility to generate scan-to-sync QR codes on the fly.
- **State Management**: Client-side JavaScript updates UI text, copy-to-clipboard, character counter, and sync views depending on whether the paste is saved (creating a code) or actively synchronized.

---

## 6. CLI Commands & Workflow

- **Start Development Server**:
  ```bash
  deno task dev
  ```
- **Start Production Server**:
  ```bash
  deno task start
  ```
- **Run Tests**:
  ```bash
  deno test --allow-net --allow-env --allow-read
  ```
- **Lint Codebase**:
  ```bash
  deno task lint
  ```
- **Format Codebase**:
  ```bash
  deno task fmt
  ```

---

## 7. Developer Rules & Guidelines

1. **Strict TypeScript**: Keep `checkJs: true` and `strict: true` in compiler options.
2. **Standard Imports**: Use standard JSR or NPM imports configured in `deno.json`.
3. **No Overwrites of Existing Comments**: Keep license headers and comments intact.
4. **Clean Code**: Ensure you format with `deno task fmt` and check code with `deno task lint` before delivering updates.
5. **Header Comments**: Each file should have a brief header comment showing license and author. Copy it from existing source files for consistency.
