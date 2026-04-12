const Report = require('../models/Report');

/**
 * ReportRepository — all direct Mongoose queries for the Report collection.
 */
class ReportRepository {
  /** Persist a new Report document. */
  async create(reportData) {
    const report = new Report(reportData);
    return report.save();
  }

  /** Get all reports for a patient, newest first, with uploader info. */
  async findByPatientId(patientId) {
    return Report.find({ patientId })
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
  }

  /** Find a single report by its _id. */
  async findById(id) {
    return Report.findById(id).populate('uploadedBy', 'name email role');
  }

  /** Hard-delete a report document. Caller is responsible for deleting the file. */
  async delete(id) {
    return Report.findByIdAndDelete(id);
  }

  /** Filter reports for a patient by report type, newest first. */
  async findByPatientAndType(patientId, reportType) {
    return Report.find({ patientId, reportType })
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
  }
}

module.exports = new ReportRepository();
