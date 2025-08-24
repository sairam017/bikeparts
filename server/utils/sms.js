const twilio = require('twilio');

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_MESSAGING_SERVICE_SID, DEFAULT_COUNTRY_CODE = '+91' } = process.env;
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const maskedSid = TWILIO_ACCOUNT_SID.slice(0,4) + '...' + TWILIO_ACCOUNT_SID.slice(-4);
    console.log(`[SMS] Twilio client initialized for ${maskedSid} (MSID:${TWILIO_MESSAGING_SERVICE_SID? 'yes':'no'} FROM:${TWILIO_FROM_NUMBER? 'yes':'no'})`);
  } catch (e) {
    console.warn('Failed to init Twilio client:', e.message);
  }
} else {
  console.warn('[SMS] Twilio credentials missing (SID or AUTH TOKEN not set).');
}

function normalizePhone(raw){
  if (!raw) return raw;
  let to = raw.trim();
  // If only digits and length 10 (likely local India mobile), prepend default country
  if (/^[0-9]{10}$/.test(to)) {
    to = `${DEFAULT_COUNTRY_CODE}${to}`;
  }
  // Ensure starts with +
  if (!to.startsWith('+') && DEFAULT_COUNTRY_CODE.startsWith('+')) {
    // Remove non-digits then prepend
    const digits = to.replace(/[^0-9]/g,'');
    to = DEFAULT_COUNTRY_CODE + digits;
  }
  return to;
}

async function sendSMS(to, body){
  if (!client) { return { ok:false, error:'Twilio not configured' }; }
  if (!to) { return { ok:false, error:'No destination phone provided' }; }
  const norm = normalizePhone(to);
  try {
    const params = { to: norm, body };
    if (TWILIO_MESSAGING_SERVICE_SID) {
      params.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else if (TWILIO_FROM_NUMBER) {
      params.from = TWILIO_FROM_NUMBER;
    } else {
      return { ok:false, error:'No FROM or Messaging Service configured' };
    }
  const resp = await client.messages.create(params);
  return { ok:true, to: norm, sid: resp.sid };
  } catch (e) {
  // Twilio auth errors often include code (e.g., 20003 for authentication)
  return { ok:false, error: e.message, code: e.code };
  }
}

module.exports = { sendSMS };
