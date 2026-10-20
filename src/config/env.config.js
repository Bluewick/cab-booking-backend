import dotenv from "dotenv";

dotenv.config();

// const required_env_vars = ["DATABASE_URL", "JWT_SECRET"];

// for (const env_var of required_env_vars) {
//   if (!process.env[env_var]) {
//     console.error(`[FATAL] Missing required environment variable: ${env_var}`);
//     process.exit(1);
//   }
// }

export const env_config = {
  node_env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  database_url: process.env.DATABASE_URL,
  jwt_secret: process.env.JWT_SECRET,
  jwt_expires_in: process.env.JWT_EXPIRES_IN || "7d",
  cors_origin: process.env.FRONTEND_URL || "http://localhost:5173",
  razorpay_key_id:
    process.env.RAZORPAY_API_KEY ||
    process.env.RAZORPAY_KEY_ID ||
    "rzp_test_placeholder",
  razorpay_key_secret:
    process.env.RAZORPAY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "rzp_secret_placeholder",
};