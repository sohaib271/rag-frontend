import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { addCompanyData, askCompanyQuestion, createCompany, getCompanies, uploadCompanyData } from './api';
import type { Company } from './api';

type View = 'companies' | 'setup' | 'chat';
type Message = { id: number; role: 'user' | 'assistant'; text: string };

const Icon = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const BuildingIcon = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 21V7h8v14M8 11h8M8 15h8M11 7V3" /></Icon>;
const ChatIcon = () => <Icon><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></Icon>;
const ArrowIcon = () => <Icon size={18}><path d="m9 18 6-6-6-6" /></Icon>;
const BackIcon = () => <Icon size={18}><path d="m15 18-6-6 6-6" /></Icon>;
const FileIcon = () => <Icon size={22}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></Icon>;
const SendIcon = () => <Icon size={18}><path d="m22 2-7 20-4-9-9-4zM22 2 11 13" /></Icon>;
const PlusIcon = () => <Icon size={18}><path d="M12 5v14M5 12h14" /></Icon>;

function Sidebar({ view, setView, canChat }: { view: View; setView: (view: View) => void; canChat: boolean }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>Atlas</span></div>
      <nav>
        <button className={view === 'companies' ? 'nav-item active' : 'nav-item'} onClick={() => setView('companies')}><BuildingIcon /> Companies</button>
        <button className={view === 'setup' ? 'nav-item active' : 'nav-item'} onClick={() => setView('setup')}><BuildingIcon /> Company setup</button>
        <button className={view === 'chat' ? 'nav-item active' : 'nav-item'} onClick={() => setView(canChat ? 'chat' : 'companies')}><ChatIcon /> Ask Atlas</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="status"><span className="status-dot" /> Knowledge base ready</div>
        <div className="profile"><span className="avatar">JD</span><span><strong>Jordan Davis</strong><small>Workspace admin</small></span><span className="more">•••</span></div>
      </div>
    </aside>
  );
}

