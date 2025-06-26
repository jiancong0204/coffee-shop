import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, DatePicker, Input, message, Space, Typography, Tag, Divider } from 'antd';
import { CalendarOutlined, NumberOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ReservationSelector = ({ visible, onCancel, onConfirm, product }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [variantTypes, setVariantTypes] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

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
    if (visible && product) {
      form.resetFields();
      setSelectedVariants({});
      setTotalPrice(product.price);
      fetchProductVariants();
    }
  }, [visible, product, form]);

  const fetchProductVariants = async () => {
    if (!product?.id) return;
    
    try {
      const response = await api.getProductVariants(product.id);
      setVariantTypes(response.data || []);
    } catch (error) {
      console.error('获取商品细分类型失败:', error);
      setVariantTypes([]);
    }
  };

  // 计算总价
  const calculateTotalPrice = (quantity = 1, variants = selectedVariants) => {
    let basePrice = product?.price || 0;
    let adjustmentTotal = 0;

    // 计算细分选项的价格调整
    Object.values(variants).forEach(variant => {
      if (variant && variant.price_adjustment) {
        adjustmentTotal += variant.price_adjustment;
      }
    });

    return (basePrice + adjustmentTotal) * quantity;
  };

  // 处理细分选项变化
  const handleVariantChange = (variantTypeId, optionId) => {
    const variantType = variantTypes.find(vt => vt.id === variantTypeId);
    const option = variantType?.options.find(opt => opt.id === optionId);
    
    if (option) {
      const newVariants = {
        ...selectedVariants,
        [variantTypeId]: {
          type_id: variantTypeId,
          type_name: variantType.name,
          type_display_name: variantType.display_name,
          option_id: option.id,
          option_name: option.name,
          option_display_name: option.display_name,
          price_adjustment: option.price_adjustment || 0
        }
      };
      
      setSelectedVariants(newVariants);
      
      // 重新计算总价
      const quantity = form.getFieldValue('quantity') || 1;
      const newTotalPrice = calculateTotalPrice(quantity, newVariants);
      setTotalPrice(newTotalPrice);
    }
  };

  // 处理数量变化
  const handleQuantityChange = (quantity) => {
    const newTotalPrice = calculateTotalPrice(quantity, selectedVariants);
    setTotalPrice(newTotalPrice);
  };

  // 获取可预定的日期范围（明天开始的未来3天）
  const getAvailableDates = () => {
    const dates = [];
    const today = dayjs();
    
    for (let i = 1; i <= 3; i++) {
      const date = today.add(i, 'day');
      dates.push({
        value: date.format('YYYY-MM-DD'),
        label: `${date.format('MM月DD日')} (${date.format('dddd')})`
      });
    }
    
    return dates;
  };

  // 禁用的日期函数
  const disabledDate = (current) => {
    if (!current) return true;
    
    const today = dayjs().startOf('day');
    const maxDate = today.add(3, 'day');
    
    // 禁用今天及之前的日期，只允许明天开始的未来3天
    return current.isSame(today, 'day') || current.isBefore(today, 'day') || current.isAfter(maxDate, 'day');
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      // 验证必需的细分选项
      const requiredVariants = variantTypes.filter(vt => vt.is_required);
      for (const requiredVariant of requiredVariants) {
        if (!selectedVariants[requiredVariant.id]) {
          message.error(`请选择${requiredVariant.display_name}`);
          setLoading(false);
          return;
        }
      }

      const reservationData = {
        product_id: product.id,
        quantity: values.quantity,
        reservation_date: values.reservation_date.format('YYYY-MM-DD'),
        variant_selections: selectedVariants,
        notes: values.notes || ''
      };

      await onConfirm(reservationData);
      form.resetFields();
      setSelectedVariants({});
    } catch (error) {
      console.error('预定失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVariantOptions = () => {
    if (!variantTypes || variantTypes.length === 0) {
      return null;
    }

    return (
      <div style={{ marginTop: 16 }}>
        <Divider orientation="left">
          <Space>
            <SettingOutlined />
            <Text strong>商品规格</Text>
          </Space>
        </Divider>
        
        {variantTypes.map(variantType => (
          <div key={variantType.id} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: isMobile ? '14px' : '16px' }}>
                {variantType.emoji} {variantType.display_name}
              </Text>
              {variantType.is_required && (
                <Tag color="red" size="small">必选</Tag>
              )}
            </div>
            
            <Select
              style={{ width: '100%' }}
              placeholder={`请选择${variantType.display_name}`}
              onChange={(optionId) => handleVariantChange(variantType.id, optionId)}
              value={selectedVariants[variantType.id]?.option_id}
              size={isMobile ? 'default' : 'large'}
            >
              {variantType.options?.map(option => (
                <Select.Option key={option.id} value={option.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{option.display_name}</span>
                    {option.price_adjustment !== 0 && (
                      <span style={{ 
                        color: option.price_adjustment > 0 ? '#f50' : '#52c41a',
                        fontSize: '12px'
                      }}>
                        {option.price_adjustment > 0 ? '+' : ''}¥{option.price_adjustment}
                      </span>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    );
  };

  if (!product) return null;

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <CalendarOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          预定商品
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4, fontWeight: 'normal' }}>
            库存不足时可预定，需立即支付
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={isMobile ? '95%' : 600}
      centered
      okText="立即支付并预定"
      cancelText="取消"
      styles={{
        body: {
          padding: isMobile ? 16 : 24,
          maxHeight: isMobile ? '80vh' : 'auto',
          overflow: 'auto'
        }
      }}
    >
      <div style={{ marginBottom: 20 }}>
        {/* 商品信息 */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          padding: 16, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8,
          marginBottom: 20
        }}>
          <img
            src={product.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPuWVhuWTgeWbvueJhzwvdGV4dD4KPC9zdmc+Cg=='}
            alt={product.name}
            style={{ 
              width: isMobile ? 60 : 80, 
              height: isMobile ? 60 : 80, 
              objectFit: 'cover', 
              borderRadius: 8 
            }}
          />
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ 
              margin: 0, 
              marginBottom: 8,
              fontSize: isMobile ? '16px' : '18px'
            }}>
              {product.name}
            </Title>
            <Text type="secondary" style={{ 
              fontSize: isMobile ? '13px' : '14px',
              lineHeight: '1.4'
            }}>
              {product.description}
            </Text>
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ 
                fontSize: isMobile ? '16px' : '18px',
                color: '#f50' 
              }}>
                单价: ¥{product.price}
              </Text>
            </div>
          </div>
        </div>

        {/* 预定表单 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ quantity: 1 }}
        >
          <Form.Item
            label={
              <Space>
                <CalendarOutlined />
                <Text strong>预定日期</Text>
              </Space>
            }
            name="reservation_date"
            rules={[{ required: true, message: '请选择预定日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择预定日期（明天开始）"
              disabledDate={disabledDate}
              format="YYYY年MM月DD日"
              size={isMobile ? 'default' : 'large'}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <NumberOutlined />
                <Text strong>预定数量</Text>
              </Space>
            }
            name="quantity"
            rules={[
              { required: true, message: '请输入预定数量' },
              { type: 'number', min: 1, max: 10, message: '数量必须在1-10之间' }
            ]}
            extra={
              <Text type="secondary" style={{ fontSize: '12px' }}>
                💡 为保证服务质量，单次预定限制最多10份
              </Text>
            }
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={10}
              placeholder="输入预定数量（1-10份）"
              onChange={handleQuantityChange}
              size={isMobile ? 'default' : 'large'}
            />
          </Form.Item>

          {/* 细分选项 */}
          {renderVariantOptions()}

          <Form.Item
            label={<Text strong>备注</Text>}
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder="预定备注（可选）"
              showCount
              maxLength={100}
            />
          </Form.Item>
        </Form>

        {/* 价格汇总 */}
        <div style={{ 
          padding: 16, 
          backgroundColor: '#fff7e6', 
          borderRadius: 8,
          border: '1px solid #ffd591'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Text strong style={{ fontSize: isMobile ? '16px' : '18px' }}>
              需支付金额:
            </Text>
            <Text strong style={{ 
              fontSize: isMobile ? '20px' : '24px',
              color: '#f50' 
            }}>
              ¥{totalPrice.toFixed(2)}
            </Text>
          </div>
          {Object.keys(selectedVariants).length > 0 && (
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              <Text type="secondary">
                已选规格: {Object.values(selectedVariants).map(v => v.option_display_name).join(', ')}
              </Text>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: '12px', color: '#fa8c16' }}>
            <Text type="secondary">
              💳 预定需要立即支付，管理员确认后将自动转为订单
            </Text>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReservationSelector; 