import React, { useState, useEffect } from 'react';
import { Modal, Radio, Button, Space, Typography, Divider, InputNumber, Alert } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ProductVariantSelector = ({ 
  visible, 
  onCancel, 
  onConfirm, 
  product, 
  initialQuantity = 1 
}) => {
  const [selections, setSelections] = useState({});
  const [quantity, setQuantity] = useState(initialQuantity);
  const [priceAdjustment, setPriceAdjustment] = useState(0);

  // 重置选择状态
  useEffect(() => {
    if (visible && product) {
      const defaultSelections = {};
      product.variantTypes?.forEach(variantType => {
        // 如果是必选，设置默认值为第一个选项
        if (variantType.is_required && variantType.options?.length > 0) {
          defaultSelections[variantType.id] = variantType.options[0].id;
        }
      });
      setSelections(defaultSelections);
      setQuantity(initialQuantity);
      calculatePriceAdjustment(defaultSelections);
    }
  }, [visible, product, initialQuantity]);

  // 计算价格调整
  const calculatePriceAdjustment = (currentSelections) => {
    let adjustment = 0;
    
    if (product?.variantTypes) {
      product.variantTypes.forEach(variantType => {
        const selectedOptionId = currentSelections[variantType.id];
        if (selectedOptionId) {
          const selectedOption = variantType.options.find(opt => opt.id === selectedOptionId);
          if (selectedOption) {
            adjustment += selectedOption.price_adjustment || 0;
          }
        }
      });
    }
    
    setPriceAdjustment(adjustment);
  };

  // 处理选项变化
  const handleSelectionChange = (variantTypeId, optionId) => {
    const newSelections = {
      ...selections,
      [variantTypeId]: optionId
    };
    setSelections(newSelections);
    calculatePriceAdjustment(newSelections);
  };

  // 验证是否所有必选项都已选择
  const validateSelections = () => {
    if (!product?.variantTypes) return true;
    
    for (const variantType of product.variantTypes) {
      if (variantType.is_required && !selections[variantType.id]) {
        return false;
      }
    }
    return true;
  };

  // 获取选择的选项详情
  const getSelectedOptions = () => {
    const result = {};
    
    if (product?.variantTypes) {
      product.variantTypes.forEach(variantType => {
        const selectedOptionId = selections[variantType.id];
        if (selectedOptionId) {
          const selectedOption = variantType.options.find(opt => opt.id === selectedOptionId);
          if (selectedOption) {
            result[variantType.id] = {
              type_name: variantType.name,
              type_display_name: variantType.display_name,
              option_id: selectedOption.id,
              option_name: selectedOption.name,
              option_display_name: selectedOption.display_name,
              price_adjustment: selectedOption.price_adjustment || 0
            };
          }
        }
      });
    }
    
    return result;
  };

  // 确认选择
  const handleConfirm = () => {
    if (!validateSelections()) {
      return;
    }
    
    const selectedOptions = getSelectedOptions();
    onConfirm({
      quantity,
      variantSelections: selectedOptions,
      priceAdjustment
    });
  };

  // 计算总价
  const getTotalPrice = () => {
    const basePrice = product?.price || 0;
    return (basePrice + priceAdjustment) * quantity;
  };

  if (!product) return null;

  return (
    <Modal
      title={`选择 ${product.name} 的规格`}
      open={visible}
      onCancel={onCancel}
      width={500}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirm}
          disabled={!validateSelections()}
        >
          确认添加 (¥{getTotalPrice().toFixed(2)})
        </Button>
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {product.name}
        </Title>
        <Text type="secondary">
          基础价格: ¥{product.price?.toFixed(2)}
        </Text>
        {priceAdjustment !== 0 && (
          <Text style={{ marginLeft: 8, color: priceAdjustment > 0 ? '#f50' : '#52c41a' }}>
            ({priceAdjustment > 0 ? '+' : ''}¥{priceAdjustment.toFixed(2)})
          </Text>
        )}
      </div>

      {/* 细分选项 */}
      {product.variantTypes && product.variantTypes.length > 0 ? (
        product.variantTypes.map((variantType, index) => (
          <div key={variantType.id} style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                <span style={{ fontSize: '16px', marginRight: 6 }}>
                  {variantType.emoji || '⚙️'}
                </span>
                {variantType.display_name}
                {variantType.is_required && <Text style={{ color: '#f50' }}>*</Text>}
              </Text>
              {variantType.description && (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                  {variantType.description}
                </Text>
              )}
            </div>
            
            <Radio.Group
              value={selections[variantType.id]}
              onChange={(e) => handleSelectionChange(variantType.id, e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {variantType.options.map(option => (
                  <Radio key={option.id} value={option.id} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span>{option.display_name}</span>
                      {option.price_adjustment !== 0 && (
                        <Text style={{ color: option.price_adjustment > 0 ? '#f50' : '#52c41a' }}>
                          {option.price_adjustment > 0 ? '+' : ''}¥{option.price_adjustment.toFixed(2)}
                        </Text>
                      )}
                    </div>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
            
            {index < product.variantTypes.length - 1 && <Divider />}
          </div>
        ))
      ) : (
        <Alert
          message="此商品没有可选规格"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 数量选择 */}
      <div style={{ marginTop: 20 }}>
        <Text strong style={{ marginRight: 16 }}>数量:</Text>
        <Space>
          <Button
            icon={<MinusOutlined />}
            size="small"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          />
          <InputNumber
            min={1}
            max={99}
            value={quantity}
            onChange={(value) => setQuantity(value || 1)}
            style={{ width: 60 }}
          />
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setQuantity(quantity + 1)}
          />
        </Space>
      </div>

      {/* 价格总结 */}
      <div style={{ marginTop: 20, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>单价: ¥{(product.price + priceAdjustment).toFixed(2)}</Text>
          <Text>数量: {quantity}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text strong style={{ fontSize: '16px' }}>总计: ¥{getTotalPrice().toFixed(2)}</Text>
        </div>
      </div>

      {/* 必选项提示 */}
      {product.variantTypes?.some(vt => vt.is_required) && !validateSelections() && (
        <Alert
          message="请选择所有必选项"
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
        />
      )}
    </Modal>
  );
};

export default ProductVariantSelector; 