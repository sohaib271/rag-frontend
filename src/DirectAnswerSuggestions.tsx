import { useEffect, useState } from 'react';
import { getDirectAnswerSuggestions } from './api';

type Suggestion = { id: string; question: string };

export function DirectAnswerSuggestions({
  companyId,
  disabled,
  onAsk,
}: {
  companyId: string;
  disabled: boolean;
  onAsk: (question: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    getDirectAnswerSuggestions(companyId).then(setSuggestions).catch(() => setSuggestions([]));
  }, [companyId]);

  if (suggestions.length === 0) return null;

  return <div className="suggestions"><p>Popular questions</p><div>
    {suggestions.map(({ id, question }) => <button key={id} disabled={disabled} onClick={() => onAsk(question)}>{question}</button>)}
  </div></div>;
}
