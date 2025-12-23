# Agent Guidelines for Chat App

## Build & Run Commands
- **Frontend** (`/frontend`):
  - Lint: `npm run lint` (ESLint)
  - Build: `npm run build` (Vite)
  - Dev: `npm run dev`
- **Backend** (`/backend`):
  - Dev: `npm run dev` (Nodemon)
  - Start: `npm start`
- **Tests**: No test runners configured. If adding tests, use Jest/Vitest conventions.

## Code Style & Conventions
- **Frontend (React/Vite)**:
  - **Format**: Functional components, `.jsx` extension, ESM imports.
  - **State**: React Hooks (`useState`, `useEffect`).
  - **Linting**: Strict `no-unused-vars` (except capitalized).
- **Backend (Node/Express)**:
  - **Format**: CommonJS (`require`), Mongoose models, Express routes.
  - **Async**: Use `async/await` with `try/catch` blocks.
- **General**:
  - **Naming**: camelCase for vars/functions, PascalCase for Components/Models.
  - **Paths**: Use absolute paths or `workdir` when running commands.
