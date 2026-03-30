// Central API configuration
const BASE_URL = "http://localhost:5001";

export const API = {
  rooms:            `${BASE_URL}/digitalTwinState`,
  baseline:         `${BASE_URL}/baseline`,
  strategies:       `${BASE_URL}/strategies`,
  simulate:         `${BASE_URL}/simulate`,
  suggest:          `${BASE_URL}/suggest-strategies`,
  applyStrategy:    `${BASE_URL}/apply-strategy`,
  deployStrategy:   `${BASE_URL}/deploy-strategy`,
  alarms:           `${BASE_URL}/alarms`,
  acknowledgeAlarm: `${BASE_URL}/alarms/acknowledge`,
  wardenSummary:    `${BASE_URL}/wardenSummary`,
};

export default BASE_URL;
