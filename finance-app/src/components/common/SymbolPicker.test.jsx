import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SymbolPicker from './SymbolPicker.jsx';

function setup(props = {}) {
  const onSubmit = vi.fn();
  const onClear = vi.fn();
  render(<SymbolPicker selected={null} onSubmit={onSubmit} onClear={onClear} {...props} />);
  const input = screen.getByLabelText('Check another company');
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Show chart' }));
  const type = (value) => fireEvent.change(input, { target: { value } });
  return { onSubmit, onClear, input, submit, type };
}

describe('SymbolPicker', () => {
  it('submits the normalized symbol and clears the field', () => {
    const { onSubmit, input, submit, type } = setup();
    type('  aapl ');
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('AAPL');
    expect(input.value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('blocks an empty submission with a message and does not call onSubmit', () => {
    const { onSubmit, input, submit } = setup();
    submit();
    expect(screen.getByRole('alert').textContent).toMatch(/enter a ticker/i);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a malformed symbol and keeps what the user typed', () => {
    const { onSubmit, input, submit, type } = setup();
    type('bad sym!');
    submit();
    expect(screen.getByRole('alert').textContent).toMatch(/not a valid ticker/i);
    expect(input.value).toBe('bad sym!');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes the error once a valid symbol is submitted', () => {
    const { onSubmit, submit, type } = setup();
    submit();
    expect(screen.getByRole('alert')).toBeTruthy();
    type('msft');
    submit();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSubmit).toHaveBeenCalledWith('MSFT');
  });

  it('shows a Clear button only while a symbol is selected', () => {
    const { onClear } = setup({ selected: 'AAPL' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear AAPL' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('has no Clear button when nothing is selected', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^Clear/ })).toBeNull();
  });
});
