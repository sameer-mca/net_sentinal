const db = require('../config/db');
const { isIn } = require('../utils/validators');

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

/**
 * GET /api/rules
 * List all detection rules (any logged-in user)
 */
async function getRules(req, res, next) {
  try {
    const [rules] = await db.query('SELECT * FROM detection_rules ORDER BY id ASC');
    return res.status(200).json(rules);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/rules/:id
 * Admin only: update rule thresholds and description
 */
async function updateRule(req, res, next) {
  try {
    const ruleId = parseInt(req.params.id, 10);
    if (isNaN(ruleId)) {
      return res.status(400).json({ message: 'Invalid rule ID' });
    }

    const { threshold_value, time_window, severity, description } = req.body;

    const thresholdVal = Number(threshold_value);
    if (isNaN(thresholdVal) || thresholdVal <= 0) {
      return res.status(400).json({ message: 'threshold_value must be a number greater than 0' });
    }

    const timeWin = parseInt(time_window, 10);
    if (isNaN(timeWin) || timeWin < 1 || timeWin > 3600) {
      return res.status(400).json({ message: 'time_window must be an integer between 1 and 3600 seconds' });
    }

    const cleanSeverity = String(severity || '').toLowerCase();
    if (!isIn(cleanSeverity, VALID_SEVERITIES)) {
      return res.status(400).json({ message: 'severity must be one of low, medium, high, or critical' });
    }

    const [existing] = await db.query('SELECT id FROM detection_rules WHERE id = ?', [ruleId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Detection rule not found' });
    }

    await db.query(
      `UPDATE detection_rules 
       SET threshold_value = ?, time_window = ?, severity = ?, description = ?
       WHERE id = ?`,
      [thresholdVal, timeWin, cleanSeverity, description || '', ruleId]
    );

    const [updatedRows] = await db.query('SELECT * FROM detection_rules WHERE id = ?', [ruleId]);
    return res.status(200).json(updatedRows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/rules/:id/toggle
 * Admin only: toggle is_active status of a rule
 */
async function toggleRule(req, res, next) {
  try {
    const ruleId = parseInt(req.params.id, 10);
    if (isNaN(ruleId)) {
      return res.status(400).json({ message: 'Invalid rule ID' });
    }

    const [existing] = await db.query('SELECT id, is_active FROM detection_rules WHERE id = ?', [ruleId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Detection rule not found' });
    }

    await db.query(
      'UPDATE detection_rules SET is_active = NOT is_active WHERE id = ?',
      [ruleId]
    );

    const [updatedRows] = await db.query('SELECT * FROM detection_rules WHERE id = ?', [ruleId]);
    return res.status(200).json(updatedRows[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRules,
  updateRule,
  toggleRule,
};
