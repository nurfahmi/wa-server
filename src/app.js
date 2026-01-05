import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sequelize } from "./models/index.js";
import config from "./config/config.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import whatsappRoutes from "./routes/index.js";
import businessTemplateRoutes from "./routes/businessTemplateRoutes.js";
import warmerRoutes from "./routes/warmerRoutes.js";

// Import WhatsApp service (it's exported as a singleton instance)
import whatsappService from "./services/WhatsAppService.js";

// Import Warmer service
import warmerService from "./services/WarmerService.js";

// Import cron jobs
import "./jobs/cleanupMemories.js";
import "./jobs/cleanupExpiredFiles.js";

// Process error handlers to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Log the error but don't exit the process
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log the error but don't exit the process
});

// Create Express app
const app = express();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://localhost:*"],
        connectSrc: ["'self'", "ws:", "wss:", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-hashes'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
  })
);
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});
app.use(limiter);

// Routes
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/business-templates", businessTemplateRoutes);
app.use("/api/warmer", warmerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MySQL database using Sequelize
    await sequelize.authenticate();
    console.log(`Connected to MySQL database: ${config.database.database}`);

    // Sync models with database (this will create/update tables and indexes)
    try {
      await sequelize.sync({
        force: false, // Never force drop tables - preserve data
        alter: false, // Disabled to prevent "too many keys" error - use migrations for schema changes
      });
      console.log("Database models synchronized successfully");
    } catch (syncError) {
      console.error("Database sync failed:", syncError);
      // If alter fails, try without alter (safer for production)
      console.log("Retrying sync without alter option...");
      try {
        await sequelize.sync({ force: false, alter: false });
        console.log("Database models synchronized successfully (without alter)");
      } catch (retryError) {
        throw retryError; // Re-throw if retry also fails
      }
    }

    // Initialize WhatsApp service
    console.log("Initializing WhatsApp service...");
    await whatsappService.init();
    console.log("WhatsApp service initialized");

    // Initialize Warmer service (if enabled)
    if (config.warmer.enabled) {
      console.log("Initializing Warmer service...");
      await warmerService.init();
      console.log("Warmer service initialized");
    } else {
      console.log("Warmer service disabled via WARMER_ENABLED=false");
    }

    // Start server
    const PORT = config.port;
    
    // Create server and set up error handler BEFORE listening
    const server = app.listen(PORT);
    
    // Handle server errors (e.g., port already in use)
    // This must be set up immediately after creating the server
    server.on('error', (error) => {
      console.error('Express server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`\nTo resolve this:`);
        console.error(`  1. Stop the other process using port ${PORT}`);
        console.error(`  2. Or change PORT in your .env file`);
        console.error(`\nTo find the process using port ${PORT}, run:`);
        console.error(`  lsof -i :${PORT}`);
        console.error(`\nTo kill the process, run:`);
        console.error(`  kill -9 $(lsof -t -i:${PORT})`);
        process.exit(1);
      }
    });
    
    // Handle successful server start
    server.on('listening', () => {
      console.log(`REST API server is running on port ${PORT}`);
      console.log(`WebSocket server is running on port ${config.wsPort}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    
    // Handle port conflicts
    if (err.code === 'EADDRINUSE') {
      const port = err.port || config.port;
      console.error(`\n❌ Port ${port} is already in use.`);
      console.error(`\nTo resolve this:`);
      console.error(`  1. Stop the other process using port ${port}`);
      console.error(`  2. Or change PORT/WS_PORT in your .env file`);
      console.error(`\nTo find the process using port ${port}, run:`);
      console.error(`  lsof -i :${port}`);
      console.error(`\nTo kill the process, run:`);
      console.error(`  kill -9 $(lsof -t -i:${port})`);
    } else if (err.name === "SequelizeUniqueConstraintError") {
      console.error(
        "Duplicate key error. This might be because the database was already initialized."
      );
    }
    process.exit(1);
  }
}

startServer();

// Log process exit events to detect unexpected exits
process.on('exit', (code) => {
  console.log(`Process exiting with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
});
