export const register_ride_dispatch_handlers = (io, socket) => {
  // Join a dedicated room for an active ride
  socket.on("ride:join", (payload, callback) => {
    try {
      const { ride_id } = payload;
      if (!ride_id) {
        if (typeof callback === "function") callback({ success: false, message: "ride_id is required." });
        return;
      }

      socket.join(`ride:${ride_id}`);

      if (typeof callback === "function") {
        callback({ success: true, message: `Successfully joined room ride:${ride_id}` });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({ success: false, message: error.message });
      }
    }
  });

  // Leave a dedicated room when ride completes or cancels
  socket.on("ride:leave", (payload, callback) => {
    try {
      const { ride_id } = payload;
      if (ride_id) {
        socket.leave(`ride:${ride_id}`);
      }

      if (typeof callback === "function") {
        callback({ success: true, message: `Successfully left room ride:${ride_id}` });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({ success: false, message: error.message });
      }
    }
  });
};