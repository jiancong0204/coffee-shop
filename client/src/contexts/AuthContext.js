import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
      // 可以在这里验证token有效性
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      api.setAuthToken(newToken);
      
      message.success('登录成功');
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '用户不存在或密码错误';
      // 不再在这里显示message，由调用方决定如何处理错误
      return { success: false, error: errorMessage };
    }
  };

  const guestLogin = async (username) => {
    try {
      const response = await api.post('/auth/guest-login', { username });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      api.setAuthToken(newToken);
      
      message.success(`欢迎，${username}！`);
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '登录失败';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.setAuthToken(null);
    message.success('已退出登录');
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isLoggedIn = () => {
    return !!user;
  };

  const value = {
    user,
    token,
    loading,
    login,
    guestLogin,
    logout,
    isAdmin,
    isLoggedIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 