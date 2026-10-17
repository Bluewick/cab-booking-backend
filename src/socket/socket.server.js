import { Server } from "socket.io";
import { env_config } from "../config/env.config.js";
import { socket_auth_middleware } from "../middleware/socket_auth.middleware.js";
import { register_driver_location_handlers } from "./handlers/driver_location.handler.js";
import { register_ride_dispatch_handlers } from "./handlers/ride_dispatch.handler.js";

let io_instance = null;

export const init_socket_server = (http_server) => {
  io_instance = new Server(http_server, {
    cors: {
      origin: env_config.cors_origin,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authenticate socket connections via JWT
  io_instance.use(socket_auth_middleware);

  io_instance.on("connection", (socket) => {
    const user_id = socket.user.id;
    const role = socket.user.role;

    // Join personal user notification room
    socket.join(`user:${user_id}`);

    // If driver, join available drivers channel
    if (role === "driver") {
      socket.join("drivers:available");
    }

    // Register event sub-handlers
    register_driver_location_handlers(io_instance, socket);
    register_ride_dispatch_handlers(io_instance, socket);

    socket.on("disconnect", (reason) => {
      // Clean disconnect
    });
  });

  return io_instance;
};

export const get_io = () => {
  return io_instance;
};

// Dispatch helper targeting specific user ID
export const emit_to_user = (user_id, event_name, payload) => {
  if (io_instance) {
    io_instance.to(`user:${user_id}`).emit(event_name, payload);
  }
};

// Dispatch helper targeting a shared ride room
export const emit_to_ride = (ride_id, event_name, payload) => {
  if (io_instance) {
    io_instance.to(`ride:${ride_id}`).emit(event_name, payload);
  }
};

// Dispatch helper targeting all online drivers
export const emit_to_available_drivers = (event_name, payload) => {
  if (io_instance) {
    io_instance.to("drivers:available").emit(event_name, payload);
  }
};