import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, List, Typography, Space, Empty, message, Tag, Modal, Image } from 'antd';
import { CalendarOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;
const { confirm } = Modal;

const ReservationsPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(null);

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
    fetchReservations();
  }, [isLoggedIn, isAdmin, navigate]);

  const fetchReservations = async () => {
    console.log('开始获取预定列表...');
    console.log('当前用户:', { isLoggedIn: isLoggedIn(), isAdmin: isAdmin() });
    
    try {
      const response = await api.getMyReservations();
      console.log('API响应:', response);
      
      // 直接使用 response.data.data，因为后端返回 { data: [...] }
      const reservationsData = response.data.data;
      console.log('预定数据:', reservationsData);
      console.log('是否为数组:', Array.isArray(reservationsData));
      
      if (Array.isArray(reservationsData)) {
        setReservations(reservationsData);
        console.log('设置预定数据成功，数量:', reservationsData.length);
      } else {
        console.error('预定数据不是数组格式:', reservationsData);
        setReservations([]);
      }
    } catch (error) {
      console.error('获取预定列表失败:', error);
      console.error('错误详情:', error.response?.data);
      message.error('获取预定列表失败');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = (reservation) => {
    confirm({
      title: '确认取消预定',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要取消以下预定吗？</p>
          <p><strong>{reservation.product_name}</strong></p>
          <p>预定日期: {dayjs(reservation.reservation_date).format('YYYY年MM月DD日')}</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            取消后无法恢复，请谨慎操作。
          </p>
        </div>
      ),
      okText: '确认取消',
      okType: 'danger',
      cancelText: '保留预定',
      onOk: async () => {
        setCancelLoading(reservation.id);
        try {
          await api.cancelReservation(reservation.id);
          message.success('预定已取消');
          fetchReservations(); // 刷新列表
        } catch (error) {
          message.error(error.response?.data?.error || '取消预定失败');
        } finally {
          setCancelLoading(null);
        }
      }
    });
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      'pending': { color: 'orange', text: '待处理' },
      'confirmed': { color: 'green', text: '已转订单' },
      'cancelled': { color: 'red', text: '已取消' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const renderVariantSelections = (variantSelections) => {
    // 更严格的类型检查
    if (!variantSelections || 
        typeof variantSelections !== 'object' || 
        Array.isArray(variantSelections) ||
        Object.keys(variantSelections).length === 0) {
      return null;
    }

    try {
      return (
        <div style={{ marginTop: 8 }}>
          <Space wrap size={[4, 4]}>
            {Object.values(variantSelections).map((selection, index) => (
              <Tag 
                key={index} 
                color="blue" 
                size="small"
                style={{ 
                  fontSize: isMobile ? '10px' : '11px',
                  padding: isMobile ? '1px 4px' : '2px 6px'
                }}
              >
                {selection?.type_display_name}: {selection?.option_display_name}
                {selection?.price_adjustment !== 0 && (
                  <Text style={{ 
                    marginLeft: 4, 
                    color: selection.price_adjustment > 0 ? '#f50' : '#52c41a',
                    fontSize: isMobile ? '9px' : '10px'
                  }}>
                    ({selection.price_adjustment > 0 ? '+' : ''}¥{selection.price_adjustment})
                  </Text>
                )}
              </Tag>
            ))}
          </Space>
        </div>
      );
    } catch (error) {
      console.error('Error rendering variant selections:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: isMobile ? '12px 0' : '24px 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: isMobile ? '30px 0' : '50px 0' }}>
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
          <Title level={2} style={{ 
            textAlign: 'center', 
            marginBottom: isMobile ? 16 : 24,
            fontSize: isMobile ? '20px' : '28px'
          }}>
            <CalendarOutlined /> 我的预定
          </Title>

          {reservations.length === 0 ? (
            <Card>
              <Empty
                description="暂无预定"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/')}>
                  去预定商品
                </Button>
              </Empty>
            </Card>
          ) : (
            <Card>
              <List
                dataSource={reservations}
                renderItem={(reservation) => (
                  <List.Item
                    style={{
                      padding: isMobile ? '12px 8px' : '16px',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                    actions={reservation.status === 'pending' && !isMobile ? [
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleCancelReservation(reservation)}
                        loading={cancelLoading === reservation.id}
                      >
                        取消预定
                      </Button>
                    ] : []}
                  >
                    <div style={{ 
                      display: 'flex', 
                      width: '100%',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 12 : 16
                    }}>
                      {/* 商品信息区域 */}
                      <div style={{ 
                        display: 'flex', 
                        flex: 1,
                        gap: 12,
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'center' : 'flex-start'
                      }}>
                        <Image
                          src={reservation.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPuWVhuWTgeWbvueJhzwvdGV4dD4KPC9zdmc+Cg=='}
                          alt={reservation.product_name}
                          style={{ 
                            width: isMobile ? 80 : 64, 
                            height: isMobile ? 80 : 64, 
                            objectFit: 'cover', 
                            borderRadius: 8,
                            flexShrink: 0
                          }}
                          preview={false}
                        />
                        <div style={{ 
                          flex: 1, 
                          minWidth: 0,
                          textAlign: isMobile ? 'center' : 'left'
                        }}>
                          <div style={{ 
                            fontSize: isMobile ? '16px' : '16px',
                            fontWeight: 500,
                            marginBottom: 4,
                            lineHeight: '1.4'
                          }}>
                            {reservation.product_name}
                          </div>
                          <div style={{ 
                            fontSize: isMobile ? '13px' : '14px',
                            color: '#666',
                            marginBottom: 4
                          }}>
                            预定日期: {dayjs(reservation.reservation_date).format('YYYY年MM月DD日')}
                          </div>
                          <div style={{ 
                            fontSize: isMobile ? '13px' : '14px',
                            color: '#666',
                            marginBottom: 4
                          }}>
                            数量: {reservation.quantity} 份
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            {getStatusTag(reservation.status)}
                          </div>
                          {renderVariantSelections(reservation.variant_selections)}
                          {reservation.notes && (
                            <div style={{ 
                              marginTop: 8,
                              fontSize: isMobile ? '12px' : '13px',
                              color: '#666',
                              fontStyle: 'italic'
                            }}>
                              备注: {reservation.notes}
                            </div>
                          )}
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
                            ¥{reservation.total_amount ? reservation.total_amount.toFixed(2) : (reservation.price * reservation.quantity).toFixed(2)}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '13px' }}>
                            {reservation.quantity} 份
                          </Text>
                          {reservation.is_paid && (
                            <div style={{ 
                              fontSize: isMobile ? '11px' : '12px', 
                              color: '#52c41a', 
                              marginTop: 2 
                            }}>
                              ✓ 已支付
                            </div>
                          )}
                          {reservation.order_id && (
                            <div style={{ 
                              fontSize: isMobile ? '11px' : '12px', 
                              color: '#1890ff', 
                              marginTop: 2 
                            }}>
                              订单 #{reservation.order_id}
                            </div>
                          )}
                          <div style={{ 
                            fontSize: isMobile ? '11px' : '12px', 
                            color: '#999', 
                            marginTop: 2 
                          }}>
                            {dayjs(reservation.created_at).format('MM-DD HH:mm')}
                          </div>
                        </div>

                        {/* 移动端操作按钮 */}
                        {isMobile && reservation.status === 'pending' && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => handleCancelReservation(reservation)}
                            loading={cancelLoading === reservation.id}
                          >
                            取消
                          </Button>
                        )}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default ReservationsPage; 