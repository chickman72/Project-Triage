import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

if (!endpoint || !key) {
  throw new Error("Missing Cosmos DB environment variables.");
}

const globalForCosmos = globalThis as unknown as {
  cosmosClient?: CosmosClient;
};

export const cosmosClient =
  globalForCosmos.cosmosClient ?? new CosmosClient({ endpoint, key });

if (process.env.NODE_ENV !== "production") {
  globalForCosmos.cosmosClient = cosmosClient;
}
