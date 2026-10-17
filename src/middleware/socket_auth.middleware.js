import jwt from "jsonwebtoken";
import { env_config } from "../config/env.config.js";

export const socket_auth_middleware = (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const header = socket.handshake.headers.authorization;
      if (header.startsWith("Bearer ")) {
        token = header.split(" ")[1];
      } else {
        token = header;
      }
    }

    if (!token) {
      return next(new Error("UNAUTHORIZED_ACCESS: Authentication token missing."));
    }

    const decoded = jwt.verify(token, env_config.jwt_secret);
    socket.user = decoded;

    next();
  } catch (error) {
    return next(new Error("UNAUTHORIZED_ACCESS: Invalid or expired token."));
  }
};