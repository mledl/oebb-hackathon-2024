import { CosmosClient } from "@azure/cosmos";
import { COSMOS_URL, COSMOS_KEY } from "$env/static/private";

// Database and container names
const databaseId = "railanddrive";
const containerId = "railanddrive";

const client = new CosmosClient({ endpoint: COSMOS_URL, key: COSMOS_KEY });
const database = client.database(databaseId);
const container = database.container(containerId);

export function getAllItems() {
  return container.items.readAll();
}

export async function queryItems(query: string) {
  const { resources } = await container.items.query(query).fetchAll();
  return resources;
}

export async function getItemById(id: string) {
  const { resource } = await container.item(id).read();
  return resource;
}
