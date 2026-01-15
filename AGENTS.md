# Agent Guidelines for Chat App

## Build & Run Commands
- **Frontend** (`/frontend`):
  - Lint: `npm run lint` (ESLint)
  - Build: `npm run build` (Vite)
  - Dev: `npm run dev` (Starts at `http://localhost:5173`)
- **Backend** (`/backend`):
  - Dev: `npm run dev` (Nodemon, starts at `http://localhost:3000`)
  - Start: `npm start`
- **Database (Hybrid Mode)**:
  - Start Mongo: `docker compose -f docker-compose.dev.yml up -d`
- **Full Stack (Docker)**:
  - Start: `docker compose up --build`

## Code Style & Conventions
- **Frontend (React/Vite)**:
  - **Format**: Functional components, `.jsx` extension, ESM imports.
  - **State**: React Hooks (`useState`, `useEffect`, `useRef`).
  - **Styling**: `App.css`, component-specific CSS (e.g., `TrashBinModal.css`).
  - **Env Vars**: Access via `import.meta.env.VITE_VAR_NAME`.
  - **Logging**: Use `utils/logger.js` (default export `logger`).
    - Control via browser console: `window.logger.on()` / `window.logger.off()`.
    - Persists in `localStorage`.
- **Backend (Node/Express)**:
  - **Format**: CommonJS (`require`), Mongoose models, Express routes.
  - **Async**: Use `async/await` with `try/catch` blocks.
  - **Env Vars**: Access via `process.env.VAR_NAME` (using `dotenv`).
  - **Logging**: Use `utils/logger.js`. Do not use `console.log`.
    - `logger.info("message")` for general info.
    - `logger.error("message", err)` for errors.
    - `logger.debug("message", object)` for debugging (only shows if `LOG_LEVEL=debug`).
- **General**:
  - **Naming**: camelCase for vars/functions, PascalCase for Components/Models.

  - **Paths**: Use absolute paths or `workdir` when running commands.

## Project Architecture & Data
- **Database**: MongoDB
  - **Connection**: `process.env.MONGO_URI` (defaults to localhost).
  - **Collections**: `users`, `rooms`, `messages`.
- **Key Features**:
  - **Rooms**: Public (open) & Private (invite-only).
  - **Trash Bin**: Soft-delete mechanism with `deletedAt` field and 3-day automated cleanup.
  - **Invites**: stored in `User` model, managed via `/invitations` routes.
- **Real-time**: Socket.io
  - **Events**: `chat_message`, `room_created`, `room_deleted`, `invitation_received`.
  - **Auth**: Token passed in socket handshake.
