# MEIA OSCAR Plugin

React + shadcn/ui Chrome extension for Meia, the OSCAR EMR AI assistant.

OSCAR EMR is an open source medical records software used by various clinics in Canada. It was first launched in 2002 and has had various iterations over the decades since. The Meia OSCAR Plugin is an exercise in creating a LLM powered agentic assistant for the OSCAR EMR system.

This Chrome extension serves as a front end for the project, it creates an interactive interface on the right hand side of the EMR's user interface, with a chat box which user can issue prompts to the assistant. The messages are then sent to the backend (FastAPI server with Google ADK agent) to be processed.

## Setup

```bash
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Run tests, type check, and build for production |
| `npm run build:ext` | Build extension only (no tests) |
| `npm run dev` | Run Vite dev server (for component testing) |
| `npm run watch` | Build and watch for changes |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Run ESLint |

## Configuration

Update the backend URL in `src/hooks/useAuth.ts`:

```typescript
const BACKEND_URL = "http://localhost:8000"  // Change for production
```

## Local Testing

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist/` folder
6. Navigate to OSCAR EMR
7. Panel appears on right side

## Requirements

- Node.js 20+
- Backend running at configured `BACKEND_URL`
- OSCAR instance with OAuth configured
