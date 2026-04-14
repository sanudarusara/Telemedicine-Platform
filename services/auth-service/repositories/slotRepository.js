const Slot = require('../models/Slot');

class SlotRepository {
  async create(slotData) {
    const slot = new Slot(slotData);
    return slot.save();
  }

  async findByDoctorAndDate(doctorId, startDate, endDate) {
    return Slot.find({ doctorId, date: { $gte: startDate, $lte: endDate } }).sort({ timeSlot: 1 });
  }

  async findOneByDoctorDateTime(doctorId, date, timeSlot) {
    // Match by day range to avoid timezone/storage mismatches
    const startDate = new Date(date);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(date);
    endDate.setHours(23,59,59,999);
    return Slot.findOne({ doctorId, date: { $gte: startDate, $lte: endDate }, timeSlot });
  }

  async reserveSlot(doctorId, date, timeSlot) {
    const startDate = new Date(date);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(date);
    endDate.setHours(23,59,59,999);

    return Slot.findOneAndUpdate(
      { doctorId, date: { $gte: startDate, $lte: endDate }, timeSlot, isBooked: false },
      { $set: { isBooked: true } },
      { new: true }
    );
  }

  async releaseSlot(doctorId, date, timeSlot) {
    const startDate = new Date(date);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(date);
    endDate.setHours(23,59,59,999);

    return Slot.findOneAndUpdate(
      { doctorId, date: { $gte: startDate, $lte: endDate }, timeSlot },
      { $set: { isBooked: false } },
      { new: true }
    );
  }
}

module.exports = new SlotRepository();
