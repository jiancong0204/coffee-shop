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
import api from '../services/api';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  // 获取购物车数量
  const fetchCartCount = async () => {
    if (isLoggedIn() && !isAdmin()) {
      try {
        const response = await api.getCart();
        setCartCount(response.data.itemCount || 0);
      } catch (error) {
        console.error('获取购物车失败:', error);
      }
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userMenuItems = [
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
      padding: '0 16px',
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

      <Space size="large">
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
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} size="small" />
                <span>{user?.username}</span>
                {isAdmin() && <span style={{ color: '#1890ff' }}>(管理员)</span>}
              </Space>
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
      </Space>
    </AntHeader>
  );
};

export default Header; 