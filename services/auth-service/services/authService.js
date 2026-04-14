const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

/**
 * AuthService — handles registration, login, token generation, and account management.
 * Business logic lives here; the repository handles the DB queries.
 */
class AuthService {
  /**
   * Sign a JWT that encodes the user's id, role, email, and name.
   * Including email and name allows the API Gateway to inject user headers
   * into downstream requests without a database lookup (stateless verification).
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Register a new user.
   * Returns a signed JWT plus the sanitised user object.
   * Patient profile creation is handled by patient-service via Kafka consumer.
   */
  async register(userData) {
    const { name, email, password, role } = userData;

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const user = await userRepository.create({ name, email, password, role });
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Authenticate an existing user with email + password.
   * Returns a signed JWT plus the sanitised user object.
   */
  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async deactivateAccount(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.isActive) {
      throw new Error('Account is already deactivated');
    }

    const updated = await userRepository.update(userId, { isActive: false });
    return {
      id: updated._id,
      email: updated.email,
      isActive: updated.isActive,
    };
  }

  async getAllUsers() {
    return userRepository.findAll();
  }

  async updateUserStatus(userId, isActive) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const updated = await userRepository.update(userId, { isActive });
    return {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
    };
  }

  async updateUserRole(userId, role) {
    const validRoles = ['PATIENT', 'DOCTOR', 'ADMIN'];
    if (!validRoles.includes(role)) throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const updated = await userRepository.update(userId, { role });
    return {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
    };
  }

  async verifyDoctor(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.role !== 'DOCTOR') throw new Error('User is not registered as a DOCTOR');
    const updated = await userRepository.update(userId, { isVerified: true });
    return {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      isVerified: updated.isVerified,
    };
  }
}

module.exports = new AuthService();
