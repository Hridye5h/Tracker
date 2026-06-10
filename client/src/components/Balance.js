import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { formatMoney } from '../utils/format';

// Hero card. "Total balance" is the REAL money you have — the sum of account
// balances (every transaction credits/debits an account server-side).
// The chips exclude Transfer rows: moving money between your own accounts is
// neither income nor expense, so income − expense always equals the balance.
export const Balance = () => {
  const { accounts, summary } = useContext(GlobalContext);

  const total = accounts.reduce((acc, a) => acc + a.balance, 0);

  const sumType = (type) =>
    (summary ? summary.byCategory : [])
      .filter((r) => r._id.type === type && r._id.category !== 'Transfer')
      .reduce((acc, r) => acc + r.total, 0);
  const income = sumType('income');
  const expense = sumType('expense');

  return (
    <section className="hero-card">
      <p className="hero-label">Total balance</p>
      <h1 className="hero-amount">{total < 0 ? '-' : ''}{formatMoney(total)}</h1>
      <p className="hero-sub">across {accounts.length || 'no'} account{accounts.length === 1 ? '' : 's'}</p>
      <div className="hero-chips">
        <div className="chip chip-income">
          <span className="chip-arrow">↓</span>
          <div>
            <span className="chip-label">Income</span>
            <span className="chip-value">{formatMoney(income)}</span>
          </div>
        </div>
        <div className="chip chip-expense">
          <span className="chip-arrow">↑</span>
          <div>
            <span className="chip-label">Expense</span>
            <span className="chip-value">{formatMoney(expense)}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
