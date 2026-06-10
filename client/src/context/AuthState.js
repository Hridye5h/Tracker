import React, { createContext, useReducer } from 'react';
import axios from 'axios';
import setAuthToken from '../utils/setAuthToken';

// Set the auth header at module load — before any component renders or fetches —
// so a page refresh with a saved token never races the first API call.
const savedToken = localStorage.getItem('token');
if (savedToken) setAuthToken(savedToken);

const initialState = {
  token: savedToken,
  isAuthenticated: !!savedToken,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  error: null
};

export const AuthContext = createContext(initialState);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      setAuthToken(action.payload.token);
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        error: null
      };
    case 'AUTH_ERROR':
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuthToken(null);
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        error: action.payload || null
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  async function register(form) {
    try {
      const res = await axios.post('/api/v1/auth/register', form);
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data });
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR', payload: err.response?.data?.error || 'Registration failed' });
    }
  }

  async function login(form) {
    try {
      const res = await axios.post('/api/v1/auth/login', form);
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data });
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR', payload: err.response?.data?.error || 'Login failed' });
    }
  }

  const logout = () => dispatch({ type: 'LOGOUT' });
  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        error: state.error,
        register,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
