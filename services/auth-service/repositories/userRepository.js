const User = require('../models/User');

/**
 * UserRepository — all direct Mongoose queries for the User collection.
 * Keeps database access separate from business logic.
 */
class UserRepository {
  async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  async findByEmail(email) {
    if (!email) return null;
    const normalized = (email || '').toLowerCase().trim();
    return User.findOne({ email: normalized });
  }

  async findById(id) {
    return User.findById(id).select('-password');
  }

  async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
  }

  async findAll() {
    return User.find().select('-password');
  }

  async findDoctors(filter = {}) {
    const query = Object.assign({}, filter, { role: 'DOCTOR' });
    return User.find(query).select('-password');
  }

  async delete(id) {
    return User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
