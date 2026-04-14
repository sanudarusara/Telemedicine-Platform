const slotRepository = require('../repositories/slotRepository');
const mongoose = require('mongoose');

class SlotService {
  async getSlotsForDoctor(doctorId, dateStr) {
    const date = dateStr ? new Date(dateStr) : null;
    if (!date) {
      // return next 7 days
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return slotRepository.findByDoctorAndDate(doctorId, now, end);
    }
    const startDate = new Date(date);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(date);
    endDate.setHours(23,59,59,999);
    return slotRepository.findByDoctorAndDate(doctorId, startDate, endDate);
  }

  async reserve(doctorId, dateStr, timeSlot) {
    const date = new Date(dateStr);
    date.setHours(0,0,0,0);
    return slotRepository.reserveSlot(doctorId, date, timeSlot);
  }

  async release(doctorId, dateStr, timeSlot) {
    const date = new Date(dateStr);
    date.setHours(0,0,0,0);
    return slotRepository.releaseSlot(doctorId, date, timeSlot);
  }
}

module.exports = new SlotService();
