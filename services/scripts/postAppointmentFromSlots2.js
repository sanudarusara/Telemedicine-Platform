const fs = require('fs');
const http = require('http');
function httpGet(path, headers={}){
  return new Promise((res, rej)=>{
    const options = { hostname: 'localhost', port: 6000, path, method: 'GET', headers };
    const req = http.request(options, r=>{ let data=''; r.on('data', c=>data+=c); r.on('end', ()=> res({status: r.statusCode, body: data})); });
    req.on('error', e=>rej(e)); req.end();
  });
}
function httpPost(path, body, headers={}){
  return new Promise((res, rej)=>{
    const b = JSON.stringify(body);
    const h = Object.assign({'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}, headers);
    const options = { hostname:'localhost', port:6000, path, method:'POST', headers: h };
    const req = http.request(options, r=>{ let data=''; r.on('data', c=>data+=c); r.on('end', ()=> res({status:r.statusCode, body:data})); });
    req.on('error', e=>rej(e)); req.write(b); req.end();
  });
}
(async ()=>{
  try {
    const loginRespPath = 'c:\\Users\\HP\\Telemedicine-Platform\\services\\tmp_login_resp.json';
    if(!fs.existsSync(loginRespPath)) { console.error('NO_LOGIN_RESP'); process.exit(2); }
    const login = JSON.parse(fs.readFileSync(loginRespPath,'utf8'));
    const token = login?.data?.token;
    if(!token) { console.error('NO_TOKEN_IN_LOGIN_RESP'); process.exit(3); }
    const doctorId = '69de9bf1a40e9823d6e67075';
    const patientId = '69dcb7636d0cf97c1844ba8a';
    const getRes = await httpGet(`/api/doctors/${doctorId}/available-slots`, { Authorization: 'Bearer ' + token });
    if(getRes.status !== 200){ console.error('SLOTS_FETCH_FAILED', getRes.status, getRes.body); process.exit(4); }
    const slotsJson = JSON.parse(getRes.body);
    const list = slotsJson.data || slotsJson || [];
    let arr = Array.isArray(list) ? list : (Array.isArray(list.slots) ? list.slots : Object.values(list));
    const slot = arr.find(s => s.available === true || s.isAvailable === true || s.status === 'available' || s.booked === false || (!s.booked && (s.timeSlot || s.slot || s.start)));
    if(!slot){ console.error('NO_AVAILABLE_SLOT'); console.log(JSON.stringify(arr,null,2)); process.exit(5); }
    const date = slot.date || slot.day || slot.slotDate || slot.start || slot["date"];
    const timeSlot = slot.timeSlot || slot.slot || slot.startTime || slot.time || (slot.start ? new Date(slot.start).toLocaleTimeString() : undefined);
    const appointment = { patientId, doctorId, date: date || '2026-04-25', timeSlot: timeSlot || '10:00 AM', consultationType: 'video', symptoms: 'Cardiac checkup', notes: 'Booked via script', paymentAmount: slot.fee || 1500 };
    console.log('Selected slot:', slot);
    const postRes = await httpPost('/api/appointments', appointment, { Authorization: 'Bearer ' + token });
    console.log('POST_STATUS', postRes.status, postRes.body);
    process.exit(postRes.status === 201 ? 0 : 6);
  } catch(err){ console.error('ERR', err.message || err); process.exit(7); }
})();
