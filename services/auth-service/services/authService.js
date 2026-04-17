const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

class AuthService {
  normalizeRole(role = "PATIENT") {
    return String(role || "PATIENT").trim().toUpperCase();
  }

  sanitizeUser(user) {
    if (!user) return null;

    const obj =
      typeof user.toObject === "function"
        ? user.toObject({ virtuals: true })
        : { ...user };

    if (obj._id && !obj.id) {
      obj.id = String(obj._id);
    }

    delete obj.password;
    return obj;
  }

  signToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
      {
        id: String(user._id || user.id),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );
  }

  async register(userData) {
    const name = String(userData?.name || "").trim();
    const email = String(userData?.email || "").toLowerCase().trim();
    const password = String(userData?.password || "");
    const role = this.normalizeRole(userData?.role || "PATIENT");

    if (!name) throw new Error("Name is required");
    if (!email) throw new Error("Email is required");
    if (!password) throw new Error("Password is required");

    if (!["PATIENT", "DOCTOR", "ADMIN"].includes(role)) {
      throw new Error("Invalid role");
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    const isDoctor = role === "DOCTOR";

    const rawFee =
      userData?.fee === undefined || userData?.fee === null || userData?.fee === ""
        ? 0
        : Number(userData.fee);

    const createdUser = await userRepository.create({
      name,
      email,
      password,
      role,
      specialty: userData?.specialty || "",
      fee: Number.isFinite(rawFee) ? rawFee : 0,
      phone: userData?.phone || "",
      isActive: isDoctor ? false : true,
      isVerified: isDoctor ? false : true,
    });

    const safeUser = this.sanitizeUser(createdUser);

    // Doctors must wait for admin approval before login.
    // So no JWT is returned here for doctor registrations.
    if (isDoctor) {
      return {
        user: safeUser,
        requiresVerification: true,
      };
    }

    const token = this.signToken(createdUser);

    return {
      token,
      user: safeUser,
    };
  }

  async login(email, password) {
    const normalizedEmail = String(email || "").toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      throw new Error("Invalid email or password");
    }

    if (user.role === "DOCTOR" && !user.isVerified) {
      throw new Error(
        "Your doctor account is awaiting admin verification. Please wait for approval."
      );
    }

    if (user.isActive === false) {
      throw new Error("Your account is inactive. Please contact support.");
    }

    const token = this.signToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async deactivateAccount(id) {
    const updated = await userRepository.update(id, { isActive: false });
    if (!updated) {
      throw new Error("User not found");
    }
    return updated;
  }

  async getAllUsers() {
    return userRepository.findAll();
  }

  async updateUserStatus(userId, isActive) {
    const updated = await userRepository.update(userId, { isActive });
    if (!updated) {
      throw new Error("User not found");
    }
    return updated;
  }

  async updateUserRole(userId, role) {
    const normalizedRole = this.normalizeRole(role);

    if (!["PATIENT", "DOCTOR", "ADMIN"].includes(normalizedRole)) {
      throw new Error("Invalid role");
    }

    const updateData = { role: normalizedRole };

    if (normalizedRole === "DOCTOR") {
      updateData.isVerified = false;
      updateData.isActive = false;
    } else {
      updateData.isVerified = true;
      updateData.isActive = true;
    }

    const updated = await userRepository.update(userId, updateData);
    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  async verifyDoctor(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "DOCTOR") {
      throw new Error("Only doctor accounts can be verified");
    }

    // Idempotent: if already verified, just return it.
    if (user.isVerified && user.isActive) {
      return user;
    }

    const updated = await userRepository.update(userId, {
      isVerified: true,
      isActive: true,
    });

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  async getDoctors(filters = {}) {
    return userRepository.findDoctors({
      ...filters,
      isActive: true,
      isVerified: true,
    });
  }

  async getDoctorById(id) {
    const doctor = await userRepository.findById(id);

    if (!doctor || doctor.role !== "DOCTOR") {
      throw new Error("Doctor not found");
    }

    return doctor;
  }

  async deleteUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    await userRepository.delete(userId);
    return {
      id: user._id,
      email: user.email,
      role: user.role,
    };
  }
}

module.exports = new AuthService();