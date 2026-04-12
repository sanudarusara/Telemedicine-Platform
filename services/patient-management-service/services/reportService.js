const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const reportRepository = require('../repositories/reportRepository');
const patientRepository = require('../repositories/patientRepository');

/**
 * ReportService — business logic for uploading and retrieving medical reports.
 */
class ReportService {
  /**
   * Save the uploaded file metadata to the database after multer has
   * written the file to disk.
   *
   * @param {string} userId  - User ID of the patient the report belongs to.
   * @param {object} file    - Multer file object (filename, originalname, etc.)
   * @param {object} data    - Report metadata (title, description, reportType, uploadedBy)
   */
  async uploadReport(userId, file, data) {
    // Resolve the patient profile from the userId
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');

    return reportRepository.create({
      patientId:   patient._id,
      uploadedBy:  data.uploadedBy,
      title:       data.title,
      description: data.description,
      fileUrl:     `/uploads/${file.filename}`,
      fileName:    file.originalname,
      fileType:    file.mimetype,
      fileSize:    file.size,
      reportType:  data.reportType || 'OTHER',
    });
  }

  /**
   * Upload a file to AWS S3 and save the report metadata to MongoDB.
   *
   * @param {string} userId   - User ID of the patient the report belongs to.
   * @param {object} file     - Multer file object with `buffer`, `originalname`,
   *                           `mimetype`, and `size` (memoryStorage).
   * @param {object} metadata - { title, description, reportType, uploadedBy }
   * @returns {Promise<Report>} The saved Report document.
   */
  async uploadReportToS3(userId, file, metadata) {
    // 1. Resolve the patient profile from userId
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');

    // 2. Build a collision-resistant S3 object key
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const s3Key = `reports/${userId}/${Date.now()}-${uniqueId}${ext}`;

    // 3. Upload the file buffer directly to S3
    const s3 = new AWS.S3({
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region:          process.env.AWS_REGION,
    });

    const uploadResult = await s3
      .upload({
        Bucket:             process.env.AWS_S3_BUCKET,
        Key:                s3Key,
        Body:               file.buffer,
        ContentType:        file.mimetype,
        ContentDisposition: 'inline',
      })
      .promise();

    // 4. Persist report metadata (including S3 location) to MongoDB
    return reportRepository.create({
      patientId:   patient._id,
      uploadedBy:  metadata.uploadedBy,
      title:       metadata.title,
      description: metadata.description,
      reportType:  metadata.reportType || 'OTHER',
      fileName:    file.originalname,
      fileType:    file.mimetype,
      fileSize:    file.size,
      s3Key,
      s3Url:       uploadResult.Location,
      fileUrl:     uploadResult.Location, // kept for backward compatibility
    });
  }

  /** Return all reports for a patient, newest first. */
  async getReportsByPatient(userId) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');
    return reportRepository.findByPatientId(patient._id);
  }

  /** Return a single report by its _id. */
  async getReportById(reportId) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new Error('Report not found');
    return report;
  }

  /**
   * Delete a report document and remove its file from disk.
   */
  async deleteReport(reportId) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new Error('Report not found');

    // Remove the physical file if it still exists
    const filePath = path.join(__dirname, '..', report.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return reportRepository.delete(reportId);
  }

  /** Return reports for a patient filtered by reportType. */
  async getReportsByType(userId, reportType) {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new Error('Patient not found');
    return reportRepository.findByPatientAndType(patient._id, reportType);
  }
}

module.exports = new ReportService();
