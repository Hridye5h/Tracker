import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { CATEGORIES } from '../utils/categories';

// Add/edit form. Every transaction is tied to an account: income credits it,
// expense debits it. With no account selected (and none existing), the server
// auto-creates a "Cash" account so the money always lands somewhere.
export const AddTransaction = () => {
  const { accounts, addTransaction, updateTransaction, editing, clearEditing, error, clearError } =
    useContext(GlobalContext);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('General');
  const [account, setAccount] = useState('');

  // Default the account picker to the first account once they load.
  useEffect(() => {
    if (!editing && !account && accounts.length > 0) setAccount(accounts[0]._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  useEffect(() => {
    if (editing) {
      setDescription(editing.description);
      setAmount(editing.amount);
      setType(editing.type);
      setCategory(editing.category || 'General');
      setAccount(editing.account || (accounts[0] && accounts[0]._id) || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const reset = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('General');
    setAccount(accounts.length > 0 ? accounts[0]._id : '');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = { description, amount: +amount, type, category };
    if (account) payload.account = account;
    if (editing) updateTransaction(editing._id, payload);
    else addTransaction(payload);
    reset();
  };

  const onCancel = () => {
    clearEditing();
    reset();
  };

  return (
    <section className={`card ${editing ? 'card-editing' : ''}`}>
      <div className="card-head">
        <h3>{editing ? `Edit “${editing.description}”` : 'Add transaction'}</h3>
        {editing && <button className="ghost-btn" onClick={onCancel}>Cancel</button>}
      </div>

      {error && (
        <p className="note-err" onClick={clearError} title="Dismiss">
          {Array.isArray(error) ? error.join(', ') : error}
        </p>
      )}

      <form onSubmit={onSubmit}>
        <div className="segment">
          <button
            type="button"
            className={`segment-btn ${type === 'expense' ? 'active expense' : ''}`}
            onClick={() => setType('expense')}
          >
            ↑ Expense
          </button>
          <button
            type="button"
            className={`segment-btn ${type === 'income' ? 'active income' : ''}`}
            onClick={() => setType('income')}
          >
            ↓ Income
          </button>
        </div>

        <div className="form-control">
          <label>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries" required />
        </div>

        <div className="form-row">
          <div className="form-control grow">
            <label>Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="form-control grow">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.filter((c) => c.name !== 'Transfer').map((c) => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-control">
          <label>{type === 'income' ? 'Into account' : 'Paid from account'}</label>
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            {accounts.length === 0 && <option value="">Cash (created automatically)</option>}
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>

        <button className={`btn ${type === 'income' ? 'btn-income' : ''}`}>
          {editing ? 'Save changes' : `Add ${type}`}
        </button>
      </form>
    </section>
  );
};
