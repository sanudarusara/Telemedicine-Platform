/**
 * Seed: ai-symptom-service  (DB: ai-symptom-service)
 *
 * Creates sample SymptomCheck records (simulated AI triage results).
 *
 * Run inside container:
 *   docker exec healthcare-ai-symptom-service node /seeds/09-ai-symptom-service.seed.js
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/ai-symptom-service';
const AUTH_DB   = process.env.AUTH_MONGO_URI || 'mongodb://mongodb:27017/auth-management';

// ── Inline schema ─────────────────────────────────────────────────────────────
const SymptomCheckSchema = new mongoose.Schema(
  {
    userId:                { type: String, required: true },
    symptoms:              { type: [String], required: true },
    age:                   Number,
    gender:                String,
    duration:              String,
    additionalNotes:       String,
    aiResponse:            String,
    suggestedCondition:    String,
    severity:              { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    possibleCauses:        [String],
    recommendations:       [String],
    recommendedDoctorType: { type: String, default: 'General Physician' },
  },
  { timestamps: true }
);

// ── Seed entries ──────────────────────────────────────────────────────────────
const SYMPTOM_CHECKS = [
  {
    symptoms: ['headache', 'fever', 'fatigue'],
    age: 32, gender: 'FEMALE', duration: '2 days',
    additionalNotes: 'Mild sore throat as well.',
    aiResponse: 'Based on your symptoms, this may be a viral upper respiratory infection.',
    suggestedCondition: 'Viral URI / Common Cold',
    severity: 'LOW',
    possibleCauses: ['Rhinovirus', 'Influenza A', 'Adenovirus'],
    recommendations: ['Rest and hydration', 'Paracetamol for fever', 'Consult a doctor if symptoms worsen'],
    recommendedDoctorType: 'General Physician',
  },
  {
    symptoms: ['chest pain', 'shortness of breath', 'sweating'],
    age: 55, gender: 'MALE', duration: '30 minutes',
    additionalNotes: 'Pain radiates to left arm.',
    aiResponse: 'These symptoms may indicate a serious cardiac event. Seek emergency care immediately.',
    suggestedCondition: 'Possible Myocardial Infarction',
    severity: 'HIGH',
    possibleCauses: ['Coronary artery disease', 'Angina', 'Aortic dissection'],
    recommendations: ['Call emergency services immediately', 'Chew aspirin if not allergic', 'Do not drive yourself'],
    recommendedDoctorType: 'Cardiologist',
  },
  {
    symptoms: ['skin rash', 'itching', 'redness'],
    age: 28, gender: 'FEMALE', duration: '3 days',
    additionalNotes: 'Recently changed soap brand.',
    aiResponse: 'Symptoms are consistent with contact dermatitis or allergic reaction.',
    suggestedCondition: 'Contact Dermatitis',
    severity: 'LOW',
    possibleCauses: ['Allergen exposure', 'New skincare product', 'Nickel allergy'],
    recommendations: ['Avoid identified trigger', 'Apply hydrocortisone cream', 'Take antihistamine'],
    recommendedDoctorType: 'Dermatologist',
  },
  {
    symptoms: ['cough', 'wheezing', 'difficulty breathing'],
    age: 22, gender: 'MALE', duration: '1 week',
    additionalNotes: 'Worse in the morning and after exercise.',
    aiResponse: 'Symptoms suggest asthma exacerbation. Monitoring and medication adjustment recommended.',
    suggestedCondition: 'Asthma Exacerbation',
    severity: 'MEDIUM',
    possibleCauses: ['Allergen exposure', 'Exercise-induced asthma', 'Viral infection'],
    recommendations: ['Use rescue inhaler', 'Avoid known triggers', 'See a pulmonologist'],
    recommendedDoctorType: 'Pulmonologist',
  },
  {
    symptoms: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea'],
    age: 40, gender: 'FEMALE', duration: '24 hours',
    additionalNotes: 'Ate at a restaurant yesterday.',
    aiResponse: 'Symptoms are consistent with acute gastroenteritis, possibly foodborne.',
    suggestedCondition: 'Acute Gastroenteritis / Food Poisoning',
    severity: 'MEDIUM',
    possibleCauses: ['Salmonella', 'E. coli', 'Norovirus'],
    recommendations: ['Oral rehydration therapy', 'BRAT diet', 'Seek care if symptoms persist > 48 hours'],
    recommendedDoctorType: 'General Physician',
  },
];

// ── Entry point ───────────────────────────────────────────────────────────────
async function seed() {
  const aiConn   = await mongoose.createConnection(MONGO_URI).asPromise();
  const authConn = await mongoose.createConnection(AUTH_DB).asPromise();
  console.log('[ai-symptom-service] Connected to', MONGO_URI);

  const SymptomCheck = aiConn.model('SymptomCheck', SymptomCheckSchema);
  const usersColl    = authConn.db.collection('users');
  const patients     = await usersColl.find({ role: 'PATIENT' }).toArray();

  if (!patients.length) {
    console.log('[ai-symptom-service] No patients found. Run 01-auth-service.seed.js first.');
    await aiConn.close(); await authConn.close();
    return;
  }

  let created = 0;
  for (let i = 0; i < SYMPTOM_CHECKS.length; i++) {
    const patient = patients[i % patients.length];
    const check   = SYMPTOM_CHECKS[i];

    // Check for existing by userId + first symptom to avoid exact duplicates
    const exists = await SymptomCheck.findOne({
      userId:   patient._id.toString(),
      symptoms: { $all: [check.symptoms[0]] },
      suggestedCondition: check.suggestedCondition,
    });

    if (!exists) {
      await SymptomCheck.create({ userId: patient._id.toString(), ...check });
      console.log(`  added check: ${check.suggestedCondition} for ${patient.email}`);
      created++;
    } else {
      console.log(`  skip  check: ${check.suggestedCondition}`);
    }
  }

  console.log(`[ai-symptom-service] Done — ${created} symptom check(s) inserted.\n`);
  await aiConn.close();
  await authConn.close();
}

seed().catch((err) => {
  console.error('[ai-symptom-service] Seed error:', err.message);
  process.exit(1);
});
