const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { reportService, pdfService, csvService } = require('../services');
const { toMysqlDateTime } = require('../utils/network');
const { isIn } = require('../utils/validators');

const VALID_TYPES = ['traffic', 'alerts', 'devices'];
const VALID_FORMATS = ['pdf', 'csv'];

/**
 * Format a Date to YYYYMMDD_HHmmss string for unique clean filenames
 */
function getTimestampSlug(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${year}${month}${day}_${hours}${mins}${secs}`;
}

/**
 * POST /api/reports
 * Generate and save a new PDF or CSV report
 */
async function createReport(req, res, next) {
  try {
    const { report_type, format, start_time, end_time } = req.body;

    if (!isIn(report_type, VALID_TYPES)) {
      return res.status(400).json({ message: "report_type must be 'traffic', 'alerts', or 'devices'" });
    }

    if (!isIn(format, VALID_FORMATS)) {
      return res.status(400).json({ message: "format must be 'pdf' or 'csv'" });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({ message: 'start_time and end_time are required' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start_time or end_time format' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ message: 'start_time must be strictly before end_time' });
    }

    // Maximum report duration is 30 days
    const maxDurationMs = 30 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxDurationMs) {
      return res.status(400).json({ message: 'Report range cannot exceed 30 days' });
    }

    // Ensure backend/reports directory exists
    const reportsDir = path.resolve(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${report_type}_${getTimestampSlug()}_${req.user.id}.${format}`;
    const fullPath = path.join(reportsDir, filename);
    const relativeFilePath = `reports/${filename}`;

    // 1. Build report data
    let data;
    if (report_type === 'traffic') {
      data = await reportService.buildTrafficReport(startDate, endDate);
    } else if (report_type === 'alerts') {
      data = await reportService.buildAlertsReport(startDate, endDate);
    } else if (report_type === 'devices') {
      data = await reportService.buildDevicesReport(startDate, endDate);
    }

    // 2. Generate file
    if (format === 'pdf') {
      await pdfService.generatePdf(data, fullPath, req.user.name);
    } else if (format === 'csv') {
      await csvService.generateCsv(data, fullPath);
    }

    // 3. Save report record in database
    const [result] = await db.query(
      `INSERT INTO reports (user_id, report_type, format, start_time, end_time, file_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        report_type,
        format,
        toMysqlDateTime(startDate),
        toMysqlDateTime(endDate),
        relativeFilePath,
      ]
    );

    const [newRow] = await db.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);

    return res.status(201).json(newRow[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports
 * List reports with pagination (users see their own; admin sees all)
 */
async function getReports(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) AS total FROM reports';
    let dataQuery = `
      SELECT r.*, u.name AS user_name, u.email AS user_email
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
    `;
    const params = [];
    const countParams = [];

    if (!isAdmin) {
      countQuery += ' WHERE user_id = ?';
      dataQuery += ' WHERE r.user_id = ?';
      params.push(req.user.id);
      countParams.push(req.user.id);
    }

    dataQuery += ' ORDER BY r.generated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [countResult] = await db.query(countQuery, countParams);
    const total = Number(countResult[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const [rows] = await db.query(dataQuery, params);

    return res.status(200).json({
      data: rows,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/history-summary
 * Returns daily aggregate counts for historical analysis
 */
async function getHistorySummary(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const summary = await reportService.getHistorySummary(days);
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/:id/download
 * Download report file (owner or admin)
 */
async function downloadReport(req, res, next) {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const [rows] = await db.query('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const report = rows[0];

    // Ownership & permission check
    if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only download your own reports' });
    }

    const filePath = path.isAbsolute(report.file_path)
      ? report.file_path
      : path.resolve(__dirname, '../../', report.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Report file not found on disk' });
    }

    const contentType = report.format === 'pdf' ? 'application/pdf' : 'text/csv';
    const downloadName = path.basename(filePath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/reports/:id
 * Delete report file and record (owner or admin)
 */
async function deleteReport(req, res, next) {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const [rows] = await db.query('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const report = rows[0];

    // Ownership & permission check
    if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own reports' });
    }

    // Delete file from disk if present
    const filePath = path.isAbsolute(report.file_path)
      ? report.file_path
      : path.resolve(__dirname, '../../', report.file_path);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to unlink report file:', err.message);
      }
    }

    // Delete row from database
    await db.query('DELETE FROM reports WHERE id = ?', [reportId]);

    return res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
  getReports,
  getHistorySummary,
  downloadReport,
  deleteReport,
};
