import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthState';

export const Header = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      <h2>Expense Tracker</h2>
      <div className="header-right">
        {user && <span className="greeting">Hi, {user.name}</span>}
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </header>
  );
};
