import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false); // 初始加载
  const [updating, setUpdating] = useState(false); // 更新操作
  const { isLoggedIn, isAdmin } = useAuth();

  // 计算购物车总数量的辅助函数
  const calculateTotalCount = useCallback((items) => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, []);

  // 获取购物车数据
  const fetchCart = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await api.getCart();
      const items = response.data.items || [];
      setCartItems(items);
      // cartCount 会通过 useEffect 自动更新
    } catch (error) {
      console.error('获取购物车失败:', error);
      setCartItems([]);
      setCartCount(0);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // 添加到购物车
  const addToCart = useCallback(async (productId, quantity = 1, variantSelections = {}) => {
    try {
      await api.addToCart(productId, quantity, variantSelections);
      await fetchCart(); // 刷新购物车
      return { success: true };
    } catch (error) {
      console.error('添加到购物车失败:', error);
      return { success: false, error: error.response?.data?.error || '添加失败' };
    }
  }, [fetchCart]);

  // 更新购物车项目（乐观更新）
  const updateCartItem = useCallback(async (cartId, quantity) => {
    // 备份当前状态以便回滚
    const originalItems = [...cartItems];
    
    // 乐观更新：先更新本地状态
    const optimisticItems = cartItems.map(item => 
      item.cart_id === cartId ? { ...item, quantity } : item
    );
    setCartItems(optimisticItems);
    
    setUpdating(true);
    try {
      await api.updateCartItem(cartId, quantity);
      // API成功，静默刷新以确保数据一致性
      await fetchCart(false);
      return { success: true };
    } catch (error) {
      console.error('更新购物车失败:', error);
      // API失败，回滚到原始状态
      setCartItems(originalItems);
      return { success: false, error: error.response?.data?.error || '更新失败' };
    } finally {
      setUpdating(false);
    }
  }, [cartItems, fetchCart]);

  // 从购物车移除（乐观更新）
  const removeFromCart = useCallback(async (cartId) => {
    // 备份当前状态以便回滚
    const originalItems = [...cartItems];
    
    // 乐观更新：先移除本地状态
    const optimisticItems = cartItems.filter(item => item.cart_id !== cartId);
    setCartItems(optimisticItems);
    
    setUpdating(true);
    try {
      await api.removeFromCart(cartId);
      // API成功，静默刷新以确保数据一致性
      await fetchCart(false);
      return { success: true };
    } catch (error) {
      console.error('移除购物车项目失败:', error);
      // API失败，回滚到原始状态
      setCartItems(originalItems);
      return { success: false, error: error.response?.data?.error || '移除失败' };
    } finally {
      setUpdating(false);
    }
  }, [cartItems, fetchCart]);

  // 清空购物车
  const clearCart = useCallback(async () => {
    // 备份当前状态以便回滚
    const originalItems = [...cartItems];
    
    // 乐观更新：先清空本地状态
    setCartItems([]);
    
    setUpdating(true);
    try {
      await api.clearCart();
      // API成功，静默刷新以确保数据一致性
      await fetchCart(false);
      return { success: true };
    } catch (error) {
      console.error('清空购物车失败:', error);
      // API失败，回滚到原始状态
      setCartItems(originalItems);
      return { success: false, error: error.response?.data?.error || '清空失败' };
    } finally {
      setUpdating(false);
    }
  }, [cartItems, fetchCart]);

  // 获取商品在购物车中的总数量
  const getProductQuantity = useCallback((productId, variantSelections = {}) => {
    if (!variantSelections || Object.keys(variantSelections).length === 0) {
      // 返回该商品所有配置的总数量
      return cartItems
        .filter(item => item.product_id === productId)
        .reduce((total, item) => total + item.quantity, 0);
    }
    
    // 如果有细分选择，需要找到完全匹配的项目
    const variantSelectionsStr = JSON.stringify(variantSelections);
    const cartItem = cartItems.find(item => 
      item.product_id === productId && 
      JSON.stringify(item.variant_selections || {}) === variantSelectionsStr
    );
    return cartItem ? cartItem.quantity : 0;
  }, [cartItems]);

  // 检查商品是否有多种配置
  const hasMultipleConfigurations = useCallback((productId) => {
    const productItems = cartItems.filter(item => item.product_id === productId);
    return productItems.length > 1;
  }, [cartItems]);

  // 当cartItems变化时重新计算总数量
  useEffect(() => {
    setCartCount(calculateTotalCount(cartItems));
  }, [cartItems, calculateTotalCount]);

  // 当登录状态变化时获取购物车
  useEffect(() => {
    if (isLoggedIn() && !isAdmin()) {
      fetchCart();
    } else {
      setCartItems([]);
      // cartCount 会通过 useEffect 自动更新为 0
    }
  }, [isLoggedIn, isAdmin, fetchCart]);

  const value = useMemo(() => ({
    cartItems,
    cartCount,
    loading,
    updating,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getProductQuantity,
    hasMultipleConfigurations
  }), [
    cartItems,
    cartCount,
    loading,
    updating,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getProductQuantity,
    hasMultipleConfigurations
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 