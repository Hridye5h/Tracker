import React, { createContext, useReducer, useEffect } from 'react';
import AppReducer from './AppReducer';
import axios from 'axios';

// Transaction + account + summary state. The JWT header is set globally by
// AuthState, so every Axios call here is automatically authenticated.
const initialState = {
  transactions: [],
  accounts: [],
  summary: null,
  editing: null,
  error: null,
  loading: true
};

export const GlobalContext = createContext(initialState);

export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(AppReducer, initialState);

  // ---- Reads ----
  async function getTransactions() {
    try {
      const res = await axios.get('/api/v1/transactions');
      dispatch({ type: 'GET_TRANSACTIONS', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error fetching transactions' });
    }
  }

  async function getAccounts() {
    try {
      const res = await axios.get('/api/v1/accounts');
      dispatch({ type: 'GET_ACCOUNTS', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error fetching accounts' });
    }
  }

  async function getSummary() {
    try {
      const res = await axios.get('/api/v1/transactions/summary');
      dispatch({ type: 'GET_SUMMARY', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error fetching summary' });
    }
  }

  // Balances move on every mutation, so refresh the money views together.
  const refreshMoney = () => Promise.all([getAccounts(), getSummary()]);

  // Load everything once on login (this provider only mounts when authed).
  useEffect(() => {
    getTransactions();
    refreshMoney();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Transactions ----
  async function addTransaction(transaction) {
    try {
      const res = await axios.post('/api/v1/transactions', transaction);
      dispatch({ type: 'ADD_TRANSACTION', payload: res.data.data });
      await refreshMoney();
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error adding transaction' });
    }
  }

  async function updateTransaction(id, updates) {
    try {
      const res = await axios.put(`/api/v1/transactions/${id}`, updates);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: res.data.data });
      await refreshMoney();
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error updating transaction' });
    }
  }

  async function deleteTransaction(id) {
    try {
      await axios.delete(`/api/v1/transactions/${id}`);
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      await refreshMoney();
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error deleting transaction' });
    }
  }

  const setEditing = (transaction) => dispatch({ type: 'SET_EDITING', payload: transaction });
  const clearEditing = () => dispatch({ type: 'CLEAR_EDITING' });
  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  // ---- Accounts ----
  async function createAccount(account) {
    try {
      const res = await axios.post('/api/v1/accounts', account);
      dispatch({ type: 'ADD_ACCOUNT', payload: res.data.data });
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error creating account' });
    }
  }

  // Cascade: the server also deletes the account's transactions.
  async function deleteAccount(id) {
    try {
      await axios.delete(`/api/v1/accounts/${id}`);
      dispatch({ type: 'DELETE_ACCOUNT', payload: id });
      await Promise.all([getTransactions(), getSummary()]);
    } catch (err) {
      dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.error || 'Error deleting account' });
    }
  }

  // Atomic transfer. On success the server has moved balances and written
  // both ledger rows inside one DB transaction — re-pull everything.
  async function transfer(payload) {
    try {
      await axios.post('/api/v1/accounts/transfer', payload);
      await Promise.all([getAccounts(), getTransactions(), getSummary()]);
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
        summary: state.summary,
        editing: state.editing,
        error: state.error,
        loading: state.loading,
        getTransactions,
        getAccounts,
        getSummary,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setEditing,
        clearEditing,
        clearError,
        createAccount,
        deleteAccount,
        transfer
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
