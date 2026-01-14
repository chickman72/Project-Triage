import { NextResponse } from "next/server";
import { cosmosClient } from "../../../lib/cosmosClient";

const databaseId = process.env.COSMOS_DATABASE ?? "triage_db";
const containerId = process.env.COSMOS_CONTAINER ?? "patients";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const summary = searchParams.get("summary") === "1";

    const container = cosmosClient.database(databaseId).container(containerId);

    if (id) {
      const query = {
        query: "SELECT * FROM c WHERE c.id = @id OR c.patientId = @id",
        parameters: [{ name: "@id", value: id }]
      };
      const { resources } = await container.items.query(query, {
        enableCrossPartitionQuery: true
      }).fetchAll();

      const patient = resources[0] ?? null;
      return NextResponse.json({ patient });
    }

    if (summary) {
      const query = {
        query:
          "SELECT c.id, c.patientId, c.full_name, c.name, c.age, c.gender, c.dob, c.chief_complaint, c.chiefComplaint FROM c"
      };
      const { resources } = await container.items.query(query, {
        enableCrossPartitionQuery: true
      }).fetchAll();

      return NextResponse.json({ patients: resources });
    }

    const { resources } = await container.items
      .query("SELECT * FROM c", { enableCrossPartitionQuery: true })
      .fetchAll();
    return NextResponse.json({ patients: resources });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch patients." },
      { status: 500 }
    );
  }
}
