import React, { useContext } from 'react';
import { Transaction } from './Transaction';
import { GlobalContext } from '../context/GlobalState';

export const TransactionList = () => {
  const { transactions, loading } = useContext(GlobalContext);

  return (
    <section className="card">
      <div className="card-head">
        <h3>History</h3>
        {transactions.length > 0 && <span className="count-pill">{transactions.length}</span>}
      </div>
      {loading && <p className="empty-note">Loading…</p>}
      {!loading && transactions.length === 0 && (
        <p className="empty-note">No transactions yet — add your first one and it will show up here.</p>
      )}
      <ul className="txn-list">
        {transactions.map((transaction) => (
          <Transaction key={transaction._id} transaction={transaction} />
        ))}
      </ul>
    </section>
  );
};
