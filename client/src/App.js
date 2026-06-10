import React, { useContext } from 'react';
import { Header } from './components/Header';
import { Balance } from './components/Balance';
import { IncomeExpenses } from './components/IncomeExpenses';
import { Accounts } from './components/Accounts';
import { TransactionList } from './components/TransactionList';
import { AddTransaction } from './components/AddTransaction';
import { Auth } from './components/Auth';

import { AuthProvider, AuthContext } from './context/AuthState';
import { GlobalProvider } from './context/GlobalState';

import './App.css';

// Shows the auth screen until logged in, then the tracker dashboard.
const Dashboard = () => {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return <Auth />;

  return (
    <GlobalProvider>
      <Header />
      <div className="container">
        <Balance />
        <IncomeExpenses />
        <Accounts />
        <TransactionList />
        <AddTransaction />
      </div>
    </GlobalProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;
