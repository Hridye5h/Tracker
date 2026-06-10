import React, { createContext, useReducer } from 'react';
import AppReducer from './AppReducer';
import axios from 'axios';

// Transaction + account state. The JWT header is set globally by AuthState,
// so every Axios call here is automatically authenticated.
const initialState = {
  transactions: [],
  accounts: [],
  editing: null,
  error: null,
  loading: true
};

export const GlobalContext = createContext(initialState);

export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(AppReducer, initialState);

  // ---- Transactions ----
  async function getTransactions() {
    try {
      const res = await axios.get('/api/v1/transactions');
      dispatch({ type: 'GET_TRANSACTIONS', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error fetching transactions' });
    }
  }

  async function addTransaction(transaction) {
    try {
      const res = await axios.post('/api/v1/transactions', transaction);
      dispatch({ type: 'ADD_TRANSACTION', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error adding transaction' });
    }
  }

  async function updateTransaction(id, updates) {
    try {
      const res = await axios.put(`/api/v1/transactions/${id}`, updates);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error updating transaction' });
    }
  }

  async function deleteTransaction(id) {
    try {
      await axios.delete(`/api/v1/transactions/${id}`);
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error deleting transaction' });
    }
  }

  const setEditing = (transaction) => dispatch({ type: 'SET_EDITING', payload: transaction });
  const clearEditing = () => dispatch({ type: 'CLEAR_EDITING' });

  // ---- Accounts ----
  async function getAccounts() {
    try {
      const res = await axios.get('/api/v1/accounts');
      dispatch({ type: 'GET_ACCOUNTS', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error fetching accounts' });
    }
  }

  async function createAccount(account) {
    try {
      const res = await axios.post('/api/v1/accounts', account);
      dispatch({ type: 'ADD_ACCOUNT', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error creating account' });
    }
  }

  async function deleteAccount(id) {
    try {
      await axios.delete(`/api/v1/accounts/${id}`);
      dispatch({ type: 'DELETE_ACCOUNT', payload: id });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error deleting account' });
    }
  }

  // Atomic transfer. On success, refresh both balances and the ledger (the
  // server writes two transactions inside the same DB transaction).
  async function transfer(payload) {
    try {
      await axios.post('/api/v1/accounts/transfer', payload);
      await getAccounts();
      await getTransactions();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Transfer failed' };
    }
  }

  return (
    <GlobalContext.Provider
      value={{
        transactions: state.transactions,
        accounts: state.accounts,
        editing: state.editing,
        error: state.error,
        loading: state.loading,
        getTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setEditing,
        clearEditing,
        getAccounts,
        createAccount,
        deleteAccount,
        transfer
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
