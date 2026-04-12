const mongoose = require('mongoose');

/**
 * Report — represents an uploaded medical document (lab result, prescription
 * image, imaging scan, etc.) that belongs to a Patient.
 */
const ReportSchema = new mongoose.Schema(
  {
    // The Patient document this report belongs to
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    // The User (PATIENT / DOCTOR / ADMIN) who uploaded the file
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
    },
    description: { type: String, trim: true },
    // Relative path under /uploads (local) OR the S3 URL for cloud-stored files
    fileUrl:   { type: String },
    fileName:  { type: String },
    fileType:  { type: String },   // MIME type
    fileSize:  { type: Number },   // bytes
    reportType: {
      type: String,
      enum: ['LAB_RESULT', 'PRESCRIPTION', 'IMAGING', 'DIAGNOSTIC', 'OTHER'],
      default: 'OTHER',
    },
    // AWS S3 storage fields
    s3Key: { type: String },   // object key used when uploading to S3
    s3Url: { type: String },   // full HTTPS URL returned by S3 on upload
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
