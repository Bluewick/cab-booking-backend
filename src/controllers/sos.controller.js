import * as sos_service from "../services/sos.service.js";
import { send_success_response } from "../utils/response.util.js";

export const trigger_sos = async (req, res, next) => {
  try {
    const { ride_id, latitude, longitude } = req.body;
    const result = await sos_service.trigger_emergency_sos(req.user.id, {
      ride_id,
      latitude,
      longitude,
    });
    return send_success_response(res, {
      status_code: 201,
      message: "EMERGENCY SOS ALERT ACTIVATED. Safety services and emergency contacts notified.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resolve_sos = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const result = await sos_service.resolve_emergency_sos(req.params.id, {
      status,
      notes,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Emergency alert status updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const list_active_sos_alerts = async (req, res, next) => {
  try {
    const alerts = await sos_service.get_active_emergency_alerts();
    return send_success_response(res, {
      status_code: 200,
      message: "Active emergency alerts retrieved successfully.",
      data: { alerts },
    });
  } catch (error) {
    next(error);
  }
};