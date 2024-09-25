require("dotenv").config();
const http = require('http');
const app = require('./app/app');
const { Server } = require('socket.io');

const PORT = process.env.PORT; // Set the port from environment variables
const APP_URL = process.env.APP_URL; // Set the application url from environment variables
const ORIGIN = process.env.ORIGIN; // Set the origin from environment variables

// Create an HTTP server with the Express app
const server = http.createServer(app);

// Initialize Socket.io on the HTTP server
const io = new Server(server, {
    cors:{
        origin: ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
    },
    handlePreflightRequest: (req, res) => {
        const origin = req.headers.origin;
        if (ORIGIN.includes(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", true);
        res.writeHead(200);
        res.end();
    },
    allowRequest: (req, callback) => {
        const origin = req.headers.origin;
        const isOriginAllowed = ORIGIN.includes(origin);
        callback(null, isOriginAllowed);
    }
});

global.io = io;


// Store online user data
const userData = [];

// Add a user to the userData array
const addUser = ({ socketID, userID, session_token }) => {
    // Check if the user already exists in the userData array
    const existingUser = userData.find(user => user.userID === userID || user.session_token === session_token);
    
    if (!existingUser) {
        // If the user does not exist, add them
        userData.push({ socketID, userID, session_token });
    } else {
        // If the user exists, you may want to update their socketID or other data
        existingUser.socketID = socketID; // Update socketID if the user already exists
    }

    // Emit updated list of online users
    io.emit('onlineUser', userData);
};

// Remove a user from the userData array
const removeUser = (socketID) => {
    const index = userData.findIndex(user => user.socketID === socketID);

    if (index !== -1) {
        // If user is found, remove them
        const removedUser = userData.splice(index, 1)[0];
    }

    // Emit updated list of online users
    io.emit('onlineUser', userData);
};

const usersTyping = new Map(); // Map to store users who are typing

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on ${APP_URL}:${PORT}`);
});


// Example of handling a socket connection
io.on('connection', (socket) => {
    io.emit('noOfConnections', io.engine.clientsCount);
    io.emit('onlineUser', userData);

    const socketId = socket.id; // Socket ID

    // Notify disconnect
    socket.on('disconnect', () => {
        io.emit('noOfConnections', io.engine.clientsCount)
        removeUser(socketId);

        const user = usersTyping.get(socket.id);

        if (user) {
            const { userID, session_token, conversationID } = user;

            // Notify only users in this conversation
            socket.broadcast.emit('userStoppedTyping', { userID, session_token, conversationID });
        }

        usersTyping.delete(socket.id);
    });

    // Notify when join
    socket.on('joined', ({ userID, session_token }) => {
        addUser({ socketID: socketId, userID, session_token });
    });

    // Notify message
    socket.on('message', (data) => {
        io.emit('message', data);
    });

    // Notify when message seen
    socket.on('messageSeen', (data) => {
        io.emit('messageSeen', data)
    });

    // Handle typing event
    socket.on('typing', (data) => {
        const { userID, session_token, conversationID } = data;

        // Store typing status for the conversation
        usersTyping.set(socketId, { userID, session_token, conversationID });

        // Notify only users in this conversation
        socket.broadcast.emit('userTyping', { userID, session_token, conversationID });
    });

    // Handle stop typing event
    socket.on('stoptyping', () => {
        const user = usersTyping.get(socketId);

        if (user) {
            const { userID, session_token, conversationID } = user;

            // Notify only users in this conversation
            socket.broadcast.emit('userStoppedTyping', { userID, session_token, conversationID });
        }

        usersTyping.delete(socketId);
    });


})