// const mongoose = require('mongoose');
// const path = require('path');

// // Load environment variables from project root .env if present
// require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// const User = require('../models/User');
// const Patient = require('../models/Patient');
// const Report = require('../models/Report');

// async function main() {
//   const argvUri = process.argv.find(a => a.startsWith('--uri='));
//   const rawUri = argvUri ? argvUri.split('=')[1] : process.argv[2];
//   const mongoUri = process.env.MONGO_URI || rawUri;

//   if (!mongoUri) {
//     console.error('Missing MongoDB connection URI. Provide via MONGO_URI or pass as first arg or --uri=...');
//     process.exit(1);
//   }

//   await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
//   console.log('Connected to MongoDB');

//   try {
//     // -- USERS --
//     const usersToCreate = [
//       { name: 'Admin User', email: 'admin@example.com', password: 'AdminPass123', role: 'ADMIN' },
//       { name: 'Dr. John Smith', email: 'dr.smith@example.com', password: 'DoctorPass123', role: 'DOCTOR' },
//       { name: 'Jane Patient', email: 'jane.patient@example.com', password: 'PatientPass1', role: 'PATIENT' }
//     ];

//     const createdUsers = {};
//     for (const u of usersToCreate) {
//       let user = await User.findOne({ email: u.email });
//       if (user) {
//         console.log(`User exists: ${u.email}`);
//       } else {
//         user = await new User(u).save();
//         console.log(`Created user: ${u.email}`);
//       }
//       createdUsers[u.email] = user;
//     }

//     // -- PATIENTS --
//     // The Patient model requires a `userId` referencing a User document.
//     const patientsToCreate = [
//       {
//         userEmail: 'jane.patient@example.com',
//         dateOfBirth: new Date('1990-05-12'),
//         gender: 'FEMALE',
//         bloodGroup: 'O+',
//         phone: '+64123456789',
//         address: {
//           street: '12 Health St', city: 'Colombo', state: 'Western', zipCode: '10000', country: 'Sri Lanka'
//         },
//         emergencyContact: { name: 'John Patient', relationship: 'Brother', phone: '+94111222333' },
//         allergies: ['Penicillin'],
//         prescriptions: [
//           {
//             medication: 'Amoxicillin', dosage: '500mg', frequency: '3x/day', notes: 'Take after food',
//             prescribedByEmail: 'dr.smith@example.com'
//           }
//         ],
//         medicalHistory: [
//           { condition: 'Asthma', diagnosis: 'Childhood asthma', treatment: 'Inhaler PRN', doctorEmail: 'dr.smith@example.com' }
//         ]
//       }
//     ];

//     for (const p of patientsToCreate) {
//       const user = createdUsers[p.userEmail] || await User.findOne({ email: p.userEmail });
//       if (!user) {
//         console.warn(`Skipping patient creation; missing User for ${p.userEmail}`);
//         continue;
//       }

//       let patient = await Patient.findOne({ userId: user._id });
//       if (patient) {
//         console.log(`Patient profile exists for ${p.userEmail}`);
//         continue;
//       }

//       // Resolve prescribedBy / doctorId references
//       if (p.prescriptions && p.prescriptions.length) {
//         for (const pres of p.prescriptions) {
//           if (pres.prescribedByEmail) {
//             const doc = await User.findOne({ email: pres.prescribedByEmail });
//             if (doc) pres.prescribedBy = doc._id;
//             delete pres.prescribedByEmail;
//           }
//         }
//       }

//       if (p.medicalHistory && p.medicalHistory.length) {
//         for (const h of p.medicalHistory) {
//           if (h.doctorEmail) {
//             const doc = await User.findOne({ email: h.doctorEmail });
//             if (doc) h.doctorId = doc._id;
//             delete h.doctorEmail;
//           }
//         }
//       }

//       const patientDoc = new Patient({
//         userId: user._id,
//         dateOfBirth: p.dateOfBirth,
//         gender: p.gender,
//         bloodGroup: p.bloodGroup,
//         phone: p.phone,
//         address: p.address,
//         emergencyContact: p.emergencyContact,
//         allergies: p.allergies,
//         prescriptions: p.prescriptions,
//         medicalHistory: p.medicalHistory
//       });

//       await patientDoc.save();
//       console.log(`Created patient profile for ${p.userEmail}`);
//     }

//     // -- REPORTS --
//     const reportsToCreate = [
//       {
//         patientEmail: 'jane.patient@example.com',
//         uploadedByEmail: 'dr.smith@example.com',
//         title: 'CBC Result',
//         description: 'Complete blood count — within normal limits',
//         fileUrl: '/uploads/sample-cbc.pdf',
//         fileName: 'sample-cbc.pdf',
//         fileType: 'application/pdf',
//         fileSize: 102400,
//         reportType: 'LAB_RESULT'
//       },
//       {
//         patientEmail: 'jane.patient@example.com',
//         uploadedByEmail: 'jane.patient@example.com',
//         title: 'Prescription Image',
//         description: 'Photo of latest prescription',
//         fileUrl: '/uploads/prescription1.jpg',
//         fileName: 'prescription1.jpg',
//         fileType: 'image/jpeg',
//         fileSize: 204800,
//         reportType: 'PRESCRIPTION'
//       }
//     ];

//     for (const r of reportsToCreate) {
//       const uploader = createdUsers[r.uploadedByEmail] || await User.findOne({ email: r.uploadedByEmail });
//       const patientUser = createdUsers[r.patientEmail] || await User.findOne({ email: r.patientEmail });
//       if (!uploader) {
//         console.warn(`Skipping report; missing uploader ${r.uploadedByEmail}`);
//         continue;
//       }
//       if (!patientUser) {
//         console.warn(`Skipping report; missing patient user ${r.patientEmail}`);
//         continue;
//       }
//       const patient = await Patient.findOne({ userId: patientUser._id });
//       if (!patient) {
//         console.warn(`Skipping report; missing patient profile for ${r.patientEmail}`);
//         continue;
//       }

//       const exists = await Report.findOne({ patientId: patient._id, title: r.title, uploadedBy: uploader._id });
//       if (exists) {
//         console.log(`Report exists: ${r.title} for ${r.patientEmail}`);
//         continue;
//       }

//       const reportDoc = new Report({
//         patientId: patient._id,
//         uploadedBy: uploader._id,
//         title: r.title,
//         description: r.description,
//         fileUrl: r.fileUrl,
//         fileName: r.fileName,
//         fileType: r.fileType,
//         fileSize: r.fileSize,
//         reportType: r.reportType
//       });

//       await reportDoc.save();
//       console.log(`Created report: ${r.title} for ${r.patientEmail}`);
//     }

//     console.log('Seeding complete.');
//   } catch (err) {
//     console.error('Seeding error:', err);
//   } finally {
//     await mongoose.disconnect();
//     process.exit(0);
//   }
// }

// main();
