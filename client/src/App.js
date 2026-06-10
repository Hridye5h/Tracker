import React, { useContext } from 'react';
import { Header } from './components/Header';
import { Balance } from './components/Balance';
import { Accounts } from './components/Accounts';
import { AddTransaction } from './components/AddTransaction';
import { TransactionList } from './components/TransactionList';
import { CategoryBreakdown } from './components/CategoryBreakdown';
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
      <div className="shell">
        <Header />
        <main className="layout">
          <div className="col col-left">
            <Balance />
            <AddTransaction />
            <Accounts />
          </div>
          <div className="col col-right">
            <CategoryBreakdown />
            <TransactionList />
          </div>
        </main>
        <footer className="app-footer">
          Built with the MERN stack · JWT auth · atomic MongoDB transactions
        </footer>
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
