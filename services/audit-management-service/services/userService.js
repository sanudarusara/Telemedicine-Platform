const axios = require('axios');

const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://localhost:3001';

/**
 * Fetches the current role of a user via synchronous REST call to the
 * Patient Management Service. This is called by the Kafka consumer when
 * an incoming event does not include a userRole field.
 *
 * Falls back to "UNKNOWN" on any network or parsing failure so audit
 * logging is never blocked by an unavailable upstream service.
 *
 * @param {string} userId
 * @returns {Promise<string>} Uppercase role string or "UNKNOWN"
 */
const getUserRole = async (userId) => {
  try {
    const response = await axios.get(`${PATIENT_SERVICE_URL}/api/users/${userId}`, {
      timeout: 5000, // Fail fast — don't block audit processing
    });

    // Support multiple response shapes from different services
    const role =
      response.data?.role ||
      response.data?.userRole ||
      response.data?.data?.role ||
      response.data?.data?.userRole;

    if (role) {
      return role.toUpperCase();
    }

    console.warn(`[UserService] Role field absent in response for userId: ${userId}`);
    return 'UNKNOWN';
  } catch (error) {
    if (error.response) {
      console.warn(
        `[UserService] Patient service returned HTTP ${error.response.status} for userId: ${userId}`
      );
    } else if (error.code === 'ECONNREFUSED') {
      console.warn(`[UserService] Patient service connection refused (userId: ${userId})`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.warn(`[UserService] Patient service request timed out (userId: ${userId})`);
    } else {
      console.warn(`[UserService] Unexpected error for userId ${userId}: ${error.message}`);
    }

    // Graceful fallback — audit log will still be stored with UNKNOWN role
    return 'UNKNOWN';
  }
};

module.exports = { getUserRole };
