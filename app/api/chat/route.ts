import { NextResponse } from "next/server";
import { cosmosClient } from "../../../lib/cosmosClient";
import { openAIClient } from "../../../lib/openAIClient";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  mode?: "patient" | "provider";
  messages?: ChatMessage[];
  patientContext?: string | null;
  patientId?: string | null;
};

const databaseId = process.env.COSMOS_DATABASE ?? "triage_db";
const containerId = process.env.COSMOS_CONTAINER ?? "patients";

const intakeSystemPrompt =
  "You are a medical intake assistant. Start by asking: 'Could you please state your full name and date of birth for the record?' Then ask concise, empathetic questions to gather symptoms, history, medications, and severity. Keep it structured and clear.";

const providerSystemPrompt =
  "You are a clinical co-pilot. Use the provided patient records to answer questions, highlight relevant trends, and suggest follow-up questions. Be concise and factual.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const mode = body.mode ?? "patient";
    const messages = body.messages ?? [];
    const patientContext = body.patientContext ?? null;
    const patientId = body.patientId ?? null;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    const systemPrompt =
      mode === "provider" ? providerSystemPrompt : intakeSystemPrompt;

    const contextMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt }
    ];

    if (mode === "provider") {
      const container = cosmosClient
        .database(databaseId)
        .container(containerId);

      if (patientId) {
        const query = {
          query: "SELECT * FROM c WHERE c.id = @id OR c.patientId = @id",
          parameters: [{ name: "@id", value: patientId }]
        };
        const { resources } = await container.items.query(query, {
          enableCrossPartitionQuery: true
        }).fetchAll();
        const record = resources[0];
        if (record) {
          contextMessages.push({
            role: "system",
            content: `Active patient record:\\n${JSON.stringify(record, null, 2)}`
          });
        }
      } else if (patientContext) {
        contextMessages.push({
          role: "system",
          content: `Active patient record:\\n${patientContext}`
        });
      } else {
        const { resources } = await container.items
          .query("SELECT TOP 3 * FROM c", { enableCrossPartitionQuery: true })
          .fetchAll();

        const contextBlock = JSON.stringify(resources, null, 2);
        contextMessages.push({
          role: "system",
          content: `Patient records:\\n${contextBlock}`
        });
      }
    }

    const completion = await openAIClient.chat.completions.create({
      model: process.env.LITELLM_MODEL ?? "gpt-4o-mini",
      messages: [...contextMessages, ...messages]
    });

    const message =
      completion.choices[0]?.message?.content ??
      "I could not generate a response.";

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}
