import * as driver_model from "../../models/driver.model.js";

export const register_driver_location_handlers = (io, socket) => {
  socket.on("driver:update_location", async (payload, callback) => {
    try {
      if (socket.user.role !== "driver") {
        if (typeof callback === "function") {
          callback({ success: false, message: "Unauthorized: Driver role required." });
        }
        return;
      }

      const { latitude, longitude, bearing = 0.0, speed = 0.0, ride_id = null } = payload;

      if (!latitude || !longitude) {
        if (typeof callback === "function") {
          callback({ success: false, message: "Latitude and longitude are mandatory." });
        }
        return;
      }

      const driver = await driver_model.find_driver_by_user_id(socket.user.id);
      if (!driver) {
        if (typeof callback === "function") {
          callback({ success: false, message: "Driver profile not found." });
        }
        return;
      }

      // Update spatial coordinates in PostgreSQL
      await driver_model.update_driver_telemetry(driver.driver_id, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        bearing: parseFloat(bearing),
        speed: parseFloat(speed),
      });

      const location_payload = {
        driver_id: driver.driver_id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        bearing: parseFloat(bearing),
        speed: parseFloat(speed),
        timestamp: new Date().toISOString(),
      };

      // Broadcast telemetry to the specific ride room if the driver is currently assigned
      if (ride_id) {
        io.to(`ride:${ride_id}`).emit("ride:location_broadcast", location_payload);
      }

      if (typeof callback === "function") {
        callback({ success: true, message: "Location updated successfully." });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({ success: false, message: error.message });
      }
    }
  });
};