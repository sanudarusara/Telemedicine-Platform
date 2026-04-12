const reportService = require('../services/reportService');
const { publishEvent } = require('../kafka');
const TOPICS = require('../../shared/kafka/topics');
const EVENTS = require('../../shared/kafka/events');
const { createEvent } = require('../../shared/kafka/eventFactory');

/**
 * ReportController — handles HTTP requests for medical report upload,
 * retrieval, and deletion endpoints.
 */
class ReportController {
  /**
   * POST /api/reports/upload/:userId  (PATIENT, DOCTOR, ADMIN)
   * Upload a medical report file for a patient.
   * Multipart/form-data: field "report" = file
   * Body fields: title (required), description?, reportType?
   */
  async uploadReport(req, res) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'No file uploaded' });
      }

      if (!req.body.title) {
        return res
          .status(400)
          .json({ success: false, message: 'Report title is required' });
      }

      const report = await reportService.uploadReportToS3(
        req.params.userId,
        req.file,
        { ...req.body, uploadedBy: req.user.id }
      );

      // Publish report uploaded event
      const event = createEvent({
        eventType: EVENTS.REPORT_UPLOADED,
        userId: req.params.userId,
        userRole: 'PATIENT',
        serviceName: 'patient-management-service',
        description: `Medical report uploaded: ${req.body.title}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: {
          reportId: report?._id?.toString(),
          reportTitle: req.body.title,
          reportType: req.body.reportType,
          uploadedBy: req.user.id,
          fileName: req.file.originalname,
        },
      });

      publishEvent(TOPICS.REPORT_UPLOADED, event).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Report uploaded successfully',
        data: report,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/reports/:userId  (PATIENT, DOCTOR, ADMIN)
   * Return all reports belonging to a patient.
   */
  async getReports(req, res) {
    try {
      const reports = await reportService.getReportsByPatient(req.params.userId);
      return res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
      });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/reports/single/:reportId  (PATIENT, DOCTOR, ADMIN)
   * Return a single report by its _id.
   */
  async getReportById(req, res) {
    try {
      const report = await reportService.getReportById(req.params.reportId);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/reports/:reportId  (ADMIN only)
   * Delete a report and its associated file from disk.
   */
  async deleteReport(req, res) {
    try {
      const report = await reportService.getReportById(req.params.reportId);
      await reportService.deleteReport(req.params.reportId);

      // Publish report deleted event
      const event = createEvent({
        eventType: EVENTS.REPORT_DELETED,
        userId: report.patientId,
        userRole: req.user.role,
        serviceName: 'patient-management-service',
        description: `Medical report deleted by ${req.user.role}`,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        metadata: {
          reportId: req.params.reportId,
          reportTitle: report.title,
          deletedBy: req.user.id,
        },
      });

      publishEvent(TOPICS.REPORT_DELETED, event).catch(() => {});

      return res
        .status(200)
        .json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/reports/:userId/type/:reportType  (PATIENT, DOCTOR, ADMIN)
   * Return reports filtered by type for a patient.
   * reportType: LAB_RESULT | PRESCRIPTION | IMAGING | DIAGNOSTIC | OTHER
   */
  async getReportsByType(req, res) {
    try {
      const { userId, reportType } = req.params;
      const reports = await reportService.getReportsByType(userId, reportType);
      return res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
      });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ReportController();
