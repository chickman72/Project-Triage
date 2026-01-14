import { CosmosClient } from "@azure/cosmos";

const globalForCosmos = globalThis as unknown as {
  cosmosClient?: CosmosClient;
};

export const getCosmosClient = () => {
  if (globalForCosmos.cosmosClient) {
    return globalForCosmos.cosmosClient;
  }
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) {
    throw new Error("Missing Cosmos DB environment variables.");
  }
  const client = new CosmosClient({ endpoint, key });
  if (process.env.NODE_ENV !== "production") {
    globalForCosmos.cosmosClient = client;
  }
  return client;
};
