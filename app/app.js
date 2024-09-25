require("dotenv").config();
const express = require('express');
const cors = require('cors');
const ErrorMiddleware = require("../middleware/error");

const app = express();

app.use(express.json({ limit: "50mb" }));

const ORIGIN = process.env.ORIGIN; // Set the origin from environment variables

// Enable CORS middleware
app.use(cors({
    origin: ORIGIN, // Replace with your allowed origin(s)
    methods: ['GET', 'POST'], // Allowed methods
    credentials: true // If you need to allow credentials like cookies
}));


// Middleware setup (body-parser, etc.)
app.use(express.json());


// routes here


// testing api
app.get("/api/health", (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});

// unknown route
app.all("*", (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
});

// Error handler middleware
app.use(ErrorMiddleware);

module.exports = app;