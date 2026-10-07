export type Company = {
  id: string;
  name: string;
  createdAt: string;
  documentCount: number;
};

const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function getCompanies(): Promise<Company[]> {
  const response = await fetch(`${apiUrl}/company`);

  if (!response.ok) {
    throw new Error('Unable to load companies. Please try again.');
  }

  return response.json() as Promise<Company[]>;
}

export async function createCompany(name: string): Promise<Company> {
  const response = await fetch(`${apiUrl}/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error('Unable to create the company. Please try again.');
  }

  return response.json() as Promise<Company>;
}

export type CompanyDataInput = {
  companyId: string;
  title: string;
  sourceType: string;
  text: string;
};

export async function addCompanyData(input: CompanyDataInput): Promise<void> {
  const response = await fetch(`${apiUrl}/company/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Unable to save the company information. Please try again.');
  }
}

export async function uploadCompanyData(
  companyId: string,
  title: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append('companyId', companyId);
  formData.append('title', title);
  formData.append('file', file);

  const response = await fetch(`${apiUrl}/company/data/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(result?.message ?? 'Unable to upload the document. Please try again.');
  }
}

export async function askCompanyQuestion(
  companyId: string,
  query: string,
): Promise<{ answer: string }> {
  const response = await fetch(`${apiUrl}/company/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, query }),
  });

  if (!response.ok) {
    throw new Error('Unable to get an answer. Please try again.');
  }

  return response.json() as Promise<{ answer: string }>;
}
