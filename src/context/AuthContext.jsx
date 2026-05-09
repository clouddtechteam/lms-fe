import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('lms_token') || null,
  role: localStorage.getItem('lms_role') || null,
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('lms_token', action.payload.token);
      localStorage.setItem('lms_role', action.payload.user.role);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.user.role,
        loading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        role: action.payload.role,
        loading: false,
      };
    case 'LOGOUT':
      localStorage.removeItem('lms_token');
      localStorage.removeItem('lms_role');
      return { user: null, token: null, role: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      if (state.token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
          });
          if (res.ok) {
            const data = await res.json();
            dispatch({ type: 'SET_USER', payload: data });
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        } catch (err) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initAuth();
  }, []);

  const login = (data) => dispatch({ type: 'LOGIN', payload: data });
  const logout = () => dispatch({ type: 'LOGOUT' });

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {!state.loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
