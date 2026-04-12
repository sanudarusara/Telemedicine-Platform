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
    return User.findOne({ email });
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

  async delete(id) {
    return User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
