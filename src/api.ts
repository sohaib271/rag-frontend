export type Role = 'admin' | 'customer';
export type AuthUser = { id: string; name: string; email: string; role: Role };
export type Customer = AuthUser & { createdAt: string };
export type Company = { id: string; name: string; oneTimeCapacity: number; currency: string; createdAt: string; documentCount: number };
export type ServiceInfo = { id: string; companyId: string; name: string; price: string; avgTime: number; createdAt: string };
export type DirectAnswer = { id: string; companyId: string; question: string; answer: string; phrases: string[]; enabled: boolean; showAsSuggestion: boolean };
export type ConversationSummary = { id: string; createdAt: string; updatedAt: string; preview: string };
export type ConversationMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };

const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { credentials: 'include', ...options });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message ?? body;
    } catch { /* Use a plain-text error response. */ }
    const error = new Error(message || `Request failed with HTTP ${response.status}.`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const login = (email: string, password: string) => request<{ user: AuthUser }>('/auth/login', json('POST', { email, password }));
export const signup = (input: { name: string; email: string; password: string }) => request<{ user: AuthUser }>('/auth/signup', json('POST', input));
export const logout = () => request<{ loggedOut: true }>('/auth/logout', json('POST'));
export const getMe = () => request<AuthUser>('/auth/me');
export const getCustomers = () => request<Customer[]>('/auth/customers');
export const createCustomer = (input: { name: string; email: string; password: string }) => request<Customer>('/auth/customers', json('POST', input));

export const getCompanies = () => request<Company[]>('/company');
export const createCompany = (name: string, oneTimeCapacity: number, currency: string) => request<Company>('/company', json('POST', { name, oneTimeCapacity, currency }));
export const updateCompany = (id: string, input: Partial<Pick<Company, 'name' | 'oneTimeCapacity' | 'currency'>>) => request<Company>(`/company/${id}`, json('PATCH', input));
export const deleteCompany = (id: string) => request<{ deleted: true }>(`/company/${id}`, { method: 'DELETE' });

export type CompanyDataInput = { companyId: string; title: string; sourceType: string; text: string };
export const addCompanyData = (input: CompanyDataInput) => request<void>('/company/data', json('POST', input));

export async function uploadCompanyData(companyId: string, title: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('companyId', companyId); formData.append('title', title); formData.append('file', file);
  await request<void>('/company/data/upload', { method: 'POST', body: formData });
}

export async function askCompanyQuestion(companyId: string, query: string, conversationId?: string): Promise<{ answer: string; conversationId: string; source: 'direct' | 'cache' | 'semantic-cache' | 'rag' | 'booking' }> {
  try {
    return await request('/company/question', json('POST', { companyId, query, ...(conversationId ? { conversationId } : {}) }));
  } catch (error) {
    if ((error as Error & { status?: number }).status === 404 && conversationId && error instanceof Error && error.message === 'Conversation not found for this company.') return askCompanyQuestion(companyId, query);
    throw error;
  }
}

export const getConversations = (companyId: string) =>
  request<ConversationSummary[]>(`/company/${encodeURIComponent(companyId)}/conversations`);
export const getConversationMessages = (companyId: string, conversationId: string) =>
  request<ConversationMessage[]>(`/company/${encodeURIComponent(companyId)}/conversations/${encodeURIComponent(conversationId)}/messages`);

export const getServices = (companyId: string) => request<ServiceInfo[]>(`/company/${encodeURIComponent(companyId)}/services`);
export const createService = (companyId: string, input: { name: string; price: number; avgTime: number }) => request<ServiceInfo>(`/company/${companyId}/services`, json('POST', input));
export const updateService = (id: string, input: Partial<Pick<ServiceInfo, 'name' | 'price' | 'avgTime'>>) => request<ServiceInfo>(`/company/services/${id}`, json('PATCH', input));
export const deleteService = (id: string) => request<{ deleted: true }>(`/company/services/${id}`, { method: 'DELETE' });

async function directAnswerRequest<T>(path: string, options?: RequestInit) { return request<T>(`/company/direct-answers${path}`, options); }
export const getDirectAnswers = (companyId: string) => directAnswerRequest<DirectAnswer[]>(`?companyId=${encodeURIComponent(companyId)}`);
export const getDirectAnswerSuggestions = (companyId: string) => directAnswerRequest<Pick<DirectAnswer, 'id' | 'question'>[]>(`/suggestions?companyId=${encodeURIComponent(companyId)}`);
export const createDirectAnswer = (input: Omit<DirectAnswer, 'id'>) => directAnswerRequest<DirectAnswer>('', json('POST', input));
export const updateDirectAnswer = (id: string, input: Partial<Omit<DirectAnswer, 'id' | 'companyId'>>) => directAnswerRequest<DirectAnswer>(`/${id}`, json('PATCH', input));
export const deleteDirectAnswer = (id: string) => directAnswerRequest<{ deleted: true }>(`/${id}`, { method: 'DELETE' });
