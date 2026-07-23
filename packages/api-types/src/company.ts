// --- Requests ---

export interface CreateCompanyRequest {
  name: string;
  alias?: string;
  description?: string;
  parentCompanyId?: string;
}

export type UpdateCompanyRequest = CreateCompanyRequest;

// --- Responses ---

export interface CompanyResponse {
  id: string;
  name: string;
  alias: string | null;
  description: string | null;
  parentCompanyId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}
