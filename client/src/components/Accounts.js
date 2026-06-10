import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { numberWithCommas } from '../utils/format';

// Accounts panel: create/delete money buckets and move money between them
// via the atomic-transfer API.
export const Accounts = () => {
  const { accounts, getAccounts, createAccount, deleteAccount, transfer } = useContext(GlobalContext);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = (e) => {
    e.preventDefault();
    if (!name) return;
    createAccount({ name, balance: +balance || 0 });
    setName('');
    setBalance('');
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
      setMsg({ type: 'ok', text: 'Transfer complete' });
      setTransferForm({ fromAccountId: '', toAccountId: '', amount: '' });
    } else {
      setMsg({ type: 'err', text: res.error });
    }
  };

  return (
    <>
      <h3>Accounts</h3>
      <ul className="list">
        {accounts.length === 0 && <li><span className="desc">No accounts yet</span></li>}
        {accounts.map((acc) => (
          <li key={acc._id}>
            <span className="desc">
              {acc.name}
              <small className="cat">{acc.currency}</small>
            </span>
            <span className="amt">&#8377;{numberWithCommas(acc.balance.toFixed(2))}</span>
            <button onClick={() => deleteAccount(acc._id)} className="delete-btn">x</button>
          </li>
        ))}
      </ul>

      <form onSubmit={onCreate}>
        <div className="form-control">
          <label>New account</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank, Cash, UPI" />
        </div>
        <div className="form-control">
          <label>Opening balance</label>
          <input type="number" min="0" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
        </div>
        <button className="btn">Add account</button>
      </form>

      {accounts.length >= 2 && (
        <form onSubmit={onTransfer}>
          <h4 className="transfer-heading">Transfer between accounts</h4>
          {msg && <p className={msg.type === 'ok' ? 'transfer-ok' : 'auth-error'}>{msg.text}</p>}
          <div className="form-control">
            <label>From</label>
            <select name="fromAccountId" value={transferForm.fromAccountId} onChange={onTransferChange} required>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} (&#8377;{numberWithCommas(a.balance.toFixed(2))})
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label>To</label>
            <select name="toAccountId" value={transferForm.toAccountId} onChange={onTransferChange} required>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label>Amount</label>
            <input type="number" min="0" step="0.01" name="amount" value={transferForm.amount} onChange={onTransferChange} placeholder="Amount to move" required />
          </div>
          <button className="btn">Transfer</button>
        </form>
      )}
    </>
  );
};
