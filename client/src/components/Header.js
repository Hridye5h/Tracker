import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthState';

export const Header = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">₹</span>
        <span className="brand-name">Expense Tracker</span>
      </div>
      <div className="header-right">
        {user && <span className="greeting">Hi, {user.name.split(' ')[0]}</span>}
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </header>
  );
};
