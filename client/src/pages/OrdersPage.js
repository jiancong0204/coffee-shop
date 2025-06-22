import React, { useState, useEffect } from 'react';
import { Layout, Card, List, Typography, Tag, Empty, message } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Content } = Layout;
const { Title, Text } = Typography;

const OrdersPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn() || isAdmin()) {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [isLoggedIn, isAdmin, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await api.getMyOrders();
      setOrders(response.data);
    } catch (error) {
      message.error('获取订单失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'orange', text: '待处理' },
      'preparing': { color: 'blue', text: '制作中' },
      'ready': { color: 'green', text: '已完成' },
      'completed': { color: 'gray', text: '已取餐' },
      'cancelled': { color: 'red', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
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
          <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
            <HistoryOutlined /> 我的订单
          </Title>

          {orders.length === 0 ? (
            <Card>
              <Empty
                description="暂无订单"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          ) : (
            <List
              dataSource={orders}
              renderItem={(order) => (
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <Text strong>订单 #{order.id}</Text>
                      {order.pickup_number && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>取单号: </Text>
                          <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>{order.pickup_number}</Text>
                        </div>
                      )}
                    </div>
                    {getStatusTag(order.status)}
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">下单时间: {formatDate(order.created_at)}</Text>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">共 {order.item_count} 件商品</Text>
                    <Text strong style={{ fontSize: '16px', color: '#ff4d4f' }}>
                      ¥{order.total_amount}
                    </Text>
                  </div>
                </Card>
              )}
            />
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default OrdersPage; 