import { NextResponse } from "next/server";
import { cosmosClient } from "../../../../lib/cosmosClient";
import { openAIClient } from "../../../../lib/openAIClient";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ProviderChatRequest = {
  patientId?: string;
  messages?: ChatMessage[];
};

const databaseId = process.env.COSMOS_DATABASE ?? "triage_db";
const containerId = process.env.COSMOS_CONTAINER ?? "patients";

const providerSystemPrompt =
  "You are a clinical copilot. Use the active patient record to answer questions " +
  "and provide concise, factual guidance. You have permission to update demographics " +
  "(DOB, gender, allergies) and vitals only when the provider explicitly states new facts. " +
  "If demographic fields are missing, ask for them.";

const toolDefinition = [
  {
    type: "function" as const,
    function: {
      name: "update_patient_data",
      description:
        "Update the active patient's demographic fields and vitals when the provider explicitly provides them.",
      parameters: {
        type: "object",
        properties: {
          date_of_birth: { type: "string" },
          gender: { type: "string" },
          allergies: { type: "array", items: { type: "string" } },
          vital_blood_pressure: { type: "string" },
          vital_heart_rate: { type: "number" },
          vital_temperature: { type: "number" },
          vital_oxygen_saturation: { type: "number" }
        },
        additionalProperties: false
      }
    }
  }
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProviderChatRequest;
    const patientId = body.patientId;
    const messages = body.messages ?? [];

    if (!patientId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "patientId and messages are required." },
        { status: 400 }
      );
    }

    const container = cosmosClient.database(databaseId).container(containerId);
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id OR c.patientId = @id",
      parameters: [{ name: "@id", value: patientId }]
    };
    const { resources } = await container.items.query(query, {
      enableCrossPartitionQuery: true
    }).fetchAll();
    const patient = resources[0];

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found." },
        { status: 404 }
      );
    }

    const allergies =
      Array.isArray(patient.allergies) && patient.allergies.length > 0
        ? patient.allergies
        : null;
    const missingFields = [
      !patient.dob ? "DOB" : null,
      !patient.gender ? "Gender" : null,
      !allergies ? "Allergies" : null
    ].filter(Boolean);

    const contextMessages: ChatMessage[] = [
      { role: "system", content: providerSystemPrompt },
      {
        role: "system",
        content: `Active patient record:\n${JSON.stringify(patient, null, 2)}`
      }
    ];

    if (missingFields.length > 0) {
      contextMessages.push({
        role: "system",
        content: `Missing demographics: ${missingFields.join(", ")}.`
      });
    }

    const completion = await openAIClient.chat.completions.create({
      model: process.env.LITELLM_MODEL ?? "gpt-4o-mini",
      messages: [...contextMessages, ...messages],
      tools: toolDefinition,
      tool_choice: "auto"
    });

    const choice = completion.choices[0];
    const toolCall = choice?.message?.tool_calls?.[0];

    if (toolCall?.function?.name === "update_patient_data") {
      let args: {
        date_of_birth?: string;
        gender?: string;
        allergies?: string[];
        vital_blood_pressure?: string;
        vital_heart_rate?: number;
        vital_temperature?: number;
        vital_oxygen_saturation?: number;
      } = {};
      try {
        args = JSON.parse(toolCall.function.arguments ?? "{}");
      } catch (parseError) {
        return NextResponse.json(
          { error: "Failed to parse tool arguments." },
          { status: 400 }
        );
      }

      const updates: Record<string, unknown> = {};
      if (args.date_of_birth && args.date_of_birth.trim()) {
        updates.dob = args.date_of_birth.trim();
      }
      if (args.gender && args.gender.trim()) {
        updates.gender = args.gender.trim();
      }
      if (Array.isArray(args.allergies) && args.allergies.length > 0) {
        updates.allergies = args.allergies.map((item) => item.trim()).filter(Boolean);
      }
      const vitalsUpdates: Record<string, unknown> = {};
      if (args.vital_blood_pressure && args.vital_blood_pressure.trim()) {
        vitalsUpdates.blood_pressure = args.vital_blood_pressure.trim();
      }
      if (
        typeof args.vital_heart_rate === "number" &&
        Number.isFinite(args.vital_heart_rate)
      ) {
        vitalsUpdates.heart_rate = args.vital_heart_rate;
      }
      if (
        typeof args.vital_temperature === "number" &&
        Number.isFinite(args.vital_temperature)
      ) {
        vitalsUpdates.temperature = args.vital_temperature;
      }
      if (
        typeof args.vital_oxygen_saturation === "number" &&
        Number.isFinite(args.vital_oxygen_saturation)
      ) {
        vitalsUpdates.oxygen_saturation = args.vital_oxygen_saturation;
      }

      if (Object.keys(updates).length === 0 && Object.keys(vitalsUpdates).length === 0) {
        return NextResponse.json({
          message: "No demographic updates detected."
        });
      }

      let mergedVitals: Record<string, unknown> | null = null;
      if (Object.keys(vitalsUpdates).length > 0) {
        const existingVitals =
          typeof patient.vitals === "object" && patient.vitals ? patient.vitals : {};
        mergedVitals = { ...existingVitals, ...vitalsUpdates };
        updates.vitals = mergedVitals;
      }

      const updatedPatient = {
        ...patient,
        ...updates,
        last_updated: new Date().toISOString()
      };

      await container.items.upsert(updatedPatient);

      const confirmation = [
        updates.dob ? `DOB set to ${updates.dob}` : null,
        updates.gender ? `gender set to ${updates.gender}` : null,
        updates.allergies
          ? `allergies set to ${(updates.allergies as string[]).join(", ")}`
          : null,
        mergedVitals?.blood_pressure
          ? `BP set to ${mergedVitals.blood_pressure}`
          : null,
        mergedVitals?.heart_rate
          ? `HR set to ${mergedVitals.heart_rate}`
          : null,
        mergedVitals?.temperature
          ? `Temp set to ${mergedVitals.temperature}`
          : null,
        mergedVitals?.oxygen_saturation
          ? `SpO2 set to ${mergedVitals.oxygen_saturation}`
          : null
      ]
        .filter(Boolean)
        .join("; ");

      return NextResponse.json({
        message: `Record updated: ${confirmation}.`,
        patient: updatedPatient
      });
    }

    const message =
      choice?.message?.content ?? "I could not generate a response.";
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process provider chat." },
      { status: 500 }
    );
  }
}
