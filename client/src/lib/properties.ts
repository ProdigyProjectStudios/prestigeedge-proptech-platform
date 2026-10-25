import { apiRequest } from "@/lib/queryClient";
import type { Property, PropertySearchParams } from "@shared/schema";

export async function getProperties(
  page: number = 1,
  limit: number = 6,
  filters?: Partial<PropertySearchParams>
): Promise<{
  properties: Property[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.entries(filters || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value.toString();
      }
      return acc;
    }, {} as Record<string, string>),
  });

  const res = await fetch(`/api/properties?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch properties: ${res.statusText}`);
  }
  return await res.json();
}

export async function getFeaturedProperties(): Promise<Property[]> {
  const res = await fetch("/api/properties/featured");
  if (!res.ok) {
    throw new Error(`Failed to fetch featured properties: ${res.statusText}`);
  }
  return await res.json();
}

export async function getProperty(id: string): Promise<Property> {
  const res = await fetch(`/api/properties/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch property: ${res.statusText}`);
  }
  return await res.json();
}

export type { Property, PropertySearchParams };
