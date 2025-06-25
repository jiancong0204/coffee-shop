import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, List, InputNumber, Typography, Space, Empty, message, Divider, Modal, Tag, Input, Checkbox } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined, CheckCircleOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import api from '../services/api';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAdmin } = useAuth();
  const { cartItems, cartCount, loading, updating, updateCartItem, removeFromCart, fetchCart, clearCart } = useCart();
  const [cart, setCart] = useState({ items: [], totalAmount: 0, itemCount: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [newOrder, setNewOrder] = useState(null);
  const [highlightProductId, setHighlightProductId] = useState(null);
  const [orderNotes, setOrderNotes] = useState(''); // 订单备注
  const [selectedItems, setSelectedItems] = useState(new Set()); // 选中的商品
  const [confirmModalVisible, setConfirmModalVisible] = useState(false); // 订单确认模态框
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false); // 是否已从localStorage加载
  
  // 检测屏幕尺寸
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoggedIn() || isAdmin()) {
      navigate('/');
      return;
    }
    fetchCartData();
    
    // 处理从主页跳转过来的高亮
    if (location.state?.highlightProductId) {
      setHighlightProductId(location.state.highlightProductId);
      // 3秒后取消高亮
      setTimeout(() => {
        setHighlightProductId(null);
      }, 3000);
    }
  }, [isLoggedIn, isAdmin, navigate, location.state]);

  // 当CartContext中的数据变化时，同步更新本地状态
  useEffect(() => {
    fetchCartData();
  }, [cartItems]);

  // 从localStorage加载选择状态
  useEffect(() => {
    if (cartItems.length > 0 && !hasLoadedFromStorage) {
      try {
        const savedSelectedItems = localStorage.getItem('cart_selected_items');
        if (savedSelectedItems) {
          const savedSet = new Set(JSON.parse(savedSelectedItems));
          // 只保留仍然存在于购物车中的商品
          const currentCartIds = new Set(cartItems.map(item => item.cart_id));
          const validSelectedItems = new Set([...savedSet].filter(id => currentCartIds.has(id)));
          setSelectedItems(validSelectedItems);
        } else {
          // 如果没有保存的状态，默认全选（仅首次）
          setSelectedItems(new Set(cartItems.map(item => item.cart_id)));
        }
      } catch (error) {
        console.error('加载购物车选择状态失败:', error);
        // 如果加载失败，默认全选
        setSelectedItems(new Set(cartItems.map(item => item.cart_id)));
      }
      setHasLoadedFromStorage(true);
    } else if (cartItems.length > 0 && hasLoadedFromStorage) {
      // 如果购物车更新了，需要清理不存在的商品ID
      const currentCartIds = new Set(cartItems.map(item => item.cart_id));
      const validSelectedItems = new Set([...selectedItems].filter(id => currentCartIds.has(id)));
      if (validSelectedItems.size !== selectedItems.size) {
        setSelectedItems(validSelectedItems);
        // 保存更新后的选择状态
        localStorage.setItem('cart_selected_items', JSON.stringify([...validSelectedItems]));
      }
    } else if (cartItems.length === 0) {
      // 如果购物车为空，清空选择状态
      setSelectedItems(new Set());
      localStorage.removeItem('cart_selected_items');
      setHasLoadedFromStorage(false);
    }
  }, [cartItems, hasLoadedFromStorage, selectedItems]);

  const fetchCartData = async () => {
    try {
      const response = await api.getCart();
      setCart(response.data);
    } catch (error) {
      message.error('获取购物车失败');
    } finally {
      setInitialLoading(false);
    }
  };

  const updateQuantity = async (cartId, quantity) => {
    const result = await updateCartItem(cartId, quantity);
    if (!result.success) {
      message.error(result.error || '更新数量失败');
    }
    // 购物车数据已通过乐观更新处理，无需手动刷新
  };

  const removeItem = async (cartId) => {
    const result = await removeFromCart(cartId);
    if (result.success) {
      message.success('商品已删除');
    } else {
      message.error(result.error || '删除失败');
    }
    // 购物车数据已通过乐观更新处理，无需手动刷新
  };

  // 处理商品选择
  const handleItemSelect = (cartId, checked) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(cartId);
    } else {
      newSelected.delete(cartId);
    }
    setSelectedItems(newSelected);
    // 保存到localStorage
    localStorage.setItem('cart_selected_items', JSON.stringify([...newSelected]));
  };

  // 全选/取消全选
  const handleSelectAll = (checked) => {
    const newSelected = checked ? new Set(cartItems.map(item => item.cart_id)) : new Set();
    setSelectedItems(newSelected);
    // 保存到localStorage
    localStorage.setItem('cart_selected_items', JSON.stringify([...newSelected]));
  };

  // 获取选中的商品
  const getSelectedCartItems = () => {
    return cartItems.filter(item => selectedItems.has(item.cart_id));
  };

  // 计算选中商品的总价
  const getSelectedTotal = () => {
    return getSelectedCartItems().reduce((total, item) => total + item.total_price, 0);
  };

  // 计算选中商品的总数量（所有规格数量的总和）
  const getSelectedTotalQuantity = () => {
    return getSelectedCartItems().reduce((total, item) => total + item.quantity, 0);
  };

  // 显示订单确认模态框
  const showConfirmModal = () => {
    const selectedCartItems = getSelectedCartItems();
    if (selectedCartItems.length === 0) {
      message.warning('请选择要结账的商品');
      return;
    }
    setConfirmModalVisible(true);
  };

  const checkout = async () => {
    const selectedCartItems = getSelectedCartItems();
    if (selectedCartItems.length === 0) {
      message.warning('请选择要结账的商品');
      return;
    }

    setCheckoutLoading(true);
    try {
      const selectedCartIds = selectedCartItems.map(item => item.cart_id);
      const response = await api.checkout(orderNotes, selectedCartIds);
      setNewOrder(response.data.order);
      setOrderSuccess(true);
      setOrderNotes(''); // 清空备注
      setConfirmModalVisible(false); // 关闭确认模态框
      
      // 清理已结账商品的选择状态
      const remainingSelected = new Set([...selectedItems].filter(id => !selectedCartIds.includes(id)));
      setSelectedItems(remainingSelected);
      localStorage.setItem('cart_selected_items', JSON.stringify([...remainingSelected]));
      
      fetchCart(); // 刷新购物车上下文
      fetchCartData(); // 刷新本地购物车数据
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
      <div style={{ marginTop: 8, marginBottom: isMobile ? 8 : 0 }}>
        <Space wrap size={[4, 4]}>
          {Object.values(variantSelections).map((selection, index) => (
            <Tag 
              key={index} 
              color="blue" 
              style={{ 
                marginBottom: 4,
                fontSize: isMobile ? '11px' : '12px',
                padding: isMobile ? '2px 6px' : '4px 8px',
                lineHeight: isMobile ? '16px' : '20px'
              }}
            >
              {selection.type_display_name}: {selection.option_display_name}
              {selection.price_adjustment !== 0 && (
                <Text style={{ 
                  marginLeft: 4, 
                  color: selection.price_adjustment > 0 ? '#f50' : '#52c41a',
                  fontSize: isMobile ? '10px' : '12px'
                }}>
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

  if (initialLoading) {
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
      <Content style={{ padding: isMobile ? '12px 0' : '24px 0' }}>
        <div className="container">
          <Title level={2} style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? '20px' : '28px' }}>
            <ShoppingCartOutlined /> 购物车
          </Title>

          {cartItems.length === 0 ? (
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
              {/* 全选控制 */}
              <div style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Checkbox
                  checked={cartItems.length > 0 && selectedItems.size === cartItems.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < cartItems.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  <Text strong>全选 ({selectedItems.size}/{cartItems.length})</Text>
                </Checkbox>
                {selectedItems.size > 0 && (
                  <Text type="secondary" style={{ marginLeft: 16 }}>
                    已选商品总计: ¥{getSelectedTotal().toFixed(2)}
                  </Text>
                )}
              </div>

              <List
                dataSource={cartItems}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      backgroundColor: highlightProductId === item.product_id ? '#e6f7ff' : 'transparent',
                      transition: 'background-color 0.3s ease',
                      borderRadius: highlightProductId === item.product_id ? '8px' : '0',
                      border: highlightProductId === item.product_id ? '2px solid #1890ff' : 'none',
                      margin: highlightProductId === item.product_id ? '4px 0' : '0',
                      padding: highlightProductId === item.product_id ? '12px' : (isMobile ? '12px 8px' : '16px'),
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'flex-start'
                    }}
                    actions={isMobile ? [] : [
                      <Space key="actions">
                        <Space.Compact>
                          <Button
                            icon={<MinusOutlined />}
                            size="small"
                            onClick={() => updateQuantity(item.cart_id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1 || updating}
                            loading={updating}
                          />
                          <Button size="small" style={{ minWidth: '40px' }}>
                            {item.quantity}
                          </Button>
                          <Button
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => updateQuantity(item.cart_id, Math.min(99, item.quantity + 1))}
                            disabled={item.quantity >= 99 || updating}
                            loading={updating}
                          />
                        </Space.Compact>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.cart_id)}
                          disabled={updating}
                          loading={updating}
                        />
                      </Space>
                    ]}
                  >
                    <div style={{ 
                      display: 'flex', 
                      width: '100%',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 12 : 16
                    }}>
                      {/* 选择框 */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        paddingTop: isMobile ? 0 : 8
                      }}>
                        <Checkbox
                          checked={selectedItems.has(item.cart_id)}
                          onChange={(e) => handleItemSelect(item.cart_id, e.target.checked)}
                        />
                      </div>

                      {/* 商品信息区域 */}
                      <div style={{ 
                        display: 'flex', 
                        flex: 1,
                        gap: 12,
                        flexDirection: isMobile ? 'row' : 'row'
                      }}>
                        <img
                          src={item.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPuWVhuWTgeWbvueJhzwvdGV4dD4KPC9zdmc+Cg=='}
                          alt={item.name}
                          style={{ 
                            width: isMobile ? 60 : 64, 
                            height: isMobile ? 60 : 64, 
                            objectFit: 'cover', 
                            borderRadius: 8,
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: isMobile ? '16px' : '16px',
                            fontWeight: 500,
                            marginBottom: 4,
                            lineHeight: '1.4'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ 
                            fontSize: isMobile ? '13px' : '14px',
                            color: '#666',
                            marginBottom: 4,
                            lineHeight: '1.4'
                          }}>
                            {item.description}
                          </div>
                          {renderVariantSelections(item.variant_selections)}
                        </div>
                      </div>

                      {/* 价格和操作区域 */}
                      <div style={{ 
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        alignItems: isMobile ? 'center' : 'flex-end',
                        justifyContent: isMobile ? 'space-between' : 'flex-start',
                        gap: isMobile ? 12 : 8,
                        minWidth: isMobile ? 'auto' : 120
                      }}>
                        {/* 价格信息 */}
                        <div style={{ 
                          textAlign: isMobile ? 'left' : 'right',
                          flexShrink: 0
                        }}>
                          <Text strong style={{ fontSize: isMobile ? '16px' : '16px' }}>
                            ¥{item.total_price.toFixed(2)}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '13px' }}>
                            ¥{item.adjusted_price ? item.adjusted_price.toFixed(2) : item.price.toFixed(2)} × {item.quantity}
                          </Text>
                          {item.adjusted_price && item.adjusted_price !== item.price && (
                            <div style={{ fontSize: '11px', color: '#999', marginTop: 2 }}>
                              原价: ¥{item.price.toFixed(2)}
                            </div>
                          )}
                        </div>

                        {/* 移动端操作按钮 */}
                        {isMobile && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Space.Compact>
                              <Button
                                icon={<MinusOutlined />}
                                size="small"
                                onClick={() => updateQuantity(item.cart_id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1 || updating}
                                loading={updating}
                              />
                              <Button size="small" style={{ minWidth: '36px' }}>
                                {item.quantity}
                              </Button>
                              <Button
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => updateQuantity(item.cart_id, Math.min(99, item.quantity + 1))}
                                disabled={item.quantity >= 99 || updating}
                                loading={updating}
                              />
                            </Space.Compact>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              onClick={() => removeItem(item.cart_id)}
                              disabled={updating}
                              loading={updating}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </List.Item>
                )}
              />

              <Divider />

              {/* 底部操作区域 - 响应式布局 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 16 : 0
              }}>
                {/* 左侧按钮组 */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 8 : 12,
                  order: isMobile ? 2 : 1
                }}>
                  <Button 
                    onClick={() => navigate('/')}
                    style={{ flex: isMobile ? 1 : 'none' }}
                  >
                    继续购物
                  </Button>
                  <Button 
                    danger 
                    disabled={updating}
                    loading={updating}
                    onClick={async () => {
                      const result = await clearCart();
                      if (result.success) {
                        message.success('购物车已清空');
                      } else {
                        message.error(result.error || '清空购物车失败');
                      }
                    }}
                    style={{ flex: isMobile ? 1 : 'none' }}
                  >
                    清空购物车
                  </Button>
                </div>
                
                {/* 右侧总计和结账 */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 12 : 16,
                  order: isMobile ? 1 : 2
                }}>
                  <Text strong style={{ 
                    fontSize: isMobile ? '18px' : '18px',
                    textAlign: isMobile ? 'center' : 'right',
                    padding: isMobile ? '8px 0' : '0'
                  }}>
                    已选商品: ¥{getSelectedTotal().toFixed(2)}
                  </Text>
                  <Button
                    type="primary"
                    size={isMobile ? 'large' : 'large'}
                    disabled={selectedItems.size === 0}
                    onClick={showConfirmModal}
                    style={{ 
                      minWidth: isMobile ? 'auto' : '80px',
                      height: isMobile ? '44px' : 'auto'
                    }}
                  >
                    结账 ({getSelectedTotalQuantity()})
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 订单确认模态框 */}
          <Modal
            title="确认订单"
            open={confirmModalVisible}
            onCancel={() => setConfirmModalVisible(false)}
            footer={null}
            width={isMobile ? '95%' : 600}
            centered
          >
            <div>
              {/* 订单商品列表 */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ fontSize: '16px', marginBottom: 12, display: 'block' }}>
                  订单商品
                </Text>
                <List
                  dataSource={getSelectedCartItems()}
                  size="small"
                  renderItem={(item) => (
                    <List.Item style={{ padding: '8px 0' }}>
                      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12 }}>
                        <img
                          src={item.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPuWVhuWTgeWbvueJhzwvdGV4dD4KPC9zdmc+Cg=='}
                          alt={item.name}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            ¥{item.adjusted_price ? item.adjusted_price.toFixed(2) : item.price.toFixed(2)} × {item.quantity}
                          </div>
                          {item.variant_selections && Object.keys(item.variant_selections).length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <Space wrap size={[4, 4]}>
                                {Object.values(item.variant_selections).map((selection, index) => (
                                  <Tag key={index} color="blue" size="small">
                                    {selection.type_display_name}: {selection.option_display_name}
                                  </Tag>
                                ))}
                              </Space>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <Text strong>¥{item.total_price.toFixed(2)}</Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </div>

              {/* 订单备注 */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>订单备注（可选）</Text>
                <TextArea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="请输入订单备注，如特殊要求等（100字以内）"
                  maxLength={100}
                  showCount
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* 订单总计 */}
              <div style={{ 
                padding: 16, 
                backgroundColor: '#f6ffed', 
                borderRadius: 8, 
                border: '1px solid #b7eb8f',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text>商品总计:</Text>
                  <Text>¥{getSelectedTotal().toFixed(2)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: '16px' }}>应付金额:</Text>
                  <Text strong style={{ fontSize: '18px', color: '#f50' }}>¥{getSelectedTotal().toFixed(2)}</Text>
                </div>
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button 
                  size="large" 
                  onClick={() => setConfirmModalVisible(false)}
                >
                  返回修改
                </Button>
                <Button 
                  type="primary" 
                  size="large"
                  loading={checkoutLoading}
                  onClick={checkout}
                >
                  确认支付
                </Button>
              </div>
            </div>
          </Modal>

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