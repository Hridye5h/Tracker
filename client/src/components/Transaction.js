import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { formatMoney, formatDate } from '../utils/format';
import { iconFor } from '../utils/categories';

export const Transaction = ({ transaction }) => {
  const { accounts, deleteTransaction, setEditing } = useContext(GlobalContext);
  const isExpense = transaction.type === 'expense';

  const account = accounts.find((a) => a._id === transaction.account);
  const sub = [transaction.category, account && account.name, formatDate(transaction.date)]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="txn-row">
      <span className={`txn-icon ${isExpense ? 'expense' : 'income'}`}>
        {iconFor(transaction.category)}
      </span>
      <div className="txn-meta">
        <span className="txn-desc">{transaction.description}</span>
        <span className="txn-sub">{sub}</span>
      </div>
      <span className={`txn-amount ${isExpense ? 'neg' : 'pos'}`}>
        {isExpense ? '−' : '+'}{formatMoney(transaction.amount)}
      </span>
      <div className="txn-actions">
        <button className="icon-btn" title="Edit" onClick={() => setEditing(transaction)}>✎</button>
        <button className="icon-btn danger" title="Delete" onClick={() => deleteTransaction(transaction._id)}>×</button>
      </div>
    </li>
  );
};
