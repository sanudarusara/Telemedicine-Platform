const external = require('../src/services/externalServices');

const doctorId = process.argv[2];
const date = process.argv[3];

if (!doctorId || !date) {
  console.error('Usage: node runExternalGetSlots.js <doctorId> <YYYY-MM-DD>');
  process.exit(1);
}

(async () => {
  try {
    const slots = await external.getAvailableSlots(doctorId, date);
    console.log('External getAvailableSlots result:', slots);
  } catch (err) {
    console.error('Error calling external.getAvailableSlots:', err.message);
    process.exit(1);
  }
})();
