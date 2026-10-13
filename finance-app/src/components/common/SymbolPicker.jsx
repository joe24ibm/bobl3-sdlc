import { useState } from 'react';
import { parseSymbol } from '../../utils/symbols.js';

/**
 * Ticker input. Validates the format before anything is fetched.
 * `onSubmit(symbol)` receives the normalized (trimmed, upper-case) symbol; `onClear` removes the selection.
 */
export default function SymbolPicker({ selected, onSubmit, onClear }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const result = parseSymbol(text);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setText('');
    onSubmit(result.symbol);
  }

  return (
    <form className="symbol-picker" onSubmit={handleSubmit} noValidate>
      <label htmlFor="symbol-input">Check another company</label>
      <div className="symbol-picker-row">
        <input
          id="symbol-input"
          type="text"
          value={text}
          placeholder="Ticker, e.g. AAPL"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'symbol-error' : undefined}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Show chart</button>
        {selected && (
          <button type="button" className="secondary" onClick={onClear}>
            Clear {selected}
          </button>
        )}
      </div>
      {error && (
        <p id="symbol-error" role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
