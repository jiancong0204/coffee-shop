import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Tabs, Typography, Row, Col, message, Image, Modal } from 'antd';
import { PlusOutlined, MinusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import api from '../services/api';
import pinyin from 'pinyin';
import ProductVariantSelector from '../components/ProductVariantSelector';

const { Content } = Layout;
const { Title, Text } = Typography;

function ProductList({ products, isAdmin, isLoggedIn, navigate }) {
  const [isUpdating, setIsUpdating] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantSelectorVisible, setVariantSelectorVisible] = useState(false);
  const { cartItems, addToCart, updateCartItem, removeFromCart, getProductQuantity, hasMultipleConfigurations } = useCart();

  const onAddToCart = async (productId, variantSelections, quantity = 1) => {
    if (!isLoggedIn) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    if (isAdmin) {
      message.warning('管理员账号无法购买商品');
      return;
    }

    setIsUpdating(productId);
    try {
      const result = await addToCart(productId, quantity, variantSelections);
      if (result.success) {
        message.success('已添加到购物车');
      } else {
        message.error(result.error || '添加到购物车失败');
      }
    } finally {
      setIsUpdating(null);
    }
  };

  // 显示细分选项选择器
  const showVariantSelector = (product) => {
    setSelectedProduct(product);
    setVariantSelectorVisible(true);
  };

  // 处理添加到购物车（带细分选项）
  const handleAddToCartWithVariants = async (product) => {
    // 检查是否有细分选项
    if (product.variantTypes && product.variantTypes.length > 0) {
      showVariantSelector(product);
    } else {
      // 没有细分选项，直接添加
      await onAddToCart(product.id);
    }
  };

  // 确认细分选项选择
  const handleVariantConfirm = async ({ quantity, variantSelections }) => {
    try {
      setVariantSelectorVisible(false);
      await onAddToCart(selectedProduct.id, variantSelections, quantity);
      setSelectedProduct(null);
    } catch (error) {
      console.error('添加到购物车失败:', error);
    }
  };

  const onUpdateQuantity = async (productId, newQuantity) => {
    if (!isLoggedIn) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    if (isAdmin) {
      message.warning('管理员账号无法购买商品');
      return;
    }

    setIsUpdating(productId);
    try {
      // 找到对应的购物车项（如果有多个配置，取第一个）
      const cartItem = cartItems.find(item => item.product_id === productId);
      if (!cartItem) {
        message.error('购物车项不存在');
        return;
      }

      let result;
      if (newQuantity <= 0) {
        // 删除购物车项
        result = await removeFromCart(cartItem.cart_id);
        if (result.success) {
          message.success('已从购物车移除');
        } else {
          message.error(result.error || '移除失败');
        }
      } else {
        // 更新数量
        result = await updateCartItem(cartItem.cart_id, newQuantity);
        if (result.success) {
          message.success('购物车已更新');
        } else {
          message.error(result.error || '更新失败');
        }
      }
    } finally {
      setIsUpdating(null);
    }
  };



  // 处理减少数量
  const handleDecreaseQuantity = (product) => {
    if (hasMultipleConfigurations(product.id)) {
      // 显示提示模态框
      Modal.confirm({
        title: '前往购物车管理',
        content: '不同规格的商品请前往购物车减购',
        okText: '前往购物车',
        cancelText: '取消',
        icon: <ShoppingCartOutlined style={{ color: '#1890ff' }} />,
        onOk: () => {
          navigate('/cart', { state: { highlightProductId: product.id } });
        },
      });
    } else {
      // 只有一种配置，直接减少
      const quantity = getProductQuantity(product.id);
      onUpdateQuantity(product.id, quantity - 1);
    }
  };



  const renderCartButton = (product) => {
    const quantity = getProductQuantity(product.id);
    const isLoading = isUpdating === product.id;
    
    // 检查库存状态
    const isOutOfStock = !product.unlimited_supply && product.available_num <= 0;
    const hasStock = product.unlimited_supply || product.available_num > 0;
    const canAddMore = product.unlimited_supply || (product.available_num > quantity);

    if (isAdmin) {
      return (
        <Button disabled className="cart-button">
          管理员模式
        </Button>
      );
    }

    // 如果商品缺货
    if (isOutOfStock) {
      return (
        <Button
          disabled
          className="cart-button"
          style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
        >
          已售罄
        </Button>
      );
    }

    if (quantity === 0) {
      return (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAddToCartWithVariants(product)}
          disabled={!product.available || !hasStock || isLoading}
          loading={isLoading}
          className="cart-button"
        >
          加入购物车
        </Button>
      );
    }

    return (
      <div className="quantity-controls">
        <Button
          size="small"
          icon={<MinusOutlined />}
          onClick={() => handleDecreaseQuantity(product)}
          disabled={isLoading}
          className="quantity-btn"
        />
        <span className="quantity-display">
          {quantity}
        </span>
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddToCartWithVariants(product)}
          disabled={isLoading || !canAddMore}
          className="quantity-btn"
          title={!canAddMore ? '库存不足' : ''}
        />
      </div>
    );
  };

  return (
    <div className="product-list">
      {products.map(product => (
        <Card
          key={product.id}
          className="product-item-card"
        >
          <div className="product-content">
            {/* 商品图片 */}
            <div className="product-image">
              <Image
                src={product.image_url || getDefaultImage()}
                alt={product.name}
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                preview={false}
              />
            </div>

            {/* 商品信息 */}
            <div className="product-info">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8}}>
                <Title 
                  level={4} 
                  className="product-title"
                  style={{ margin: 0, lineHeight: '1.2' }}
                >
                  {product.name}
                </Title>
                {product.tags && product.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {product.tags.map((tag, index) => (
                      <span 
                        key={tag.id}
                        style={getTagStyle(tag.color)}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <Text 
                type="secondary" 
                className="product-description"
              >
                {product.description || '暂无描述'}
              </Text>
            </div>

            {/* 价格和按钮区域 */}
            <div className="product-actions">
              <div className="product-price">
                <Text strong className="price-text">
                  ¥{product.price}
                </Text>
              </div>
              
              <div className="product-cart">
                {renderCartButton(product)}
              </div>
            </div>
          </div>
        </Card>
      ))}
      
      {/* 商品细分选项选择器 */}
      <ProductVariantSelector
        visible={variantSelectorVisible}
        onCancel={() => {
          setVariantSelectorVisible(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleVariantConfirm}
        product={selectedProduct}
      />
    </div>
  );
}

const getDefaultImage = () => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjNlbSI+5ZWG5ZOB5Zu+54mHPC90ZXh0Pgo8L3N2Zz4K';
};

// 根据标签颜色生成样式
const getTagStyle = (color) => {
  const colorMap = {
    'gold': {
      background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
      color: '#8b6914',
      shadowColor: 'rgba(255, 215, 0, 0.3)'
    },
    'red': {
      background: 'linear-gradient(45deg, #ff4d4f, #ff7875)',
      color: 'white',
      shadowColor: 'rgba(255, 77, 79, 0.3)'
    },
    'blue': {
      background: 'linear-gradient(45deg, #1890ff, #40a9ff)',
      color: 'white',
      shadowColor: 'rgba(24, 144, 255, 0.3)'
    },
    'green': {
      background: 'linear-gradient(45deg, #52c41a, #73d13d)',
      color: 'white',
      shadowColor: 'rgba(82, 196, 26, 0.3)'
    },
    'purple': {
      background: 'linear-gradient(45deg, #722ed1, #9254de)',
      color: 'white',
      shadowColor: 'rgba(114, 46, 209, 0.3)'
    },
    'orange': {
      background: 'linear-gradient(45deg, #fa8c16, #ffa940)',
      color: 'white',
      shadowColor: 'rgba(250, 140, 22, 0.3)'
    },
    'cyan': {
      background: 'linear-gradient(45deg, #13c2c2, #36cfc9)',
      color: 'white',
      shadowColor: 'rgba(19, 194, 194, 0.3)'
    },
    'lime': {
      background: 'linear-gradient(45deg, #a0d911, #b7eb8f)',
      color: '#389e0d',
      shadowColor: 'rgba(160, 217, 17, 0.3)'
    },
    'pink': {
      background: 'linear-gradient(45deg, #eb2f96, #f759ab)',
      color: 'white',
      shadowColor: 'rgba(235, 47, 150, 0.3)'
    },
    'magenta': {
      background: 'linear-gradient(45deg, #c41d7f, #d3adf7)',
      color: 'white',
      shadowColor: 'rgba(196, 29, 127, 0.3)'
    },
    'volcano': {
      background: 'linear-gradient(45deg, #fa541c, #ff7a45)',
      color: 'white',
      shadowColor: 'rgba(250, 84, 28, 0.3)'
    },
    'geekblue': {
      background: 'linear-gradient(45deg, #2f54eb, #597ef7)',
      color: 'white',
      shadowColor: 'rgba(47, 84, 235, 0.3)'
    }
  };
  
  // 如果颜色不在映射中，使用默认的金色样式
  const style = colorMap[color] || colorMap['gold'];
  
  return {
    background: style.background,
    color: style.color,
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: `0 2px 4px ${style.shadowColor}`,
    flexShrink: 0
  };
};

// 按拼音首字母排序商品
const sortProductsByPinyin = (products) => {
  return products.sort((a, b) => {
    // 获取商品名称的拼音首字母
    const pinyinA = pinyin(a.name, {
      style: pinyin.STYLE_FIRST_LETTER,
      heteronym: false
    }).join('').toLowerCase();
    
    const pinyinB = pinyin(b.name, {
      style: pinyin.STYLE_FIRST_LETTER,
      heteronym: false
    }).join('').toLowerCase();
    
    // 按拼音首字母排序
    return pinyinA.localeCompare(pinyinB);
  });
};

// 按分类和拼音排序商品
const sortProductsByCategoryAndPinyin = (products) => {
  // 定义分类顺序
  const categoryOrder = {
    'coffee': 1,
    'tea': 2,
    'dessert': 3,
    'snack': 4
  };

  return products.sort((a, b) => {
    // 首先按分类排序
    const categoryA = categoryOrder[a.category] || 999;
    const categoryB = categoryOrder[b.category] || 999;
    
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }
    
    // 同分类内按拼音首字母排序
    const pinyinA = pinyin(a.name, {
      style: pinyin.STYLE_FIRST_LETTER,
      heteronym: false
    }).join('').toLowerCase();
    
    const pinyinB = pinyin(b.name, {
      style: pinyin.STYLE_FIRST_LETTER,
      heteronym: false
    }).join('').toLowerCase();
    
    return pinyinA.localeCompare(pinyinB);
  });
};

// 将商品按分类分组
const groupProductsByCategory = (products) => {
  const groups = {};
  const categoryOrder = ['coffee', 'tea', 'dessert', 'snack'];
  
  // 按分类分组
  products.forEach(product => {
    if (!groups[product.category]) {
      groups[product.category] = [];
    }
    groups[product.category].push(product);
  });
  
  // 每个分组内按拼音排序
  Object.keys(groups).forEach(category => {
    groups[category] = sortProductsByPinyin(groups[category]);
  });
  
  // 按预定义顺序返回分组
  const result = [];
  categoryOrder.forEach(category => {
    if (groups[category] && groups[category].length > 0) {
      result.push({
        category,
        products: groups[category]
      });
    }
  });
  
  // 添加其他未定义顺序的分类
  Object.keys(groups).forEach(category => {
    if (!categoryOrder.includes(category)) {
      result.push({
        category,
        products: groups[category]
      });
    }
  });
  
  return result;
};

// 分组商品列表组件
function GroupedProductList({ groupedProducts, categoryMap, categoryData, isAdmin, isLoggedIn, navigate }) {
  const getCategoryName = (category) => {
    const displayName = categoryMap[category] || category;
    
    // 尝试从分类数据中获取emoji
    const categoryInfo = categoryData.find(cat => cat.name === category);
    let emoji = '📦'; // 默认emoji
    
    // 如果有分类数据且包含emoji信息，使用数据库中的emoji
    if (categoryInfo && categoryInfo.emoji) {
      emoji = categoryInfo.emoji;
    } else {
      // 否则使用硬编码的映射作为后备
      const emojiMap = {
        'coffee': '☕',
        'tea': '🍵', 
        'dessert': '🧁',
        'snack': '🍪'
      };
      emoji = emojiMap[category] || '📦';
    }
    
    return `${emoji} ${displayName}`;
  };

  return (
    <div>
      {groupedProducts.map((group, groupIndex) => (
        <div key={group.category} style={{ marginBottom: groupIndex < groupedProducts.length - 1 ? 32 : 0 }}>
          {/* 分类标题 */}
          <div style={{ 
            marginBottom: 16, 
            paddingBottom: 8, 
            borderBottom: '2px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Title level={3} style={{ 
              margin: 0, 
              color: '#8B4513',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              {getCategoryName(group.category)}
            </Title>
            <Text style={{ 
              marginLeft: 12, 
              color: '#999',
              fontSize: '14px'
            }}>
              ({group.products.length} 款)
            </Text>
          </div>
          
          {/* 该分类下的商品 */}
          <ProductList 
            products={group.products} 
            isAdmin={isAdmin} 
            isLoggedIn={isLoggedIn} 
            navigate={navigate}
          />
        </div>
      ))}
    </div>
  );
}

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [categoryData, setCategoryData] = useState([]); // 保存完整的分类数据
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);



  const fetchProducts = async (category = null) => {
    try {
      const response = await api.getProducts(category);
      
      if (category === null) {
        // 全部商品时，按分类分组
        const grouped = groupProductsByCategory(response.data);
        setGroupedProducts(grouped);
        setProducts([]);
      } else {
        // 特定分类时，只按拼音排序
        const sortedProducts = sortProductsByPinyin(response.data);
        setProducts(sortedProducts);
        setGroupedProducts([]);
      }
    } catch (error) {
      message.error('获取商品失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // 尝试从新的分类API获取
      try {
        const response = await api.getAllCategories();
        const categoryDataList = response.data.data || [];
        const categoryNames = categoryDataList.map(cat => cat.name);
        setCategories(['all', ...categoryNames]);
        setCategoryData(categoryDataList); // 保存完整的分类数据
        
        // 更新分类映射（用于显示名称）
        const newCategoryMap = {};
        categoryDataList.forEach(cat => {
          newCategoryMap[cat.name] = cat.display_name;
        });
        setCategoryMap({ 'all': '全部', ...newCategoryMap });
      } catch (newApiError) {
        // 如果新API失败，回退到旧API
        console.warn('新分类API失败，使用旧API:', newApiError);
        const response = await api.getCategories();
        setCategories(['all', ...response.data]);
        // 保持默认的分类映射
        setCategoryMap({
          'all': '全部',
          'coffee': '咖啡',
          'tea': '茶饮',
          'dessert': '甜品',
          'snack': '小食'
        });
      }
    } catch (error) {
      console.error('获取分类失败:', error);
      // 使用默认分类
      setCategories(['all', 'coffee', 'tea', 'dessert', 'snack']);
      setCategoryMap({
        'all': '全部',
        'coffee': '咖啡',
        'tea': '茶饮',
        'dessert': '甜品',
        'snack': '小食'
      });
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setLoading(true);
    fetchProducts(category === 'all' ? null : category);
  };



  const getCategoryName = (category) => {
    const displayName = categoryMap[category] || category;
    
    // 为"全部"分类添加特殊处理
    if (category === 'all') {
      return `📋 ${displayName}`;
    }
    
    // 尝试从分类数据中获取emoji
    const categoryInfo = categoryData.find(cat => cat.name === category);
    let emoji = '📦'; // 默认emoji
    
    // 如果有分类数据且包含emoji信息，使用数据库中的emoji
    if (categoryInfo && categoryInfo.emoji) {
      emoji = categoryInfo.emoji;
    } else {
      // 否则使用硬编码的映射作为后备
      const emojiMap = {
        'coffee': '☕',
        'tea': '🍵', 
        'dessert': '🧁',
        'snack': '🍪'
      };
      emoji = emojiMap[category] || '📦';
    }
    
    return `${emoji} ${displayName}`;
  };

  const tabItems = categories.map(category => ({
    key: category,
    label: getCategoryName(category)
  }));

  if (!isLoggedIn()) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '20px' }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{ fontSize: '64px', marginBottom: 24 }}>☕</div>
            <Title level={1} style={{ color: '#8B4513', marginBottom: 16 }}>
              One Four O Three
            </Title>
            <Text style={{ 
              fontSize: '16px', 
              color: '#666', 
              marginBottom: 32, 
              display: 'block',
              lineHeight: '1.6'
            }}>
              欢迎来到1403咖啡店，请登录开始点单
            </Text>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                type="primary" 
                size="large" 
                onClick={() => navigate('/login')}
                style={{ minWidth: '120px' }}
              >
                登录
              </Button>
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Title level={2} style={{ color: '#8B4513', marginBottom: 8 }}>
              ☕ 菜单
            </Title>
            <Text style={{ fontSize: '16px', color: '#666' }}>
              选择您喜欢的饮品
            </Text>
          </div>

          <Tabs
            activeKey={selectedCategory}
            onChange={handleCategoryChange}
            items={tabItems}
            size="large"
            centered
            style={{ marginBottom: 24 }}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                加载中...
              </Text>
            </div>
          ) : selectedCategory === 'all' ? (
            // 显示分组商品列表
            <GroupedProductList 
              groupedProducts={groupedProducts} 
              categoryMap={categoryMap}
              categoryData={categoryData}
              isAdmin={isAdmin()} 
              isLoggedIn={isLoggedIn()} 
              navigate={navigate}
            />
          ) : (
            // 显示单一分类商品列表
            <ProductList 
              products={products} 
              isAdmin={isAdmin()} 
              isLoggedIn={isLoggedIn()} 
              navigate={navigate}
            />
          )}

          {((selectedCategory === 'all' && groupedProducts.length === 0) || 
            (selectedCategory !== 'all' && products.length === 0)) && !loading && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {isAdmin() ? '暂无商品，请先添加商品' : '暂无商品'}
              </Text>
              {isAdmin() && (
                <div style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    onClick={() => navigate('/admin')}
                  >
                    去添加商品
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;