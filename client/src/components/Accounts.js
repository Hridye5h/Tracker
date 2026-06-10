import React, { useContext, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { formatMoney } from '../utils/format';

const ACCOUNT_ICONS = { bank: '🏦', cash: '💵', upi: '📱', card: '💳', wallet: '👛' };
const accountIcon = (name) => {
  const k = Object.keys(ACCOUNT_ICONS).find((key) => name.toLowerCase().includes(key));
  return k ? ACCOUNT_ICONS[k] : '🪙';
};

// Accounts panel: money buckets + atomic transfers between them.
export const Accounts = () => {
  const { accounts, createAccount, deleteAccount, transfer } = useContext(GlobalContext);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '' });
  const [msg, setMsg] = useState(null);

  const onCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createAccount({ name: name.trim(), balance: +balance || 0 });
    setName('');
    setBalance('');
    setShowAdd(false);
  };

  const onDelete = (acc) => {
    // Cascade: the server deletes the account's transactions with it.
    if (window.confirm(`Delete "${acc.name}" and all of its transactions? This cannot be undone.`)) {
      deleteAccount(acc._id);
    }
  };

  const onTransferChange = (e) =>
    setTransferForm({ ...transferForm, [e.target.name]: e.target.value });

  const onTransfer = async (e) => {
    e.preventDefault();
    setMsg(null);
    const res = await transfer({
      fromAccountId: transferForm.fromAccountId,
      toAccountId: transferForm.toAccountId,
      amount: +transferForm.amount
    });
    if (res.success) {
      setMsg({ type: 'ok', text: 'Transfer complete ✓' });
      setTransferForm({ fromAccountId: '', toAccountId: '', amount: '' });
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg({ type: 'err', text: res.error });
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3>Accounts</h3>
        <button className="ghost-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Close' : '+ Add'}
        </button>
      </div>

      {accounts.length === 0 && (
        <p className="empty-note">
          No accounts yet — add one, or just record a transaction and a <strong>Cash</strong> account
          is created for you automatically.
        </p>
      )}

      <ul className="account-list">
        {accounts.map((acc) => (
          <li key={acc._id} className="account-row">
            <span className="account-icon">{accountIcon(acc.name)}</span>
            <div className="account-meta">
              <span className="account-name">{acc.name}</span>
              <span className="account-currency">{acc.currency}</span>
            </div>
            <span className={`account-balance ${acc.balance < 0 ? 'neg' : ''}`}>
              {acc.balance < 0 ? '-' : ''}{formatMoney(acc.balance)}
            </span>
            <button className="icon-btn danger" title="Delete account" onClick={() => onDelete(acc)}>×</button>
          </li>
        ))}
      </ul>

      {showAdd && (
        <form onSubmit={onCreate} className="inline-form">
          <div className="form-row">
            <div className="form-control grow">
              <label>Account name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank, Cash, UPI" autoFocus />
            </div>
            <div className="form-control">
              <label>Opening balance</label>
              <input type="number" min="0" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn">Add account</button>
        </form>
      )}

      {accounts.length >= 2 && (
        <div className="transfer-block">
          <h4 className="block-title">🔁 Transfer between accounts</h4>
          {msg && <p className={msg.type === 'ok' ? 'note-ok' : 'note-err'}>{msg.text}</p>}
          <form onSubmit={onTransfer}>
            <div className="form-row">
              <div className="form-control grow">
                <label>From</label>
                <select name="fromAccountId" value={transferForm.fromAccountId} onChange={onTransferChange} required>
                  <option value="">Select…</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name} ({formatMoney(a.balance)})</option>
                  ))}
                </select>
              </div>
              <div className="form-control grow">
                <label>To</label>
                <select name="toAccountId" value={transferForm.toAccountId} onChange={onTransferChange} required>
                  <option value="">Select…</option>
                  {accounts
                    .filter((a) => a._id !== transferForm.fromAccountId)
                    .map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-control grow">
                <label>Amount</label>
                <input type="number" min="0" step="0.01" name="amount" value={transferForm.amount} onChange={onTransferChange} placeholder="Amount to move" required />
              </div>
              <button className="btn btn-fit">Transfer</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
