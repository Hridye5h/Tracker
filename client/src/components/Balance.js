import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { numberWithCommas } from '../utils/format';

export const Balance = () => {
  const { transactions } = useContext(GlobalContext);

  // income adds, expense subtracts (direction comes from `type`, not a sign)
  const total = transactions
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
    .toFixed(2);

  return (
    <>
      <h4>Your Balance</h4>
      <h1>&#8377;{numberWithCommas(total)}</h1>
    </>
  );
};
