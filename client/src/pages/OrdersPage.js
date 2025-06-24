import React, { useState, useEffect } from 'react';
import { Layout, Card, List, Typography, Tag, Empty, message, Button, Popconfirm, Space } from 'antd';
import { HistoryOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
      'pending': { color: 'orange', text: '待接单' },
      'preparing': { color: 'blue', text: '制作中' },
      'ready': { color: 'green', text: '待取餐' },
      'completed': { color: 'gray', text: '已完成' },
      'cancelled': { color: 'red', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await api.cancelOrder(orderId);
      message.success('订单已取消');
      // 重新获取订单列表
      fetchOrders();
    } catch (error) {
      message.error(error.response?.data?.error || '取消订单失败');
    }
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
                  
                  {/* 商品详情显示 */}
                  {order.items && order.items.length > 0 && (
                    <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                      <Text strong style={{ fontSize: '13px', color: '#666' }}>商品详情：</Text>
                      <div style={{ marginTop: 8 }}>
                        {order.items.map((item, index) => (
                          <div key={index} style={{ marginBottom: index < order.items.length - 1 ? 8 : 0 }}>
                            <Text strong style={{ fontSize: '12px' }}>{item.name}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}> x{item.quantity}</Text>
                            {item.variant_selections && item.variant_selections.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                {item.variant_selections.map((selection, selIndex) => (
                                  <Tag key={selIndex} size="small" color="blue" style={{ margin: '0 4px 2px 0', fontSize: '10px' }}>
                                    {selection.type_display_name}: {selection.option_display_name}
                                  </Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">共 {order.item_count} 件商品</Text>
                    <Space>
                      <Text strong style={{ fontSize: '16px', color: '#ff4d4f' }}>
                        ¥{order.total_amount}
                      </Text>
                      {order.status === 'pending' && (
                        <Popconfirm
                          title="确定要取消这个订单吗？"
                          description="取消后商品库存将自动恢复"
                          onConfirm={() => handleCancelOrder(order.id)}
                          okText="确定取消"
                          cancelText="不取消"
                        >
                          <Button 
                            danger 
                            size="small" 
                            icon={<CloseCircleOutlined />}
                          >
                            取消订单
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
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