function Setup({ goToChat, onCompanyCreated, onSetupComplete, existingCompany, onBackToCompanies }: { goToChat: () => void; onCompanyCreated: (companyId: string) => void; onSetupComplete: () => void; existingCompany: Company | null; onBackToCompanies: () => void }) {
  const [step, setStep] = useState(existingCompany ? 2 : 1);
  const [company, setCompany] = useState({ name: existingCompany?.name ?? '', website: '', industry: '', size: '' });
  const [document, setDocument] = useState({ title: '', sourceType: 'manual', content: '' });
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const [companyId, setCompanyId] = useState(existingCompany?.id ?? '');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isSavingData, setIsSavingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const next = async (event: FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError('');
    try {
      const createdCompany = await createCompany(company.name);
      setCompanyId(createdCompany.id);
      onCompanyCreated(createdCompany.id);
      setStep(2);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create the company.');
    } finally {
      setIsCreating(false);
    }
  };

  const finish = async (event: FormEvent) => {
    event.preventDefault();
    setIsSavingData(true);
    setDataError('');

    try {
      if (selectedFile) {
        await uploadCompanyData(companyId, document.title, selectedFile);
      } else {
        await addCompanyData({
          companyId,
          title: document.title,
          sourceType: document.sourceType,
          text: document.content,
        });
      }
      setSaved(true);
      onSetupComplete();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to save the company information.');
    } finally {
      setIsSavingData(false);
    }
  };

  if (saved) {
    return <main className="content success-wrap"><div className="success-card"><div className="success-icon">✓</div><p className="eyebrow">SETUP COMPLETE</p><h1>{company.name || 'Your company'} is ready</h1><p>Your company profile and knowledge source have been added. Atlas is ready to answer questions using this information.</p><div className="summary"><span><BuildingIcon /></span><div><strong>{company.name || 'Company profile'}</strong><small>{document.title || fileName || 'Company information'} · Ready to search</small></div></div><button className="primary" onClick={goToChat}>Start a conversation <ArrowIcon /></button><button className="text-button" onClick={() => setSaved(false)}>Back to setup</button></div></main>;
  }

  return (
    <main className="content">
      <header className="page-header"><div><p className="eyebrow">KNOWLEDGE SETUP</p><h1>Tell Atlas about your company</h1><p>Build a reliable company knowledge base in two quick steps.</p></div><div className="step-count">Step {step} of 2</div></header>
      <div className="progress" aria-label={`Step ${step} of 2`}><span className="filled" /><span className={step === 2 ? 'filled' : ''} /></div>
      <div className="step-labels"><span><b>01</b> Company details</span><span className={step === 2 ? 'current' : ''}><b>02</b> Company information</span></div>

      {step === 1 ? (
        <form className="form-card" onSubmit={next}>
          <div className="form-heading"><span className="form-icon"><BuildingIcon /></span><div><h2>Company details</h2><p>Start with the basics. You can update these anytime.</p></div></div>
          <label>Company name <em>*</em><input required placeholder="e.g. Acme Technologies" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></label>
          <label>Company website<input type="url" placeholder="https://acme.com" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} /><small>We use this only to identify your organization.</small></label>
          <div className="field-row">
            <label>Industry<select value={company.industry} onChange={(e) => setCompany({ ...company, industry: e.target.value })}><option value="">Select industry</option><option>Technology</option><option>Financial services</option><option>Healthcare</option><option>Retail</option><option>Professional services</option><option>Other</option></select></label>
            <label>Company size<select value={company.size} onChange={(e) => setCompany({ ...company, size: e.target.value })}><option value="">Select size</option><option>1–10 employees</option><option>11–50 employees</option><option>51–200 employees</option><option>201–1,000 employees</option><option>1,000+ employees</option></select></label>
          </div>
          {createError && <p className="form-error" role="alert">{createError}</p>}
          <div className="form-actions"><span>All fields except company name are optional.</span><button className="primary" type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Continue'} {!isCreating && <ArrowIcon />}</button></div>
        </form>
      ) : (
        <form className="form-card" onSubmit={finish}>
          <div className="form-heading"><span className="form-icon"><FileIcon /></span><div><h2>Company information</h2><p>Add a document Atlas can use when answering questions.</p></div></div>
          <label>Document title <em>*</em><input required placeholder="e.g. Employee handbook" value={document.title} onChange={(e) => setDocument({ ...document, title: e.target.value })} /></label>
          <label>Source type<select value={document.sourceType} onChange={(e) => setDocument({ ...document, sourceType: e.target.value })}><option value="manual">Manual entry</option><option value="policy">Policy</option><option value="handbook">Handbook</option><option value="faq">FAQ</option></select></label>
          <label>Company knowledge<textarea required={!selectedFile} rows={7} placeholder="Paste company policies, product information, frequently asked questions, or any other useful context..." value={document.content} onChange={(e) => setDocument({ ...document, content: e.target.value })} /></label>
          <div className="divider"><span>or upload a document</span></div>
          <input ref={fileRef} hidden type="file" accept=".pdf,.txt,.docx" onChange={(e) => { const file = e.target.files?.[0] ?? null; setSelectedFile(file); setFileName(file?.name ?? ''); }} />
          <button type="button" className="upload" onClick={() => fileRef.current?.click()}><span className="upload-icon">↑</span><span><strong>{fileName || 'Choose a file to upload'}</strong><small>{fileName ? 'File selected' : 'PDF, DOCX, or TXT up to 10 MB'}</small></span></button>
          {dataError && <p className="form-error" role="alert">{dataError}</p>}
          <div className="form-actions"><button className="secondary" type="button" onClick={existingCompany ? onBackToCompanies : () => setStep(1)} disabled={isSavingData}><BackIcon /> Back</button><button className="primary" type="submit" disabled={isSavingData}>{isSavingData ? 'Saving...' : 'Finish setup'} {!isSavingData && <ArrowIcon />}</button></div>
        </form>
      )}
    </main>
  );
}

