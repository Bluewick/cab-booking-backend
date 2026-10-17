import express from "express";
import cors from "cors";
// import pool from "./config/db.js";
// import authRoutes from "./routes/auth.routes.js";
import dotenv from "dotenv";
import helmet from "helmet";
import { global_error_handler, not_found_handler } from "./middleware/error.middleware.js";
import { db_pool, query } from "./config/db.config.js";
import { send_success_response } from "./utils/response.util.js";
import auth_routes from "./routes/auth.routes.js";
import user_routes from "./routes/user.routes.js";
import driver_routes from "./routes/driver.routes.js";
import fare_routes from "./routes/fare.routes.js";
import ride_routes from "./routes/ride.routes.js";

dotenv.config();

const app = express();

const CLIENT = process.env.FRONTEND_URL;

const allowedOrigins = [
  CLIENT,
  'http://localhost:5253',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

const allowedRegexPatterns = [
  /^https:\/\/.*\.vercel\.app$/
];

const corsOptions = {
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      allowedRegexPatterns.some((pattern) => pattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy error: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-link-password'],
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// app.use("/api/auth", authRoutes);


app.use("/api/v1/auth", auth_routes);
app.use("/api/v1/users", user_routes);
app.use("/api/v1/drivers", driver_routes);
app.use("/api/v1/fares", fare_routes);
app.use("/api/v1/rides", ride_routes);

app.get("/", (req, res) => {
  res.send("Backend Server is running 🚀");
});

// Server Health Verification Route
app.get("/api/v1/health", async (req, res, next) => {
  try {
    const db_health = await query("SELECT NOW() as db_time, current_database() as db_name");

    return send_success_response(res, {
      status_code: 200,
      message: "Server and database connection are healthy",
      data: {
        server_status: "online",
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          db_time: db_health.rows[0].db_time,
          db_name: db_health.rows[0].db_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Fallback Unmatched Route Handler
app.use(not_found_handler);

// Centralized Application Error Interceptor
app.use(global_error_handler);



const PORT = process.env.PORT || 5213;

try {
  const result = await db_pool.query("SELECT NOW()");
  console.log("✅ PostgreSQL Connected");
  console.log(result.rows[0]);
} catch (err) {
  console.error("❌ Database Connection Failed");
  console.error(err.message);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});