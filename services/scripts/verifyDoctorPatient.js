const fs = require('fs');
const http = require('http');
function httpReq(method, path, headers={}, body=null){
  return new Promise((res, rej)=>{
    const options = { hostname:'localhost', port:6000, path, method, headers };
    const req = http.request(options, r=>{ let d=''; r.on('data', c=>d+=c); r.on('end', ()=> res({ status: r.statusCode, body: d })); });
    req.on('error', e=>rej(e));
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}
(async ()=>{
  try{
    const loginPath = 'c:\\Users\\HP\\Telemedicine-Platform\\services\\tmp_login_resp.json';
    if(!fs.existsSync(loginPath)) { console.error('No login response saved at', loginPath); process.exit(2); }
    const login = JSON.parse(fs.readFileSync(loginPath,'utf8'));
    const token = login?.data?.token;
    if(!token){ console.error('No token in login response'); process.exit(3); }

    const doctorId = process.argv[2] || '69de9bf1a40e9823d6e67075';
    const patientId = process.argv[3] || '69dcb7636d0cf97c1844ba8a';

    console.log('Using token (first 10 chars):', token.slice(0,10));

    const dRes = await httpReq('GET', `/api/doctors/${doctorId}`, { Authorization: 'Bearer ' + token });
    console.log('\nDoctor response status:', dRes.status);
    try{ console.log('Doctor body:', JSON.stringify(JSON.parse(dRes.body), null, 2)); } catch(e){ console.log('Doctor body (raw):', dRes.body); }

    const pRes = await httpReq('GET', `/api/patients/profile`, { Authorization: 'Bearer ' + token });
    console.log('\nPatient profile status:', pRes.status);
    try{ console.log('Patient body:', JSON.stringify(JSON.parse(pRes.body), null, 2)); } catch(e){ console.log('Patient body (raw):', pRes.body); }

    process.exit(0);
  } catch(err){ console.error('ERR', err.message || err); process.exit(1); }
})();
