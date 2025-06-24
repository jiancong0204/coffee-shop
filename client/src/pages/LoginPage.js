import React, { useState, useEffect } from 'react';
import { Layout, Card, Form, Input, Button, Tabs, Typography, Space, Modal } from 'antd';
import { UserOutlined, LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, guestLogin, isLoggedIn, isAdmin } = useAuth();
  const [adminForm] = Form.useForm();
  const [guestForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isLoggedIn()) {
      if (isAdmin()) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isLoggedIn, isAdmin, navigate]);

  const handleAdminLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login(values);
      if (result.success) {
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        // 管理员登录失败时显示模态对话框
        setErrorMessage(result.error || '用户不存在或密码错误');
        setErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage('登录过程中发生错误');
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async (values) => {
    setLoading(true);
    try {
      const result = await guestLogin(values.username);
      if (result.success) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleErrorModalClose = () => {
    setErrorModalVisible(false);
    setErrorMessage('');
    // 清空管理员登录表单
    adminForm.resetFields();
  };

  const tabItems = [
    {
      key: 'guest',
      label: '顾客登录',
      children: (
        <Form
          form={guestForm}
          name="guest"
          onFinish={handleGuestLogin}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' },
              { max: 20, message: '用户名最多20个字符' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名"
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
            >
              开始点餐
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">
              输入您的昵称即可开始点餐，无需注册
            </Text>
          </div>
        </Form>
      )
    },
    {
      key: 'admin',
      label: '管理员登录',
      children: (
        <Form
          form={adminForm}
          name="admin"
          onFinish={handleAdminLogin}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入管理员用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="管理员用户名"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {/*<Text type="secondary">
              默认账号: admin123
            </Text>*/}
          </div>
        </Form>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '20px'
      }}>
        <Card 
          style={{ 
            width: '100%', 
            maxWidth: 400,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '48px', marginBottom: 8 }}>☕</div>
            <Title level={2} style={{ margin: 0, color: '#8B4513' }}>
              One Four O Three
            </Title>
            <Text type="secondary">欢迎来到1403咖啡店，请登录开始点单</Text>
          </div>

          <Tabs 
            defaultActiveKey="guest" 
            items={tabItems}
            size="large"
            centered
          />

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Space direction="vertical" size="small">
              <Button type="link" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </Space>
          </div>
        </Card>

        {/* 管理员登录失败错误对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <span>登录失败</span>
            </div>
          }
          open={errorModalVisible}
          onCancel={handleErrorModalClose}
          footer={[
            <Button key="confirm" type="primary" onClick={handleErrorModalClose}>
              确认
            </Button>
          ]}
          centered
          width={400}
          destroyOnHidden={false}
        >
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 16, margin: 0, color: '#666' }}>
              {errorMessage}
            </p>
            <p style={{ fontSize: 14, margin: '8px 0 0 0', color: '#999' }}>
              请检查用户名和密码后重试
            </p>
          </div>
        </Modal>
      </Content>
    </Layout>
  );
};

export default LoginPage; 