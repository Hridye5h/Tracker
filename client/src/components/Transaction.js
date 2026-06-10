import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { numberWithCommas } from '../utils/format';

export const Transaction = ({ transaction }) => {
  const { deleteTransaction, setEditing } = useContext(GlobalContext);
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';

  return (
    <li className={isExpense ? 'minus' : 'plus'}>
      <span className="desc">
        {transaction.description}
        <small className="cat">{transaction.category}</small>
      </span>
      <span className="amt">{sign}&#8377;{numberWithCommas(Math.abs(transaction.amount))}</span>
      <button onClick={() => setEditing(transaction)} className="edit-btn">edit</button>
      <button onClick={() => deleteTransaction(transaction._id)} className="delete-btn">x</button>
    </li>
  );
};
