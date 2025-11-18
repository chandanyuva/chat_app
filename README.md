# approach for backend


1. Import Express
2. Import HTTP
3. Create Express app
4. Wrap it inside an HTTP server
5.  Import Socket.io
6. Attach Socket.io to the HTTP server
7. Listen for "connection" events
8. Inside the connection:
    1. Listen for your custom "chat_message" event
    2. Broadcast that message using io.emit(...)
9. Start listening on the port

## Expresss
```
Create an Express app
        ↓
Create a custom HTTP server using Node.js
        ↓
Tell that HTTP server to "use" the Express app
        ↓
Then attach Socket.io to that HTTP server
```


>Express is just a function
>A function that knows how to respond to HTTP requests.
>The Node.js HTTP server is the machine
>A machine that receives raw network requests and passes them to a handler function.
>So the HTTP server expects something like:
>```
>httpServer = createServer(handlerFunction)
>```
>And Express itself is that handler function.
>```
>createServer(expressApp)
>```
>The Express app is like the “brain” that the HTTP server uses to decide how to respond.

## socket.io

**Socket.io is event-based, not request-based.**

1. A client connects → server logs the connection
2. Client emits "chat message" → server receives it
3. Server broadcasts the message → all clients get it

```
Client → [emit "message"] → Server → [broadcast] → All Clients
```

## Understand Socket.io Rooms (concept)

Rooms in Socket.io let you:
* Group users
* Broadcast inside a room only
* Keep message streams separate

Each chat item in the Sidebar will have:
* id → this becomes the room name
* name → display only

Thus:

* When a user clicks Alice:
    * → the frontend tells the server to join room: "chat1"

* When user clicks Bob:
    * → join room: "chat2"
    * → messages now flow into that room only

* Sending a message:
    * → server receives "chat_message" with { roomId, message }
    * → server broadcasts to that room only

# approach for frontend

main components
```jsx
<App>
   <Sidebar />
   <ChatWindow>
       <MessageList />
       <MessageInput />
   </ChatWindow>
</App>
```

* using socket.io-client


# Basic architecture

## MongoDB running in Docker
* Persistent volume
* Accessible to backend via hostname mongo

## Backend running in Docker
* Connected to MongoDB through internal DNS
* Exposes port 3000
* Works with socket.io
* Saves messages
* Loads history
* Uses correct CORS rules

## Frontend running in Docker
* Built with Vite
* Served via nginx
* Talks to backend using hostname backend
* Uses proper CORS origin (frontend:5173)
* Works in real time
* Auto-scrolls
* Loads history on room join

## Docker Compose orchestration
* All 3 containers run together automatically:

```
docker compose up -d --build
```

## System's Internal Network Diagram

### Inside Docker:

frontend (nginx)
   ↓       hostname: frontend
backend (node + socket.io)
   ↓       hostname: backend
mongo (mongodb)


### External access (browser):

localhost:5173 → frontend
localhost:3000 → backend (if you open manually)
localhost:27017 → mongo (if using compass, etc)
