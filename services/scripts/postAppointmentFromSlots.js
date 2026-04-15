const fs = require('fs');
const fetch = global.fetch || require('node-fetch');
(async () => {
  try {
    const doctorId = '69de9bf1a40e9823d6e67075';
    const patientId = '69dcb7636d0cf97c1844ba8a';
    const slotsRes = await fetch(`http://localhost:6000/api/doctors/${doctorId}/available-slots`);
    const slotsJson = await slotsRes.json();
    const list = slotsJson.data || slotsJson || [];
    let arr = Array.isArray(list) ? list : (Array.isArray(list.slots) ? list.slots : Object.values(list));
    const slot = arr.find(s => s.available === true || s.isAvailable === true || s.status === 'available' || s.booked === false || (!s.booked && (s.timeSlot || s.slot || s.start)));
    if (!slot) {
      console.error('NO_AVAILABLE_SLOT');
      console.log('Slots returned:', JSON.stringify(arr, null, 2));
      process.exit(2);
    }
    const date = slot.date || slot.day || slot.slotDate || slot.start || slot["date"];
    const timeSlot = slot.timeSlot || slot.slot || slot.startTime || slot.time || (slot.start ? new Date(slot.start).toLocaleTimeString() : undefined);

    const loginResp = JSON.parse(fs.readFileSync('c:\\Users\\HP\\Telemedicine-Platform\\services\\tmp_login_resp.json','utf8'));
    const token = (loginResp && loginResp.data && loginResp.data.token) ? loginResp.data.token : null;
    if (!token) { console.error('NO_TOKEN'); process.exit(3); }

    const appointment = {
      patientId,
      doctorId,
      date: date || '2026-04-25',
      timeSlot: timeSlot || '10:00 AM',
      consultationType: 'video',
      symptoms: 'Cardiac checkup',
      notes: 'Booked via script',
      paymentAmount: slot.fee || 1500
    };

    console.log('Selected slot:', JSON.stringify(slot, null, 2));
    console.log('Posting appointment:', JSON.stringify(appointment, null, 2));

    const resp = await fetch('http://localhost:6000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(appointment)
    });
    const out = await resp.text();
    console.log('HTTP', resp.status, out);
    process.exit(resp.ok ? 0 : 4);
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(5);
  }
})();
