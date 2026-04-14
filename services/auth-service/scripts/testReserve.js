const axios = require('axios');

const BASE = 'http://localhost:5000/api/auth';
const HEADERS = {
  'x-gateway': 'true',
  'x-api-key': 'gateway-secret-key-change-in-production',
  'x-user-id': 'service',
  'x-user-role': 'SERVICE',
  'Content-Type': 'application/json'
};

async function run(){
  try{
    const doctorsRes = await axios.get(`${BASE}/doctors`, { headers: HEADERS });
    const doctors = doctorsRes.data || [];
    if(!doctors.length){
      console.error('No doctors found');
      return process.exit(1);
    }
    const doctor = doctors[0];
    console.log('Using doctor:', doctor._id || doctor.id || doctor.email || JSON.stringify(doctor));

    // list slots (first page)
    const date = new Date().toISOString();
    const slotsRes = await axios.get(`${BASE}/doctors/${doctor._id || doctor.id}/slots?date=${encodeURIComponent(date)}`, { headers: HEADERS });
    const slots = slotsRes.data || [];
    if(!slots.length){
      console.error('No slots returned for today; trying without date...');
      const s2 = await axios.get(`${BASE}/doctors/${doctor._id || doctor.id}/slots`, { headers: HEADERS });
      console.log('Slots:', s2.data.slice(0,5));
      return;
    }
    console.log('Found slots count:', slots.length);
    const slot = slots[0];
    console.log('Reserving slot:', slot._id || slot.timeSlot, slot.date);

    const reserveRes = await axios.post(`${BASE}/doctors/${doctor._id || doctor.id}/slots/reserve`, { date: slot.date, timeSlot: slot.timeSlot }, { headers: HEADERS });
    console.log('Reserve response:', reserveRes.data);

    const after = await axios.get(`${BASE}/doctors/${doctor._id || doctor.id}/slots?date=${encodeURIComponent(slot.date)}`, { headers: HEADERS });
    console.log('Slots after reserve (first 5):', (after.data || []).slice(0,5));
  }catch(err){
    console.error('Error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
