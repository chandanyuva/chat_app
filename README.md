# App Overview

## Frontend Component Tree

This diagram visualizes the component hierarchy, highlighting key state management (in `App`) and the props passed down to child components.

```mermaid
graph TD
    subgraph "App.jsx (Root Controller)"
        App[App]
        AppState[State: user, token, socket, messages, chatList, selectedChatId, authMode]
    end

    App -->|authMode='login'/'signup'| AuthCard[Auth Card Container]
    AuthCard -->|mode, onSubmit| AuthForm[AuthForm.jsx]

    App -->|user is authenticated| Layout[Main Layout]
    Layout --> TopBar[Top Bar]
    Layout --> Content[Main Content Container]

    Content -->|chatList, selectedChatId, onSelectChat| Sidebar[Sidebar.jsx]
    Sidebar -->|id, name, isSelected, onSelectChat| SidebarItem[SidebarItem.jsx]

    Content -->|socket, chatId, messages, userId| Chat[ChatWindow.jsx]
    Chat -->|messages for chatId| MessageList[Messages Area]
    Chat -->|socket.emit chat_message| Input[Input Area]
```

## Component Details

### **App.jsx**
The central controller of the frontend application.
*   **Responsibilities**:
    *   **State Management**: Holds the global state for the authenticated `user`, the active `socket` connection, the list of rooms (`chatList`), and the live `messages` object.
    *   **Authentication Flow**: conditionally renders the `AuthForm` or the main chat interface based on the `user` state.
    *   **Socket.io Connection**: Establishes and manages the websocket connection, listening for `chat_message` and `room_history` events.

### **AuthForm.jsx**
A reusable form component for handling both Login and Signup actions.
*   **Props**:
    *   `mode`: Determines if the form is for "login" or "signup".
    *   `onSubmit`: Function to handle the form submission (calls the backend API).

### **Sidebar.jsx**
Renders the navigation list of available chat rooms.
*   **Props**:
    *   `chatList`: Array of room objects fetched from the backend.
    *   `selectedChatId`: ID of the currently active room to highlight it.
    *   `onSelectChat`: Handler to update the `selectedChatId` in the parent state.

### **ChatWindow.jsx**
The main interface for viewing and sending messages.
*   **Props**:
    *   `socket`: The active socket connection used to emit new messages.
    *   `chatId`: The ID of the current room (used to filter messages).
    *   `messages`: The global messages object (mapped by room ID).
    *   `userId`: Used to distinguish between "incoming" (gray) and "outgoing" (blue) messages.
*   **Key Features**:
    *   **Auto-scroll**: Uses a `useRef` to automatically scroll to the bottom when new messages arrive.
    *   **Real-time**: Listens for updates via the passed `socket` prop (managed in `App`).

## Backend Data Flow

This diagram illustrates how data flows from the client to the server and database.

```mermaid
graph LR
    Client[Client Frontend]
    
    subgraph "Server (Express + Socket.io)"
        Server[server.js]
        Auth[routes/auth.js]
        Socket[Socket Event Handlers]
    end
    
    subgraph "Database (MongoDB)"
        DB[(MongoDB)]
        Models[Models: User, Room, Message]
    end

    Client -->|HTTP POST /login| Auth
    Auth -->|Find/Verify| Models
    Models --> DB

    Client -->|WS Connect| Server
    Client -->|WS Emit: chat_message| Socket
    Socket -->|Save Message| Models
    Socket -->|WS Broadcast| Client
```
