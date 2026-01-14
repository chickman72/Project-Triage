import { NextResponse } from "next/server";
import { getCosmosClient } from "../../../../lib/cosmosClient";
import { openAIClient } from "../../../../lib/openAIClient";
import { randomUUID } from "crypto";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type IntakeRequest = {
  chatHistory?: ChatMessage[];
};

type VitalsExtraction = {
  blood_pressure?: string | null;
  heart_rate?: number | string | null;
  temperature?: number | string | null;
  oxygen_saturation?: number | string | null;
};

type IntakeExtraction = {
  patient_full_name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  known_allergies?: string[] | null;
  chief_complaint?: string | null;
  history_of_present_illness?: string | null;
  reported_symptoms?: string[] | null;
  vitals?: VitalsExtraction | null;
  current_medications?: string[] | null;
};

const databaseId = process.env.COSMOS_DATABASE ?? "triage_db";
const containerId = process.env.COSMOS_CONTAINER ?? "patients";

const normalizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "not reported") return null;
  return trimmed;
};

const normalizeList = (value?: string[] | null) => {
  if (!Array.isArray(value)) return null;
  const cleaned = value.map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : null;
};

const normalizeAge = (value?: number | null) => {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.floor(value);
};

const parseDob = (value?: string | null) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
  if (isoMatch) {
    const isoDate = new Date(`${normalized}T00:00:00Z`);
    if (!Number.isNaN(isoDate.getTime())) {
      return normalized;
    }
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateAge = (dobIso: string, now = new Date()) => {
  const birthDate = new Date(`${dobIso}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = now.getUTCDate() - birthDate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const calculateApproxDob = (age: number, now = new Date()) => {
  if (!Number.isFinite(age) || age <= 0) return null;
  const year = now.getUTCFullYear() - Math.floor(age);
  return `${year}-01-01`;
};

const normalizeVitals = (vitals?: VitalsExtraction | null) => {
  if (!vitals) return null;
  const bloodPressure = normalizeText(vitals.blood_pressure);
  const parseNumber = (value?: number | string | null) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const heartRate = parseNumber(vitals.heart_rate);
  const temperature = parseNumber(vitals.temperature);
  const oxygenSaturation = parseNumber(vitals.oxygen_saturation);

  const normalized: Record<string, unknown> = {};
  if (bloodPressure) normalized.blood_pressure = bloodPressure;
  if (heartRate !== null) normalized.heart_rate = heartRate;
  if (temperature !== null) normalized.temperature = temperature;
  if (oxygenSaturation !== null) {
    normalized.oxygen_saturation = oxygenSaturation;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IntakeRequest;
    const chatHistory = body.chatHistory ?? [];

    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
      return NextResponse.json(
        { error: "chatHistory is required." },
        { status: 400 }
      );
    }

    const transcript = chatHistory
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const currentDate = new Date().toISOString();
    const intakeSystemPrompt =
      `You are a clinical data extractor. Today's date is ${currentDate}. ` +
      "Extract and return a JSON object with these keys: " +
      "'patient_full_name' (string), 'date_of_birth' (string YYYY-MM-DD), " +
      "'age' (integer), 'gender' (string), 'known_allergies' (list of strings), " +
      "'chief_complaint' (string), 'history_of_present_illness' (string summary), " +
      "'reported_symptoms' (list of strings), " +
      "'vitals' (object with blood_pressure string, heart_rate number or string, temperature number or string, oxygen_saturation number or string), " +
      "and 'current_medications' (list of strings). " +
      "Logic Rule 1: If the user states their Age but not their Date of Birth, " +
      "calculate an approximate Date of Birth (Year = Current Year - Age, Month/Day = 01/01) " +
      "and populate the 'date_of_birth' field. " +
      "Logic Rule 2: If the user states their Date of Birth but not their Age, " +
      "calculate their Age based on today's date and populate the 'age' field. " +
      "If date_of_birth, age, gender, or known_allergies are not explicitly stated or inferred by the rules, set them to null. " +
      "Use professional medical phrasing for the HPI and do not infer missing facts.";

    const completion = await openAIClient.chat.completions.create({
      model: process.env.LITELLM_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: intakeSystemPrompt },
        { role: "user", content: transcript }
      ],
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";
    let extractionResult: IntakeExtraction = {};

    try {
      extractionResult = JSON.parse(rawContent) as IntakeExtraction;
    } catch (parseError) {
      return NextResponse.json(
        { error: "Failed to parse intake JSON." },
        { status: 502 }
      );
    }

    const extractedName = normalizeText(extractionResult.patient_full_name);
    const extractedDob = parseDob(extractionResult.date_of_birth);
    const extractedAge = normalizeAge(extractionResult.age);
    const extractedGender = normalizeText(extractionResult.gender);
    const extractedAllergies = normalizeList(
      extractionResult.known_allergies
    );
    const extractedChiefComplaint = normalizeText(
      extractionResult.chief_complaint
    );
    const extractedHpi = normalizeText(
      extractionResult.history_of_present_illness
    );
    const extractedSymptoms = normalizeList(
      extractionResult.reported_symptoms
    );
    const extractedVitals = normalizeVitals(extractionResult.vitals);
    const extractedMedications = normalizeList(
      extractionResult.current_medications
    );

    if (!extractedName) {
      return NextResponse.json(
        { error: "patient_full_name is required." },
        { status: 400 }
      );
    }

    const container = getCosmosClient().database(databaseId).container(containerId);
    const query = {
      query: "SELECT * FROM c WHERE StringEquals(c.full_name, @name, true)",
      parameters: [{ name: "@name", value: extractedName }]
    };
    const { resources } = await container.items.query(query).fetchAll();

    const foundPatient = resources[0];
    const now = new Date();
    let updatedPatient: Record<string, unknown>;

    if (foundPatient) {
      updatedPatient = { ...foundPatient };
      if (extractedChiefComplaint) {
        updatedPatient.chief_complaint = extractedChiefComplaint;
      }
      if (extractedHpi) {
        updatedPatient.history_of_present_illness = extractedHpi;
      }
      if (extractedSymptoms) {
        updatedPatient.reported_symptoms = extractedSymptoms;
      }
      if (extractedGender) {
        updatedPatient.gender = extractedGender;
      }
      if (extractedAllergies) {
        updatedPatient.allergies = extractedAllergies;
      }
      if (extractedVitals) {
        const existingVitals =
          typeof foundPatient.vitals === "object" && foundPatient.vitals
            ? foundPatient.vitals
            : {};
        updatedPatient.vitals = { ...existingVitals, ...extractedVitals };
      }
      if (extractedMedications) {
        updatedPatient.medications = extractedMedications;
      }

      const existingDob = parseDob(
        typeof foundPatient.dob === "string" ? foundPatient.dob : null
      );
      const existingAge =
        typeof foundPatient.age === "number" ? foundPatient.age : null;
      let dobToUse = extractedDob ?? existingDob ?? null;
      let ageToUse = extractedAge ?? existingAge ?? null;

      if (dobToUse) {
        const calculatedAge = calculateAge(dobToUse, now);
        if (calculatedAge !== null) {
          ageToUse = calculatedAge;
        }
      } else if (ageToUse !== null) {
        const approxDob = calculateApproxDob(ageToUse, now);
        if (approxDob) {
          dobToUse = approxDob;
        }
      }

      if (dobToUse) {
        updatedPatient.dob = dobToUse;
      }
      if (ageToUse !== null) {
        updatedPatient.age = ageToUse;
      }
      updatedPatient.last_intake_date = new Date().toISOString();
    } else {
      let dobToUse = extractedDob ?? null;
      let ageToUse = extractedAge ?? null;

      if (dobToUse) {
        const calculatedAge = calculateAge(dobToUse, now);
        if (calculatedAge !== null) {
          ageToUse = calculatedAge;
        }
      } else if (ageToUse !== null) {
        const approxDob = calculateApproxDob(ageToUse, now);
        if (approxDob) {
          dobToUse = approxDob;
        }
      }

      updatedPatient = {
        id: randomUUID(),
        full_name: extractedName,
        dob: dobToUse,
        age: ageToUse,
        gender: extractedGender,
        allergies: extractedAllergies,
        chief_complaint: extractedChiefComplaint ?? "Not reported",
        history_of_present_illness: extractedHpi ?? "Not reported",
        reported_symptoms: extractedSymptoms ?? [],
        vitals: extractedVitals ?? undefined,
        medications: extractedMedications ?? undefined,
        last_intake_date: new Date().toISOString()
      };
    }

    try {
      await container.items.upsert(updatedPatient);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to write patient record." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, patient: updatedPatient });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit intake." },
      { status: 500 }
    );
  }
}