function Companies({ companies, loading, error, onRetry, onCreate, onTest, onAddDocument }: {
  companies: Company[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onCreate: () => void;
  onTest: (company: Company) => void;
  onAddDocument: (company: Company) => void;
}) {
  return (
    <main className="content">
      <header className="page-header"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Companies</h1><p>Choose a company to test its chatbot.</p></div><button className="primary" onClick={onCreate}><PlusIcon /> Add company</button></header>
      {loading && <p className="list-feedback" role="status">Loading companies...</p>}
      {error && <div className="list-feedback" role="alert"><p>{error}</p><button className="secondary" onClick={onRetry}>Try again</button></div>}
      {!loading && !error && companies.length === 0 && <div className="list-feedback"><h2>No companies yet</h2><p>Create a company and add a document to test its chatbot.</p><button className="primary" onClick={onCreate}>Add company <ArrowIcon /></button></div>}
      {!loading && !error && companies.length > 0 && <div className="company-list">
        {companies.map((company) => <article className="company-card" key={company.id}>
          <span className="form-icon"><BuildingIcon /></span>
          <div className="company-card-details"><h2>{company.name}</h2><p>{company.documentCount} {company.documentCount === 1 ? 'document' : 'documents'} · Created {new Date(company.createdAt).toLocaleDateString()}</p></div>
          {company.documentCount > 0
            ? <button className="primary" onClick={() => onTest(company)}>Test chatbot <ArrowIcon /></button>
            : <button className="secondary" onClick={() => onAddDocument(company)}>Add document <ArrowIcon /></button>}
        </article>)}
      </div>}
    </main>
  );
}

function Chat({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: "Hi! I’m Atlas. I can answer questions using your company’s knowledge base. What would you like to know?" },
  ]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const messageId = Date.now();
    setMessages((items) => [...items, { id: messageId, role: 'user', text }]);
    setInput('');
    setIsSending(true);

    try {
      if (!companyId) {
        throw new Error('Complete company setup before asking a question.');
      }

      const result = await askCompanyQuestion(companyId, text);

      setMessages((items) => [...items, { id: messageId + 1, role: 'assistant', text: result.answer || 'I could not find relevant information in this company knowledge base.' }]);
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          id: messageId + 1,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Unable to get an answer.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const ask = (question: string) => {
    setInput(question);
  };

  return (
    <main className="chat-page">
      <header className="chat-header"><div><p className="eyebrow">TESTING {companyName.toUpperCase()}</p><h1>Ask Atlas</h1></div><button className="new-chat" onClick={() => setMessages(messages.slice(0, 1))}><PlusIcon /> New conversation</button></header>
      <section className="conversation">
        <div className="messages">
          {messages.map((message) => <div key={message.id} className={`message-row ${message.role}`}><span className="message-avatar">{message.role === 'assistant' ? 'A' : 'JD'}</span><div><small>{message.role === 'assistant' ? 'Atlas' : 'You'}</small><p>{message.text}</p>{message.role === 'assistant' && message.id !== 1 && <span className="source">▣ Based on your company knowledge</span>}</div></div>)}
          {messages.length === 1 && <div className="suggestions"><p>Try asking</p><div><button onClick={() => ask('What is our remote work policy?')}>What is our remote work policy?</button><button onClick={() => ask('Summarize our main products')}>Summarize our main products</button><button onClick={() => ask('How do I request time off?')}>How do I request time off?</button></div></div>}
        </div>
        <form className="composer" onSubmit={send}><textarea rows={1} placeholder={isSending ? 'Searching company knowledge...' : 'Ask a question about your company…'} value={input} disabled={isSending} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} /><button aria-label="Send message" disabled={!input.trim() || isSending}><SendIcon /></button><small>Atlas answers from your company knowledge. Check important information.</small></form>
      </section>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<View>('companies');
  const [setupCompany, setSetupCompany] = useState<Company | null>(null);
  const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId') ?? '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState('');

  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError('');
    try {
      setCompanies(await getCompanies());
    } catch (error) {
      setCompaniesError(error instanceof Error ? error.message : 'Unable to load companies.');
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  const saveCompanyId = (id: string) => {
    setCompanyId(id);
    localStorage.setItem('companyId', id);
  };

  const testCompany = (company: Company) => {
    saveCompanyId(company.id);
    setView('chat');
  };

  const addDocument = (company: Company) => {
    setSetupCompany(company);
    saveCompanyId(company.id);
    setView('setup');
  };

  const createNewCompany = () => {
    setSetupCompany(null);
    setView('setup');
  };

  const selectedCompany = companies.find((company) => company.id === companyId);

  return <div className="app-shell">
    <Sidebar view={view} setView={(nextView) => {
      if (nextView === 'setup') createNewCompany();
      else {
        if (nextView === 'companies') void loadCompanies();
        setView(nextView);
      }
    }} canChat={Boolean(selectedCompany?.documentCount)} />
    {view === 'companies' && <Companies companies={companies} loading={companiesLoading} error={companiesError} onRetry={() => void loadCompanies()} onCreate={createNewCompany} onTest={testCompany} onAddDocument={addDocument} />}
    {view === 'setup' && <Setup key={setupCompany?.id ?? 'new'} existingCompany={setupCompany} onBackToCompanies={() => setView('companies')} goToChat={() => { void loadCompanies(); setView('chat'); }} onCompanyCreated={saveCompanyId} onSetupComplete={() => void loadCompanies()} />}
    {view === 'chat' && <Chat key={companyId} companyId={companyId} companyName={selectedCompany?.name ?? 'your company'} />}
  </div>;
}
