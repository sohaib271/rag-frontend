import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  addCompanyData, askCompanyQuestion, createCompany, createCustomer, createService, deleteCompany, deleteService,
  getCompanies, getConversationMessages, getConversations, getCustomers, getMe, getServices, login, logout, signup, updateCompany, updateService, uploadCompanyData,
} from './api';
import type { AuthUser, Company, ConversationSummary, Customer, ServiceInfo } from './api';
import { DirectAnswers } from './DirectAnswers';
import { DirectAnswerSuggestions } from './DirectAnswerSuggestions';

type View = 'companies' | 'setup' | 'customers' | 'services' | 'directAnswers' | 'chat';
type Message = { id: number | string; role: 'user' | 'assistant'; text: string; source?: 'direct' | 'cache' | 'semantic-cache' | 'rag' | 'booking' };

const Icon = ({ children, size = 20 }: { children: ReactNode; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const BuildingIcon = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 21V7h8v14M8 11h8M8 15h8M11 7V3" /></Icon>;
const ChatIcon = () => <Icon><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></Icon>;
const UsersIcon = () => <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
const ArrowIcon = () => <Icon size={18}><path d="m9 18 6-6-6-6" /></Icon>;
const BackIcon = () => <Icon size={18}><path d="m15 18-6-6 6-6" /></Icon>;
const FileIcon = () => <Icon size={22}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></Icon>;
const SendIcon = () => <Icon size={18}><path d="m22 2-7 20-4-9-9-4zM22 2 11 13" /></Icon>;
const PlusIcon = () => <Icon size={18}><path d="M12 5v14M5 12h14" /></Icon>;
const BoltIcon = () => <Icon><path d="m13 2-9 12h7l-1 8 9-12h-7z" /></Icon>;

function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin((mode === 'login' ? await login(email, password) : await signup({ name, email, password })).user); }
    catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to ${mode === 'login' ? 'log in' : 'create account'}.`); }
    finally { setBusy(false); }
  };
  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <div className="brand login-brand"><span className="brand-mark">A</span><span>Atlas</span></div>
    <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'BUSINESS REGISTRATION'}</p><h1>{mode === 'login' ? 'Sign in' : 'Create your admin account'}</h1><p>{mode === 'login' ? 'Access company chat and management tools.' : 'Create your company, upload documents, and configure its chatbot.'}</p>
    {mode === 'signup' && <label>Name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>}
    <label>Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'Own a business? Create an admin account' : 'Already have an account? Sign in'}</button>
  </form></main>;
}

function Sidebar({ view, setView, user, hasCompany, canChat, onLogout }: { view: View; setView: (view: View) => void; user: AuthUser; hasCompany: boolean; canChat: boolean; onLogout: () => void }) {
  const admin = user.role === 'admin';
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">A</span><span>Atlas</span></div>
    <nav>
      <button className={view === 'companies' ? 'nav-item active' : 'nav-item'} onClick={() => setView('companies')}><BuildingIcon /> Companies</button>
      {admin && <button className={view === 'setup' ? 'nav-item active' : 'nav-item'} onClick={() => setView('setup')}><PlusIcon /> Company setup</button>}
      {admin && <button className={view === 'customers' ? 'nav-item active' : 'nav-item'} onClick={() => setView('customers')}><UsersIcon /> Customers</button>}
      {admin && <button className={view === 'services' ? 'nav-item active' : 'nav-item'} onClick={() => setView(hasCompany ? 'services' : 'companies')}><BuildingIcon /> Services</button>}
      {admin && <button className={view === 'directAnswers' ? 'nav-item active' : 'nav-item'} onClick={() => setView(hasCompany ? 'directAnswers' : 'companies')}><BoltIcon /> Direct answers</button>}
      <button className={view === 'chat' ? 'nav-item active' : 'nav-item'} onClick={() => setView(canChat ? 'chat' : 'companies')}><ChatIcon /> Chat</button>
    </nav>
    <div className="sidebar-bottom"><div className="profile"><span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role}</small></span></div><button className="logout-button" onClick={onLogout}>Sign out</button></div>
  </aside>;
}

function Setup({ existingCompany, onCreated, onComplete, onBack }: { existingCompany: Company | null; onCreated: (id: string) => void; onComplete: () => void; onBack: () => void }) {
  const [step, setStep] = useState(existingCompany ? 2 : 1);
  const [name, setName] = useState(existingCompany?.name ?? '');
  const [capacity, setCapacity] = useState(existingCompany?.oneTimeCapacity ?? 1);
  const [currency, setCurrency] = useState(existingCompany?.currency ?? 'USD');
  const [companyId, setCompanyId] = useState(existingCompany?.id ?? '');
  const [document, setDocument] = useState({ title: '', sourceType: 'manual', content: '' });
  const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const next = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const company = await createCompany(name, capacity, currency); setCompanyId(company.id); onCreated(company.id); setStep(2); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create company.'); }
    finally { setBusy(false); }
  };
  const finish = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (file) await uploadCompanyData(companyId, document.title, file);
      else await addCompanyData({ companyId, title: document.title, sourceType: document.sourceType, text: document.content });
      onComplete();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save company data.'); }
    finally { setBusy(false); }
  };
  return <main className="content"><header className="page-header"><div><p className="eyebrow">COMPANY SETUP</p><h1>{existingCompany ? `Add knowledge to ${existingCompany.name}` : 'Create a company'}</h1></div><div className="step-count">Step {step} of 2</div></header>
    {step === 1 ? <form className="form-card" onSubmit={next}><div className="form-heading"><span className="form-icon"><BuildingIcon /></span><div><h2>Company details</h2><p>Add the salon and its simultaneous customer capacity.</p></div></div>
      <label>Company name <em>*</em><input required value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>One-time capacity <em>*</em><input type="number" min="1" required value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /><small>Maximum customers the salon can handle at the same time.</small></label>
      <label>Currency <em>*</em><select required value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="USD">USD — US Dollar</option><option value="PKR">PKR — Pakistani Rupee</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option><option value="AED">AED — UAE Dirham</option><option value="CAD">CAD — Canadian Dollar</option><option value="AUD">AUD — Australian Dollar</option></select><small>All service prices for this company use this currency.</small></label>
      {error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="secondary" type="button" onClick={onBack}><BackIcon /> Back</button><button className="primary" disabled={busy}>{busy ? 'Creating...' : 'Continue'} <ArrowIcon /></button></div>
    </form> : <form className="form-card" onSubmit={finish}><div className="form-heading"><span className="form-icon"><FileIcon /></span><div><h2>Company knowledge</h2><p>Add information that the chatbot can use.</p></div></div>
      <label>Document title <em>*</em><input required value={document.title} onChange={(e) => setDocument({ ...document, title: e.target.value })} /></label>
      <label>Knowledge<textarea required={!file} rows={7} value={document.content} onChange={(e) => setDocument({ ...document, content: e.target.value })} /></label>
      <input ref={fileRef} hidden type="file" accept=".pdf,.txt,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button type="button" className="upload" onClick={() => fileRef.current?.click()}>{file?.name ?? 'Upload PDF, DOCX, or TXT instead'}</button>
      {error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="secondary" type="button" onClick={onBack}><BackIcon /> Back</button><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Finish setup'}</button></div>
    </form>}
  </main>;
}

function Companies({ companies, user, loading, error, onCreate, onChat, onManage, onEdit, onKnowledge, onAnswers, onDelete }: { companies: Company[]; user: AuthUser; loading: boolean; error: string; onCreate: () => void; onChat: (c: Company) => void; onManage: (c: Company) => void; onEdit: (c: Company) => void; onKnowledge: (c: Company) => void; onAnswers: (c: Company) => void; onDelete: (c: Company) => void }) {
  const admin = user.role === 'admin';
  return <main className="content"><header className="page-header"><div><p className="eyebrow">{admin ? 'ADMIN WORKSPACE' : 'AVAILABLE BUSINESSES'}</p><h1>Companies</h1><p>{admin ? 'Manage companies and their chatbots.' : 'Choose a company to start a conversation.'}</p></div>{admin && <button className="primary" onClick={onCreate}><PlusIcon /> Add company</button>}</header>
    {loading && <p className="list-feedback">Loading companies...</p>}{error && <p className="form-error">{error}</p>}
    {!loading && !error && companies.length === 0 && <p className="list-feedback">No companies are available yet.</p>}
    <div className="company-list">{companies.map((company) => <article className="company-card" key={company.id}><span className="form-icon"><BuildingIcon /></span><div className="company-card-details"><h2>{company.name}</h2><p>Capacity: {company.oneTimeCapacity} · {company.documentCount} knowledge {company.documentCount === 1 ? 'document' : 'documents'}</p></div>
      {admin && <button className="secondary" onClick={() => onEdit(company)}>Edit</button>}{admin && <button className="secondary" onClick={() => onKnowledge(company)}>Knowledge</button>}{admin && <button className="secondary" onClick={() => onManage(company)}>Services</button>}{admin && <button className="secondary" onClick={() => onAnswers(company)}>Answers</button>}{admin && <button className="danger-button card-button" onClick={() => onDelete(company)}>Delete</button>}
      <button className="primary" disabled={!company.documentCount} onClick={() => onChat(company)}>Chat <ArrowIcon /></button>
    </article>)}</div>
  </main>;
}

function Customers() {
  const [items, setItems] = useState<Customer[]>([]); const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => getCustomers().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load customers.')), []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await createCustomer(form); setForm({ name: '', email: '', password: '' }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create customer.'); } finally { setBusy(false); } };
  return <main className="content"><header className="page-header"><div><p className="eyebrow">USER MANAGEMENT</p><h1>Customers</h1><p>Create login accounts for customers.</p></div></header><div className="management-grid"><form className="form-card" onSubmit={submit}><h2>New customer</h2><label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Temporary password<input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Creating...' : 'Create customer'}</button></form><section className="list-panel"><h2>Customer accounts</h2>{items.map((item) => <div className="simple-row" key={item.id}><span><strong>{item.name}</strong><small>{item.email}</small></span><small>{new Date(item.createdAt).toLocaleDateString()}</small></div>)}</section></div></main>;
}

function Services({ company }: { company: Company }) {
  const [items, setItems] = useState<ServiceInfo[]>([]); const [form, setForm] = useState({ name: '', price: '', avgTime: '30' }); const [error, setError] = useState('');
  const load = useCallback(() => getServices(company.id).then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load services.')), [company.id]);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); try { await createService(company.id, { name: form.name, price: Number(form.price), avgTime: Number(form.avgTime) }); setForm({ name: '', price: '', avgTime: '30' }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create service.'); } };
  const remove = async (item: ServiceInfo) => { if (!window.confirm(`Delete ${item.name}?`)) return; await deleteService(item.id); await load(); };
  const edit = async (item: ServiceInfo) => {
    const name = window.prompt('Service name', item.name); if (!name) return;
    const price = window.prompt('Price', item.price); if (price === null) return;
    const avgTime = window.prompt('Average time in minutes', String(item.avgTime)); if (avgTime === null) return;
    try { await updateService(item.id, { name, price, avgTime: Number(avgTime) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update service.'); }
  };
  return <main className="content"><header className="page-header"><div><p className="eyebrow">SERVICE CATALOGUE</p><h1>{company.name}</h1><p>Prices in {company.currency} and average durations used for future bookings.</p></div></header><div className="management-grid"><form className="form-card" onSubmit={submit}><h2>Add service</h2><label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Price ({company.currency})<input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Average time (minutes)<input type="number" min="1" required value={form.avgTime} onChange={(e) => setForm({ ...form, avgTime: e.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="primary">Add service</button></form><section className="list-panel"><h2>Services</h2>{items.length === 0 && <p>No services added yet.</p>}{items.map((item) => <div className="simple-row" key={item.id}><span><strong>{item.name}</strong><small>{item.avgTime} minutes · {new Intl.NumberFormat('en-US', { style: 'currency', currency: company.currency }).format(Number(item.price))}</small></span><span className="row-actions"><button className="secondary" onClick={() => void edit(item)}>Edit</button><button className="danger-button" onClick={() => void remove(item)}>Delete</button></span></div>)}</section></div></main>;
}

function LegacyChat({ company, user }: { company: Company; user: AuthUser }) {
  const [input, setInput] = useState(''); const [sending, setSending] = useState(false); const key = `conversationId:${user.id}:${company.id}`;
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(key));
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: 'assistant', text: `Hi! Ask me anything about ${company.name}.` }]);
  const sendQuestion = async (raw: string) => { const text = raw.trim(); if (!text || sending) return; const id = Date.now(); setMessages((m) => [...m, { id, role: 'user', text }]); setInput(''); setSending(true); try { const result = await askCompanyQuestion(company.id, text, conversationId ?? undefined); setConversationId(result.conversationId); localStorage.setItem(key, result.conversationId); setMessages((m) => [...m, { id: id + 1, role: 'assistant', text: result.answer, source: result.source }]); } catch (e) { setMessages((m) => [...m, { id: id + 1, role: 'assistant', text: e instanceof Error ? e.message : 'Unable to get an answer.' }]); } finally { setSending(false); } };
  return <main className="chat-page"><header className="chat-header"><div><p className="eyebrow">CHATTING WITH</p><h1>{company.name}</h1></div><button className="new-chat" disabled={sending} onClick={() => { localStorage.removeItem(key); setConversationId(null); setMessages((m) => m.slice(0, 1)); }}><PlusIcon /> New conversation</button></header><section className="conversation"><div className="messages" aria-live="polite">{messages.map((message) => <div key={message.id} className={`message-row ${message.role}`}><span className="message-avatar">{message.role === 'assistant' ? 'A' : user.name.slice(0, 2).toUpperCase()}</span><div><small>{message.role === 'assistant' ? 'Atlas' : 'You'}</small><p>{message.text}</p></div></div>)}{sending && <div className="message-row assistant typing-row" role="status"><span className="message-avatar">A</span><div><small>Atlas</small><div className="typing-bubble" aria-label="Atlas is generating a reply"><span /><span /><span /><em>Thinking…</em></div></div></div>}{messages.length === 1 && !sending && <DirectAnswerSuggestions companyId={company.id} disabled={sending} onAsk={(q) => void sendQuestion(q)} />}</div><form className="composer" onSubmit={(e) => { e.preventDefault(); void sendQuestion(input); }}><textarea rows={1} value={input} disabled={sending} placeholder={sending ? 'Waiting for Atlas…' : 'Ask a question...'} onChange={(e) => setInput(e.target.value)} /><button disabled={!input.trim() || sending}><SendIcon /></button></form></section></main>;
}

function Chat({ company, user }: { company: Company; user: AuthUser }) {
  const greeting: Message = { id: 'greeting', role: 'assistant', text: `Hi! Ask me anything about ${company.name}.` };
  const key = `conversationId:${user.id}:${company.id}`;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(key));
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversation = useCallback(async (id: string) => {
    setHistoryLoading(true);
    try {
      const storedMessages = await getConversationMessages(company.id, id);
      setConversationId(id);
      localStorage.setItem(key, id);
      setMessages(storedMessages.length
        ? storedMessages.map((message) => ({ id: message.id, role: message.role, text: message.content }))
        : [greeting]);
    } finally {
      setHistoryLoading(false);
    }
  }, [company.id, key, greeting.text]);

  const refreshHistory = useCallback(async () => {
    const conversations = await getConversations(company.id);
    setHistory(conversations);
    return conversations;
  }, [company.id]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const conversations = await getConversations(company.id);
        if (!active) return;
        setHistory(conversations);
        const savedId = localStorage.getItem(key);
        const selectedId = conversations.some(({ id }) => id === savedId)
          ? savedId
          : conversations[0]?.id;
        if (selectedId) await loadConversation(selectedId);
        else setHistoryLoading(false);
      } catch {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => { active = false; };
  }, [company.id, key, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: historyLoading ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, sending, historyLoading]);

  const sendQuestion = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    const id = Date.now();
    setMessages((current) => [
      ...current.filter((message) => message.id !== 'greeting'),
      { id, role: 'user', text },
    ]);
    setInput('');
    setSending(true);
    try {
      const result = await askCompanyQuestion(company.id, text, conversationId ?? undefined);
      setConversationId(result.conversationId);
      localStorage.setItem(key, result.conversationId);
      setMessages((current) => [...current, {
        id: id + 1,
        role: 'assistant',
        text: result.answer,
        source: result.source,
      }]);
      await refreshHistory();
    } catch (error) {
      setMessages((current) => [...current, {
        id: id + 1,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Unable to get an answer.',
      }]);
    } finally {
      setSending(false);
    }
  };

  const startNew = () => {
    localStorage.removeItem(key);
    setConversationId(null);
    setMessages([greeting]);
    setHistoryLoading(false);
  };

  return <main className="chat-page">
    <header className="chat-header"><div><p className="eyebrow">CHATTING WITH</p><h1>{company.name}</h1></div><div className="chat-header-actions">
      {history.length > 0 && <select aria-label="Conversation history" value={conversationId ?? ''} disabled={sending || historyLoading} onChange={(event) => void loadConversation(event.target.value)}><option value="" disabled>Conversation history</option>{history.map((conversation) => <option key={conversation.id} value={conversation.id}>{new Date(conversation.updatedAt).toLocaleString()} · {conversation.preview.slice(0, 38)}</option>)}</select>}
      <button className="new-chat" disabled={sending} onClick={startNew}><PlusIcon /> New conversation</button>
    </div></header>
    <section className="conversation"><div className="messages" aria-live="polite">
      {historyLoading ? <p className="history-loading">Loading conversation…</p> : messages.map((message) => <div key={message.id} className={`message-row ${message.role}`}><span className="message-avatar">{message.role === 'assistant' ? 'A' : user.name.slice(0, 2).toUpperCase()}</span><div><small>{message.role === 'assistant' ? 'Atlas' : 'You'}</small><p>{message.text}</p></div></div>)}
      {sending && <div className="message-row assistant typing-row" role="status"><span className="message-avatar">A</span><div><small>Atlas</small><div className="typing-bubble" aria-label="Atlas is generating a reply"><span /><span /><span /><em>Thinking…</em></div></div></div>}
      {!historyLoading && messages.length === 1 && messages[0].id === 'greeting' && !sending && <DirectAnswerSuggestions companyId={company.id} disabled={sending} onAsk={(question) => void sendQuestion(question)} />}
      <div ref={bottomRef} />
    </div><form className="composer" onSubmit={(event) => { event.preventDefault(); void sendQuestion(input); }}><textarea rows={1} value={input} disabled={sending || historyLoading} placeholder={sending ? 'Waiting for Atlas…' : 'Ask a question...'} onChange={(event) => setInput(event.target.value)} /><button disabled={!input.trim() || sending || historyLoading}><SendIcon /></button></form></section>
  </main>;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null); const [checking, setChecking] = useState(true); const [view, setView] = useState<View>('companies');
  const [companies, setCompanies] = useState<Company[]>([]); const [companyId, setCompanyId] = useState(''); const [setupCompany, setSetupCompany] = useState<Company | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const loadCompanies = useCallback(async () => { if (!user) return; setLoading(true); setError(''); try { setCompanies(await getCompanies()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load companies.'); } finally { setLoading(false); } }, [user]);
  useEffect(() => { getMe().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  useEffect(() => { void loadCompanies(); }, [loadCompanies]);
  const select = (company: Company, next: View) => { setCompanyId(company.id); setView(next); };
  const selected = companies.find((company) => company.id === companyId) ?? null;
  const signOut = async () => { await logout(); setUser(null); setCompanies([]); setCompanyId(''); setView('companies'); };
  if (checking) return <main className="login-page"><p>Loading...</p></main>;
  if (!user) return <Login onLogin={(loggedIn) => { setUser(loggedIn); setView('companies'); }} />;
  return <div className="app-shell"><Sidebar view={view} user={user} hasCompany={Boolean(selected)} canChat={Boolean(selected?.documentCount)} onLogout={() => void signOut()} setView={(next) => { if (next === 'setup') setSetupCompany(null); setView(next); }} />
    {view === 'companies' && <Companies companies={companies} user={user} loading={loading} error={error} onCreate={() => { setSetupCompany(null); setView('setup'); }} onChat={(c) => select(c, 'chat')} onManage={(c) => select(c, 'services')} onEdit={async (c) => { const name = window.prompt('Company name', c.name); if (!name) return; const capacity = window.prompt('One-time capacity', String(c.oneTimeCapacity)); if (capacity === null) return; const currency = window.prompt('Three-letter currency code', c.currency); if (!currency) return; await updateCompany(c.id, { name, oneTimeCapacity: Number(capacity), currency: currency.toUpperCase() }); await loadCompanies(); }} onKnowledge={(c) => { setSetupCompany(c); select(c, 'setup'); }} onAnswers={(c) => select(c, 'directAnswers')} onDelete={async (c) => { if (window.confirm(`Delete ${c.name} and all its data?`)) { await deleteCompany(c.id); await loadCompanies(); } }} />}
    {view === 'setup' && user.role === 'admin' && <Setup existingCompany={setupCompany} onCreated={setCompanyId} onBack={() => setView('companies')} onComplete={() => { void loadCompanies(); setView('companies'); }} />}
    {view === 'customers' && user.role === 'admin' && <Customers />}
    {view === 'services' && user.role === 'admin' && selected && <Services company={selected} />}
    {view === 'directAnswers' && user.role === 'admin' && selected && <DirectAnswers companyId={selected.id} companyName={selected.name} />}
    {view === 'chat' && selected && <Chat company={selected} user={user} />}
  </div>;
}
