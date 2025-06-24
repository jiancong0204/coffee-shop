import React, { useState, useEffect } from 'react';
import { Layout, Button, Badge, Dropdown, Space, Avatar } from 'antd';
import { 
  ShoppingCartOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined,
  HistoryOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import api from '../services/api';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'account',
      label: '我的账户',
      icon: <UserOutlined />,
      onClick: () => navigate('/account')
    },
    {
      key: 'orders',
      label: '我的订单',
      icon: <HistoryOutlined />,
      onClick: () => navigate('/orders')
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  const adminMenuItems = [
    {
      key: 'admin',
      label: '管理后台',
      icon: <SettingOutlined />,
      onClick: () => navigate('/admin')
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: '64px'
    }}>
      <div 
        className="header-title"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
      >
        ☕ 1403
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        minWidth: 0, // 允许收缩
        flexShrink: 1 // 允许收缩
      }}>
        {isLoggedIn() ? (
          <>
            <Button 
              type="text" 
              icon={<MenuOutlined />}
              onClick={() => navigate('/')}
              style={{ fontSize: '18px' }}
            >
              菜单
            </Button>
            
            {!isAdmin() && (
              <Badge count={cartCount} size="small">
                <Button 
                  type="text" 
                  icon={<ShoppingCartOutlined />}
                  onClick={() => navigate('/cart')}
                  style={{ fontSize: '18px' }}
                >
                  购物车
                </Button>
              </Badge>
            )}
            
            <Dropdown
              menu={{ items: isAdmin() ? adminMenuItems : userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div style={{ 
                cursor: 'pointer', 
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}>
                <Avatar icon={<UserOutlined />} size="small" />
                {isAdmin() && (
                  <span style={{ 
                    color: '#1890ff', 
                    fontSize: '12px',
                    marginLeft: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    管理员
                  </span>
                )}
              </div>
            </Dropdown>
          </>
        ) : (
          <Button 
            type="primary" 
            onClick={() => navigate('/login')}
          >
            登录
          </Button>
        )}
      </div>
    </AntHeader>
  );
};

export default Header; 