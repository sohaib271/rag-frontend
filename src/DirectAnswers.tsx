import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createDirectAnswer,
  deleteDirectAnswer,
  getDirectAnswers,
  updateDirectAnswer,
} from './api';
import type { DirectAnswer } from './api';

const emptyForm = {
  question: '',
  answer: '',
  phrases: '',
  enabled: true,
  showAsSuggestion: true,
};

export function DirectAnswers({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [items, setItems] = useState<DirectAnswer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getDirectAnswers(companyId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load direct answers.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const values = {
      question: form.question,
      answer: form.answer,
      phrases: form.phrases.split('\n').map((phrase) => phrase.trim()).filter(Boolean),
      enabled: form.enabled,
      showAsSuggestion: form.showAsSuggestion,
    };
    try {
      if (editingId) await updateDirectAnswer(editingId, values);
      else await createDirectAnswer({ companyId, ...values });
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save direct answer.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: DirectAnswer) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      phrases: item.phrases.join('\n'),
      enabled: item.enabled,
      showAsSuggestion: item.showAsSuggestion,
    });
  };

  const remove = async (item: DirectAnswer) => {
    if (!window.confirm(`Delete "${item.question}"?`)) return;
    try {
      await deleteDirectAnswer(item.id);
      if (editingId === item.id) resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete direct answer.');
    }
  };

  return <main className="content direct-answers-page">
    <header className="page-header"><div><p className="eyebrow">{companyName.toUpperCase()}</p><h1>Direct answers</h1><p>Answer exact common questions without an AI call.</p></div></header>
    <div className="direct-answer-layout">
      <form className="form-card" onSubmit={save}>
        <div className="form-heading"><div><h2>{editingId ? 'Edit direct answer' : 'New direct answer'}</h2><p>Only the question and listed phrases will match.</p></div></div>
        <label>Suggested question <em>*</em><input required maxLength={160} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} /></label>
        <label>Direct answer <em>*</em><textarea required rows={4} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} /></label>
        <label>Alternative phrases<textarea rows={4} placeholder="One exact phrase per line" value={form.phrases} onChange={(event) => setForm({ ...form, phrases: event.target.value })} /></label>
        <div className="check-row"><label><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Enabled</label><label><input type="checkbox" checked={form.showAsSuggestion} onChange={(event) => setForm({ ...form, showAsSuggestion: event.target.checked })} /> Show as suggestion</label></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">{editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel</button>}<button className="primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add direct answer'}</button></div>
      </form>
      <section className="direct-answer-list" aria-busy={loading}>
        {loading && <p className="list-feedback">Loading direct answers...</p>}
        {!loading && items.length === 0 && <div className="list-feedback"><h2>No direct answers yet</h2><p>Add common questions such as services, contact details, location, or timings.</p></div>}
        {items.map((item) => <article className="direct-answer-card" key={item.id}><div><span className={item.enabled ? 'answer-status enabled' : 'answer-status'}>{item.enabled ? 'Enabled' : 'Disabled'}</span><h2>{item.question}</h2><p>{item.answer}</p>{item.phrases.length > 0 && <small>{item.phrases.join(' · ')}</small>}</div><div className="answer-actions"><button className="secondary" onClick={() => edit(item)}>Edit</button><button className="danger-button" onClick={() => void remove(item)}>Delete</button></div></article>)}
      </section>
    </div>
  </main>;
}
