const VideoSession = require("../model/videoSession.model");

const fetchAppointmentById = async (appointmentId, req) => {
  const gatewayUrl = (process.env.DOCTOR_SERVICE_URL || "http://api-gateway:5400").replace(/\/+$/, "");
  const url = `${gatewayUrl}/api/appointments/${appointmentId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: req.headers.authorization || "",
      "Content-Type": "application/json",
      "x-api-key": process.env.INTERNAL_API_KEY || "",
      "x-gateway": "true",
      "x-user-id": req.doctor._id,
      "x-user-role": req.doctor.role,
      "x-user-email": req.doctor.email || "",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.message || "Unable to validate appointment");
    error.statusCode = response.status;
    throw error;
  }

  return data?.data || data?.appointment || data;
};

const createVideoRoom = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "appointmentId is required" });
    }

    const appointment = await fetchAppointmentById(appointmentId, req);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (String(appointment.doctorId) !== String(req.doctor._id)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to access this appointment" });
    }

    if (appointment.status !== "confirmed") {
      return res.status(400).json({
        message: `Only confirmed appointments can start telemedicine. Current status: ${appointment.status}`,
      });
    }

    const roomName = `telemed-${appointmentId}`;
    const jitsiDomain = process.env.JITSI_DOMAIN || "meet.jit.si";

    let token = null;
    let joinUrl = `https://${jitsiDomain}/${roomName}`;

    if (
      process.env.JITSI_SECRET_KEY &&
      process.env.JITSI_APP_ID &&
      jitsiDomain !== "meet.jit.si"
    ) {
      token = jwt.sign(
        {
          aud: "jitsi",
          iss: process.env.JITSI_APP_ID,
          sub: jitsiDomain,
          room: roomName,
          context: {
            user: {
              id: String(req.doctor._id),
              name: "Doctor",
              moderator: true,
            },
          },
        },
        process.env.JITSI_SECRET_KEY,
        { expiresIn: "2h" }
      );

      joinUrl = `https://${jitsiDomain}/${roomName}?jwt=${token}`;
    }

    let session = await VideoSession.findOne({ appointmentId });

    if (!session) {
      session = await VideoSession.create({
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        roomName,
        joinUrl,
        status: "created",
      });
    } else {
      session.roomName = roomName;
      session.joinUrl = joinUrl;
      if (session.status === "ended") {
        session.status = "created";
        session.endedAt = null;
      }
      await session.save();
    }

    return res.status(200).json({
      message: "Video room created successfully",
      session: {
        id: session._id,
        appointmentId: session.appointmentId,
        doctorId: session.doctorId,
        patientId: session.patientId,
        roomName: session.roomName,
        joinUrl: session.joinUrl,
        status: session.status,
      },
      token,
    });
  } catch (error) {
    console.error("Error creating video room:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error creating video room",
    });
  }
};

const getVideoSessionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const session = await VideoSession.findOne({ appointmentId });

    if (!session) {
      return res.status(404).json({ message: "Video session not found" });
    }

    if (String(session.doctorId) !== String(req.doctor._id)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to view this video session" });
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error("Error fetching video session:", error);
    return res.status(500).json({ message: "Error fetching video session" });
  }
};

const endVideoSession = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const session = await VideoSession.findOne({ appointmentId });

    if (!session) {
      return res.status(404).json({ message: "Video session not found" });
    }

    if (String(session.doctorId) !== String(req.doctor._id)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to end this session" });
    }

    session.status = "ended";
    session.endedAt = new Date();
    await session.save();

    return res.status(200).json({
      message: "Video session ended successfully",
      session,
    });
  } catch (error) {
    console.error("Error ending video session:", error);
    return res.status(500).json({ message: "Error ending video session" });
  }
};

/**
 * POST /api/telemedicine/join-room
 * Patient endpoint — looks up an existing video session for an appointment
 * and returns the joinUrl so the patient can enter the call.
 */
const joinRoom = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "appointmentId is required" });
    }

    const session = await VideoSession.findOne({ appointmentId });

    if (!session) {
      return res.status(404).json({
        message: "Video session not found. The doctor may not have started the call yet.",
      });
    }

    if (String(session.patientId) !== String(req.patient._id)) {
      return res.status(403).json({ message: "You are not allowed to join this session" });
    }

    if (session.status === "ended") {
      return res.status(400).json({ message: "This video session has already ended" });
    }

    return res.status(200).json({
      message: "Joined video room successfully",
      session: {
        id: session._id,
        appointmentId: session.appointmentId,
        roomName: session.roomName,
        joinUrl: session.joinUrl,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("Error joining video room:", error);
    return res.status(500).json({ message: "Error joining video room" });
  }
};

module.exports = {
  createVideoRoom,
  getVideoSessionByAppointment,
  endVideoSession,
  joinRoom,
};