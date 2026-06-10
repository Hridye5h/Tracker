import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';

const CATEGORIES = ['General', 'Food', 'Rent', 'Travel', 'Shopping', 'Bills', 'Salary', 'Transfer', 'Other'];

// Doubles as the "add" and "edit" form: when `editing` is set, it pre-fills
// and the submit performs an update instead of a create.
export const AddTransaction = () => {
  const { addTransaction, updateTransaction, editing, clearEditing } = useContext(GlobalContext);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('General');

  useEffect(() => {
    if (editing) {
      setDescription(editing.description);
      setAmount(editing.amount);
      setType(editing.type);
      setCategory(editing.category || 'General');
    }
  }, [editing]);

  const reset = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('General');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = { description, amount: +amount, type, category };
    if (editing) updateTransaction(editing._id, payload);
    else addTransaction(payload);
    reset();
  };

  const onCancel = () => {
    clearEditing();
    reset();
  };

  return (
    <>
      <h3>{editing ? 'Edit transaction' : 'Add new transaction'}</h3>
      <form onSubmit={onSubmit}>
        <div className="form-control">
          <label>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries" required />
        </div>
        <div className="form-control">
          <label>Amount</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount..." required />
        </div>
        <div className="form-control">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="form-control">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button className="btn">{editing ? 'Update' : 'Add transaction'}</button>
        {editing && (
          <button type="button" className="btn btn-cancel" onClick={onCancel}>Cancel</button>
        )}
      </form>
    </>
  );
};
