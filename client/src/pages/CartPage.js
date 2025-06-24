import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, List, InputNumber, Typography, Space, Empty, message, Divider, Modal, Tag } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined, CheckCircleOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Content } = Layout;
const { Title, Text } = Typography;

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAdmin } = useAuth();
  const [cart, setCart] = useState({ items: [], totalAmount: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [newOrder, setNewOrder] = useState(null);
  const [highlightProductId, setHighlightProductId] = useState(null);

  useEffect(() => {
    if (!isLoggedIn() || isAdmin()) {
      navigate('/');
      return;
    }
    fetchCart();
    
    // 处理从主页跳转过来的高亮
    if (location.state?.highlightProductId) {
      setHighlightProductId(location.state.highlightProductId);
      // 3秒后取消高亮
      setTimeout(() => {
        setHighlightProductId(null);
      }, 3000);
    }
  }, [isLoggedIn, isAdmin, navigate, location.state]);

  const fetchCart = async () => {
    try {
      const response = await api.getCart();
      setCart(response.data);
    } catch (error) {
      message.error('获取购物车失败');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartId, quantity) => {
    try {
      await api.updateCartItem(cartId, quantity);
      fetchCart();
    } catch (error) {
      message.error('更新数量失败');
    }
  };

  const removeItem = async (cartId) => {
    try {
      await api.removeFromCart(cartId);
      message.success('商品已删除');
      fetchCart();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const checkout = async () => {
    if (cart.items.length === 0) {
      message.warning('购物车为空');
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await api.checkout();
      setNewOrder(response.data.order);
      setOrderSuccess(true);
      fetchCart(); // 刷新购物车
    } catch (error) {
      message.error('结账失败');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOrderModalClose = () => {
    setOrderSuccess(false);
    setNewOrder(null);
    navigate('/orders');
  };

  // 渲染细分选择信息
  const renderVariantSelections = (variantSelections) => {
    if (!variantSelections || Object.keys(variantSelections).length === 0) {
      return null;
    }

    return (
      <div style={{ marginTop: 8 }}>
        <Space wrap>
          {Object.values(variantSelections).map((selection, index) => (
            <Tag 
              key={index} 
              color="blue" 
              style={{ marginBottom: 4 }}
            >
              {selection.type_display_name}: {selection.option_display_name}
              {selection.price_adjustment !== 0 && (
                <Text style={{ marginLeft: 4, color: selection.price_adjustment > 0 ? '#f50' : '#52c41a' }}>
                  ({selection.price_adjustment > 0 ? '+' : ''}¥{selection.price_adjustment})
                </Text>
              )}
            </Tag>
          ))}
        </Space>
      </div>
    );
  };

  // 获取商品的完整描述（包含细分选择）
  const getItemDescription = (item) => {
    const baseDescription = item.description;
    const hasVariants = item.variant_selections && Object.keys(item.variant_selections).length > 0;
    
    if (!hasVariants) {
      return baseDescription;
    }

    const variantText = Object.values(item.variant_selections)
      .map(selection => `${selection.type_display_name}: ${selection.option_display_name}`)
      .join(', ');
    
    return (
      <div>
        <div>{baseDescription}</div>
        <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
          {variantText}
        </div>
      </div>
    );
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
            <ShoppingCartOutlined /> 购物车
          </Title>

          {cart.items.length === 0 ? (
            <Card>
              <Empty
                description="购物车为空"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/')}>
                  去购物
                </Button>
              </Empty>
            </Card>
          ) : (
            <Card>
              <List
                dataSource={cart.items}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      backgroundColor: highlightProductId === item.product_id ? '#e6f7ff' : 'transparent',
                      transition: 'background-color 0.3s ease',
                      borderRadius: highlightProductId === item.product_id ? '8px' : '0',
                      border: highlightProductId === item.product_id ? '2px solid #1890ff' : 'none',
                      margin: highlightProductId === item.product_id ? '4px 0' : '0',
                      padding: highlightProductId === item.product_id ? '12px' : '16px'
                    }}
                    actions={[
                      <Space>
                        <Space.Compact>
                          <Button
                            icon={<MinusOutlined />}
                            size="small"
                            onClick={() => updateQuantity(item.cart_id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          />
                          <Button size="small" style={{ minWidth: '40px' }}>
                            {item.quantity}
                          </Button>
                          <Button
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => updateQuantity(item.cart_id, Math.min(99, item.quantity + 1))}
                            disabled={item.quantity >= 99}
                          />
                        </Space.Compact>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.cart_id)}
                        />
                      </Space>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <img
                          src={item.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPuWVhuWTgeWbvueJhzwvdGV4dD4KPC9zdmc+Cg=='}
                          alt={item.name}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                        />
                      }
                      title={
                        <div>
                          <div>{item.name}</div>
                          {renderVariantSelections(item.variant_selections)}
                        </div>
                      }
                      description={item.description}
                    />
                    <div style={{ textAlign: 'right' }}>
                      <Text strong style={{ fontSize: '16px' }}>
                        ¥{item.total_price.toFixed(2)}
                      </Text>
                      <br />
                      <Text type="secondary">
                        ¥{item.adjusted_price ? item.adjusted_price.toFixed(2) : item.price.toFixed(2)} × {item.quantity}
                      </Text>
                      {item.adjusted_price && item.adjusted_price !== item.price && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>
                          原价: ¥{item.price.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />

              <Divider />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Button onClick={() => navigate('/')}>
                    继续购物
                  </Button>
                  <Button danger onClick={() => api.clearCart().then(fetchCart)}>
                    清空购物车
                  </Button>
                </Space>
                
                <Space size="large">
                  <Text strong style={{ fontSize: '18px' }}>
                    总计: ¥{cart.totalAmount.toFixed(2)}
                  </Text>
                  <Button
                    type="primary"
                    size="large"
                    loading={checkoutLoading}
                    onClick={checkout}
                  >
                    结账
                  </Button>
                </Space>
              </div>
            </Card>
          )}

          {/* 订单成功模态框 */}
          <Modal
            title={
              <div style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '32px', marginBottom: '16px' }} />
                <div>订单创建成功！</div>
              </div>
            }
            open={orderSuccess}
            onCancel={handleOrderModalClose}
            footer={
              <div style={{ textAlign: 'center' }}>
                <Button type="primary" size="large" onClick={handleOrderModalClose}>
                  查看我的订单
                </Button>
              </div>
            }
            width={500}
            centered
          >
            {newOrder && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ marginBottom: '20px' }}>
                  <Text type="secondary">您的取单号是</Text>
                </div>
                <div style={{ 
                  fontSize: '48px', 
                  fontWeight: 'bold', 
                  color: '#1890ff',
                  marginBottom: '20px',
                  fontFamily: 'monospace'
                }}>
                  {newOrder.pickup_number}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>订单号: #{newOrder.id}</Text>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>订单金额: ¥{newOrder.total_amount}</Text>
                </div>
                <div style={{ backgroundColor: '#f6ffed', padding: '16px', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
                  <Text type="secondary">
                    请记住您的取单号，制作完成后请凭此号码取餐
                  </Text>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};

export default CartPage; 