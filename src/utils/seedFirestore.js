import { writeBatch, doc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

// Fixed IDs so jobs can reference technicians and sites reliably
const TECH_IDS = ["tech-t001", "tech-t002", "tech-t003", "tech-t004", "tech-t005"];
const SITE_IDS = ["site-s001", "site-s002", "site-s003", "site-s004"];

const TECHNICIANS = [
  { id: TECH_IDS[0], displayName: "Tomas Petrauskas",  email: "tomas@solarradar.lt",  role: "technician", active: true,  hiredAt: "2022-03-15", level: 2 },
  { id: TECH_IDS[1], displayName: "Mantas Kazlauskas", email: "mantas@solarradar.lt", role: "technician", active: true,  hiredAt: "2020-06-01", level: 4 },
  { id: TECH_IDS[2], displayName: "Agnė Jankauskaitė", email: "agne@solarradar.lt",  role: "technician", active: true,  hiredAt: "2018-02-15", level: 5 },
  { id: TECH_IDS[3], displayName: "Jonas Jonaitis",    email: "jonas@solarradar.lt",  role: "technician", active: false, hiredAt: "2023-09-20", level: 1 },
  { id: TECH_IDS[4], displayName: "Rūta Daukšienė",   email: "ruta@solarradar.lt",   role: "technician", active: true,  hiredAt: "2021-11-05", level: 3 },
];

const SITES = [
  { id: SITE_IDS[0], name: "Kaunas PV Plant",  address: "Jonavos g. 5, Kaunas",       region: "Kaunas",    status: "active",   capacityKw: 120.0, location: { lat: 54.8985, lng: 23.9036 } },
  { id: SITE_IDS[1], name: "Vilnius Rooftop",  address: "Verkių g. 25, Vilnius",       region: "Vilnius",   status: "active",   capacityKw: 30.0,  location: { lat: 54.6872, lng: 25.2797 } },
  { id: SITE_IDS[2], name: "Klaipėda Site",    address: "Taikos pr. 88, Klaipėda",     region: "Klaipėda",  status: "inactive", capacityKw: 75.0,  location: { lat: 55.7033, lng: 21.1443 } },
  { id: SITE_IDS[3], name: "Šiauliai Farm",    address: "Tilžės g. 14, Šiauliai",      region: "Šiauliai",  status: "active",   capacityKw: 250.0, location: { lat: 55.9349, lng: 23.3137 } },
];

// Helper — convert ISO date string to Firestore Timestamp
const ts = (str) => Timestamp.fromDate(new Date(str));

const JOBS = [
  {
    id: "job-j001",
    title: "Inverter offline",
    siteId: SITE_IDS[0], siteName: "Kaunas PV Plant",
    type: "inverter_fault", priority: "high", requiredLevel: 3,
    status: "open", assignedTo: null, assignedName: null,
    description: "Inverter #3 stopped responding since morning.",
    createdAt: ts("2026-02-20"), updatedAt: ts("2026-02-20"),
  },
  {
    id: "job-j002",
    title: "Communication loss",
    siteId: SITE_IDS[1], siteName: "Vilnius Rooftop",
    type: "communication", priority: "medium", requiredLevel: 2,
    status: "in_progress", assignedTo: TECH_IDS[1], assignedName: "Mantas Kazlauskas",
    description: "Logger not sending data for 2 days.",
    createdAt: ts("2026-02-18"), updatedAt: ts("2026-02-22"),
  },
  {
    id: "job-j003",
    title: "Inspection: loose cable",
    siteId: SITE_IDS[2], siteName: "Klaipėda Site",
    type: "inspection", priority: "low", requiredLevel: 1,
    status: "resolved", assignedTo: TECH_IDS[0], assignedName: "Tomas Petrauskas",
    description: "Routine inspection found loose DC cable on string 4.",
    createdAt: ts("2026-02-10"), updatedAt: ts("2026-02-15"), resolvedAt: ts("2026-02-15"),
  },
  {
    id: "job-j004",
    title: "String underperformance",
    siteId: SITE_IDS[0], siteName: "Kaunas PV Plant",
    type: "string_issue", priority: "high", requiredLevel: 5,
    status: "open", assignedTo: null, assignedName: null,
    description: "String 7 producing 40% below expected output.",
    createdAt: ts("2026-02-21"), updatedAt: ts("2026-02-21"),
  },
  {
    id: "job-j005",
    title: "Panel cleaning required",
    siteId: SITE_IDS[3], siteName: "Šiauliai Farm",
    type: "inspection", priority: "low", requiredLevel: 1,
    status: "open", assignedTo: null, assignedName: null,
    description: "Heavy dust accumulation observed on south-facing panels.",
    createdAt: ts("2026-02-23"), updatedAt: ts("2026-02-23"),
  },
  {
    id: "job-j006",
    title: "Protection relay fault",
    siteId: SITE_IDS[0], siteName: "Kaunas PV Plant",
    type: "inverter_fault", priority: "high", requiredLevel: 4,
    status: "in_progress", assignedTo: TECH_IDS[1], assignedName: "Mantas Kazlauskas",
    description: "Protection relay tripped twice in 24h. Needs investigation.",
    createdAt: ts("2026-02-19"), updatedAt: ts("2026-02-24"),
  },
  {
    id: "job-j007",
    title: "Monitoring system update",
    siteId: SITE_IDS[1], siteName: "Vilnius Rooftop",
    type: "communication", priority: "medium", requiredLevel: 3,
    status: "resolved", assignedTo: TECH_IDS[2], assignedName: "Agnė Jankauskaitė",
    description: "Firmware update applied to monitoring gateway.",
    createdAt: ts("2026-02-12"), updatedAt: ts("2026-02-14"), resolvedAt: ts("2026-02-14"),
  },
  {
    id: "job-j008",
    title: "Annual maintenance check",
    siteId: SITE_IDS[3], siteName: "Šiauliai Farm",
    type: "inspection", priority: "medium", requiredLevel: 2,
    status: "open", assignedTo: null, assignedName: null,
    description: "Scheduled annual maintenance and performance review.",
    createdAt: ts("2026-02-25"), updatedAt: ts("2026-02-25"),
  },
];

/**
 * Writes all demo data to Firestore in a single batch.
 * Safe to re-run — uses setDoc which overwrites existing documents.
 * @param {string} adminUid  Firebase Auth UID of the currently logged-in admin
 */
export async function seedDemoData(adminUid) {
  const batch = writeBatch(db);

  // Admin user document (merge so existing fields aren't wiped)
  batch.set(doc(db, "users", adminUid), { role: "admin", displayName: "Admin", active: true }, { merge: true });

  // Technicians
  for (const { id, ...data } of TECHNICIANS) {
    batch.set(doc(db, "users", id), data);
  }

  // Sites
  for (const { id, ...data } of SITES) {
    batch.set(doc(db, "sites", id), data);
  }

  // Jobs
  for (const { id, ...data } of JOBS) {
    batch.set(doc(db, "jobs", id), data);
  }

  await batch.commit();

  return { techs: TECHNICIANS.length, sites: SITES.length, jobs: JOBS.length };
}
