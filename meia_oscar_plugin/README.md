# MEIA OSCAR Plugin

React + shadcn/ui Chrome extension for Meia, the OSCAR EMR AI assistant.

OSCAR EMR is an open source medical records software used by various clinics in Canada. It was first launched in 2002 and has had various iterations over
the decades since. The Meia OSCAR Plugin is an exercise in creating a LLM powered agentic assistant for the OSCAR EMR system.

This Chrome extension serves as a front end for the project, it creates a interactive interface on the right hand side of the EMR's user interface, with a chat
box which user can issue prompts to the assistant. The messages are then sent to the backend (FastAPI server with Google ADK agent) to be processed.

## Build

```bash
npm install
npm run build:ext
```

## Local Testing

1. Build the extension (see above)
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist/` folder
6. Navigate to OSCAR at `https://ec2-16-52-150-143.ca-central-1.compute.amazonaws.com:8443/oscar/`
7. Panel appears on right side

## Development

```bash
npm run dev       # Run Vite dev server (for component testing)
npm run build:ext # Build Chrome extension
```

## Requirements

- MCP backend running at `http://localhost:8000`
- OSCAR instance with OAuth configured
