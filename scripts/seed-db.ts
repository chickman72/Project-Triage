import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const { cosmosClient } = await import("../lib/cosmosClient");

const databaseId = process.env.COSMOS_DATABASE ?? "triage_db";
const containerId = process.env.COSMOS_CONTAINER ?? "patients";
const partitionKey = process.env.COSMOS_PARTITION_KEY ?? "/patientId";

const patients = [
  {
    id: "patient-001",
    patientId: "patient-001",
    name: "Elena Ramirez",
    age: 42,
    gender: "Female",
    chiefComplaint: "Intermittent chest tightness and shortness of breath.",
    history: ["Hypertension", "Seasonal asthma"],
    medications: ["Lisinopril 10mg daily", "Albuterol inhaler PRN"],
    vitals: { bp: "148/92", hr: 96, temp: 98.6, spo2: 95 },
    labs: [
      { name: "Troponin I", value: "0.02 ng/mL", date: "2024-07-01" },
      { name: "BNP", value: "110 pg/mL", date: "2024-07-01" }
    ],
    notes:
      "Reports chest tightness during exertion. No radiating pain. Mild wheeze on exam."
  },
  {
    id: "patient-002",
    patientId: "patient-002",
    name: "Marcus Lee",
    age: 58,
    gender: "Male",
    chiefComplaint: "Dizziness and blurred vision for 2 days.",
    history: ["Type 2 diabetes", "Hyperlipidemia"],
    medications: ["Metformin 1000mg BID", "Atorvastatin 20mg nightly"],
    vitals: { bp: "132/86", hr: 78, temp: 97.9, spo2: 98 },
    labs: [
      { name: "A1C", value: "8.4%", date: "2024-06-18" },
      { name: "Glucose", value: "242 mg/dL", date: "2024-07-03" }
    ],
    notes:
      "Reports missed insulin doses while traveling. Vision improves when hydrated."
  },
  {
    id: "patient-003",
    patientId: "patient-003",
    name: "Renee Patel",
    age: 29,
    gender: "Female",
    chiefComplaint: "Persistent abdominal pain with nausea.",
    history: ["IBS", "Anxiety"],
    medications: ["Sertraline 50mg daily"],
    vitals: { bp: "118/74", hr: 88, temp: 99.1, spo2: 99 },
    labs: [
      { name: "WBC", value: "11.2 K/uL", date: "2024-07-02" },
      { name: "CRP", value: "18 mg/L", date: "2024-07-02" }
    ],
    notes:
      "Pain localized to lower right quadrant. Nausea increased after meals."
  }
];

async function seed() {
  const { database } = await cosmosClient.databases.createIfNotExists({
    id: databaseId
  });
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKey] }
  });
  for (const patient of patients) {
    await container.items.upsert(patient);
  }
  console.log(`Seeded ${patients.length} patient records.`);
}

seed().catch((error) => {
  console.error("Failed to seed database:", error);
  process.exit(1);
});
