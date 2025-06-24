import axios from 'axios';
import config from '../config';

// 从配置文件读取API URL，支持环境变量配置
const API_BASE_URL = config.apiUrl;

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // 只有在非登录请求时才自动重定向
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
          // Token过期，清除本地存储
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // 通用请求方法
  get(url, params = {}) {
    return this.api.get(url, { params });
  }

  post(url, data = {}) {
    return this.api.post(url, data);
  }

  put(url, data = {}) {
    return this.api.put(url, data);
  }

  delete(url) {
    return this.api.delete(url);
  }

  // 商品相关API
  getProducts(category) {
    return this.get('/products', category ? { category } : {});
  }

  // 管理员获取所有商品（包括不可用商品）
  getAdminProducts(category) {
    return this.get('/products/admin/all', category ? { category } : {});
  }

  getProduct(id) {
    return this.get(`/products/${id}`);
  }

  createProduct(productData) {
    return this.post('/products', productData);
  }

  updateProduct(id, productData) {
    return this.put(`/products/${id}`, productData);
  }

  // 细分类型相关API
  getVariantTypes() {
    return this.get('/variants/types');
  }

  getProductVariants(productId) {
    return this.get(`/variants/product/${productId}`);
  }

  createVariantType(data) {
    return this.post('/variants/types', data);
  }

  updateVariantType(id, data) {
    return this.put(`/variants/types/${id}`, data);
  }

  deleteVariantType(id) {
    return this.delete(`/variants/types/${id}`);
  }

  createVariantOption(data) {
    return this.post('/variants/options', data);
  }

  updateVariantOption(id, data) {
    return this.put(`/variants/options/${id}`, data);
  }

  deleteVariantOption(id) {
    return this.delete(`/variants/options/${id}`);
  }

  configureProductVariants(productId, variantTypeId, config) {
    return this.post(`/variants/product/${productId}/types`, {
      variant_type_id: variantTypeId,
      ...config
    });
  }

  removeProductVariant(productId, variantTypeId) {
    return this.delete(`/variants/product/${productId}/types/${variantTypeId}`);
  }

  // 配置商品的细分选项
  configureProductVariantOptions(productId, variantTypeId, enabledOptions) {
    return this.post(`/variants/product/${productId}/options`, {
      variant_type_id: variantTypeId,
      enabled_options: enabledOptions
    });
  }

  // 获取商品的细分选项配置
  getProductVariantOptions(productId, variantTypeId) {
    return this.get(`/variants/product/${productId}/options/${variantTypeId}`);
  }

  deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  getCategories() {
    return this.get('/products/categories/list');
  }

  // 购物车相关API
  getCart() {
    return this.get('/cart');
  }

  addToCart(productId, quantity = 1, variantSelections = {}) {
    return this.post('/cart/add', { 
      product_id: productId, 
      quantity,
      variant_selections: variantSelections 
    });
  }

  updateCartItem(cartId, quantity) {
    return this.put(`/cart/${cartId}`, { quantity });
  }

  removeFromCart(cartId) {
    return this.delete(`/cart/${cartId}`);
  }

  clearCart() {
    return this.delete('/cart');
  }

  // 订单相关API
  checkout() {
    return this.post('/orders/checkout');
  }

  getMyOrders() {
    return this.get('/orders/my-orders');
  }

  getOrderDetail(orderId) {
    return this.get(`/orders/${orderId}`);
  }

  getAllOrders(params = {}) {
    return this.get('/orders', params);
  }

  getAdminOrderDetail(orderId) {
    return this.get(`/orders/admin/${orderId}`);
  }

  updateOrderStatus(orderId, status) {
    return this.put(`/orders/${orderId}/status`, { status });
  }

  // 管理员管理相关API
  changeAdminPassword(currentPassword, newPassword) {
    return this.put('/auth/admin/change-password', { currentPassword, newPassword });
  }

  registerAdmin(username, password) {
    return this.post('/auth/admin/register', { username, password });
  }

  getAdminList() {
    return this.get('/auth/admin/list');
  }

  deleteAdmin(adminId) {
    return this.delete(`/auth/admin/${adminId}`);
  }

  // 图片上传相关API
  uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  deleteImage(filename) {
    return this.delete(`/upload/image/${filename}`);
  }

  getUploadedImages() {
    return this.get('/upload/images');
  }

  // 用户管理相关API（仅管理员）
  getAllCustomers() {
    return this.get('/users');
  }

  getCustomerDetail(userId) {
    return this.get(`/users/${userId}`);
  }

  getAllHistoryOrders(params = {}) {
    return this.get('/users/history/orders', params);
  }

  // 标签管理相关API
  getAllTags() {
    return this.get('/tags');
  }

  createTag(name, color = 'gold') {
    return this.post('/tags', { name, color });
  }

  deleteTag(tagId) {
    return this.delete(`/tags/${tagId}`);
  }

  getProductTags(productId) {
    return this.get(`/tags/product/${productId}`);
  }

  setProductTags(productId, tagIds) {
    return this.put(`/tags/product/${productId}`, { tagIds });
  }
}

const api = new ApiService();
export default api; 