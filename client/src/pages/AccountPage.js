import React, { useEffect, useState } from 'react';
import { Layout, Card, Typography, Avatar, Space, Button, Divider, Row, Col, Modal, Form, Input, message, Statistic } from 'antd';
import { UserOutlined, HistoryOutlined, LogoutOutlined, EditOutlined, TrophyOutlined, DollarOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Content } = Layout;
const { Title, Text } = Typography;

const AccountPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, user, logout, updateUser } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editUsernameVisible, setEditUsernameVisible] = useState(false);
  const [usernameForm] = Form.useForm();
  const [usernameLoading, setUsernameLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn() || isAdmin()) {
      navigate('/');
      return;
    }
    
    fetchUserStats();
  }, [isLoggedIn, isAdmin, navigate]);

  const fetchUserStats = async () => {
    try {
      setStatsLoading(true);
      const response = await api.getUserStats();
      setUserStats(response.data.data);
    } catch (error) {
      console.error('获取用户统计信息失败:', error);
      message.error('获取统计信息失败');
    } finally {
      setStatsLoading(false);
    }
  };

  const showEditUsernameModal = () => {
    setEditUsernameVisible(true);
    usernameForm.setFieldsValue({
      username: user.username
    });
  };

  const handleUsernameSubmit = async (values) => {
    try {
      setUsernameLoading(true);
      const response = await api.updateMyUsername(values.username);
      message.success(response.data.message || '用户名修改成功');
      
      // 更新AuthContext中的用户信息
      updateUser({ ...user, username: values.username });
      
      setEditUsernameVisible(false);
      usernameForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.error || '修改用户名失败');
    } finally {
      setUsernameLoading(false);
    }
  };

  const cancelEditUsername = () => {
    setEditUsernameVisible(false);
    usernameForm.resetFields();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '24px 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              加载中...
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2}>
              <UserOutlined /> 我的账户
            </Title>
          </div>

          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={20} md={16} lg={12}>
              {/* 用户信息卡片 */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <Avatar 
                    size={80} 
                    icon={<UserOutlined />} 
                    style={{ 
                      backgroundColor: '#1890ff',
                      marginBottom: 16
                    }} 
                  />
                  <div>
                    <Title level={3} style={{ marginBottom: 8 }}>
                      {user.username}
                    </Title>
                    <Text type="secondary">用户ID: {user.id}</Text>
                  </div>
                </div>

                <Divider />

                <div style={{ marginBottom: 16 }}>
                  <Row>
                    <Col span={8}>
                      <Text strong>用户名：</Text>
                    </Col>
                    <Col span={12}>
                      <Text>{user.username}</Text>
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={showEditUsernameModal}
                      >
                        修改
                      </Button>
                    </Col>
                  </Row>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Row>
                    <Col span={8}>
                      <Text strong>注册时间：</Text>
                    </Col>
                    <Col span={16}>
                      <Text>
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleString('zh-CN')
                          : '暂无记录'
                        }
                      </Text>
                    </Col>
                  </Row>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Row>
                    <Col span={8}>
                      <Text strong>账户状态：</Text>
                    </Col>
                    <Col span={16}>
                      <Text style={{ color: '#52c41a' }}>正常</Text>
                    </Col>
                  </Row>
                </div>
              </Card>

              {/* 统计信息卡片 */}
              <Card title="消费统计" style={{ marginBottom: 16 }} loading={statsLoading}>
                {userStats && (
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="已完成订单"
                        value={userStats.completed_orders}
                        prefix={<TrophyOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                        suffix="个"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="消费总额"
                        value={userStats.total_spent}
                        prefix={<DollarOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                        precision={2}
                        suffix="元"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="平均订单价格"
                        value={userStats.average_amount}
                        prefix={<BarChartOutlined />}
                        valueStyle={{ color: '#722ed1' }}
                        precision={2}
                        suffix="元"
                      />
                    </Col>
                  </Row>
                )}
              </Card>

              {/* 功能操作卡片 */}
              <Card title="账户操作">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<HistoryOutlined />}
                    size="large"
                    block
                    onClick={() => navigate('/orders')}
                  >
                    查看我的订单
                  </Button>
                  
                  <Button 
                    danger
                    icon={<LogoutOutlined />}
                    size="large"
                    block
                    onClick={handleLogout}
                  >
                    退出登录
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* 修改用户名模态框 */}
          <Modal
            title="修改用户名"
            open={editUsernameVisible}
            onCancel={cancelEditUsername}
            footer={null}
          >
            <Form
              form={usernameForm}
              layout="vertical"
              onFinish={handleUsernameSubmit}
            >
              <Form.Item
                label="新用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入新用户名' },
                  { min: 2, max: 20, message: '用户名长度必须在2-20个字符之间' },
                  { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/, message: '用户名只能包含字母、数字、中文、下划线和连字符' }
                ]}
              >
                <Input placeholder="请输入新用户名" />
              </Form.Item>
              
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={cancelEditUsername}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={usernameLoading}
                  >
                    确认修改
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};

export default AccountPage; 