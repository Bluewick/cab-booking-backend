import Razorpay from "razorpay";
import { env_config } from "./env.config.js";

export const razorpay_client = new Razorpay({
  key_id: env_config.razorpay_key_id,
  key_secret: env_config.razorpay_key_secret,
});