import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Popconfirm, Typography, Tabs, Tag, Badge, Upload, Image, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, ShoppingOutlined, CheckOutlined, ClockCircleOutlined, EyeOutlined, UserOutlined, LockOutlined, UploadOutlined, InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import EmojiPicker from 'emoji-picker-react';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const AdminPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin } = useAuth();
  
  // 检测屏幕尺寸的hook
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('orders');
  const [adminList, setAdminList] = useState([]);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [adminForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  // 分类管理相关状态
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm] = Form.useForm();

  // 商品管理子视图状态 ('products' | 'categories' | 'variants')
  const [productSubView, setProductSubView] = useState('products');

  
  // 细分类型管理相关状态
  const [variantTypes, setVariantTypes] = useState([]);
  const [variantTypeLoading, setVariantTypeLoading] = useState(false);
  const [variantTypeModalVisible, setVariantTypeModalVisible] = useState(false);
  const [variantOptionModalVisible, setVariantOptionModalVisible] = useState(false);
  const [productVariantModalVisible, setProductVariantModalVisible] = useState(false);
  const [editingVariantType, setEditingVariantType] = useState(null);
  const [editingVariantOption, setEditingVariantOption] = useState(null);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [productVariantTypes, setProductVariantTypes] = useState([]); // 当前商品已配置的细分类型
  const [addVariantModalVisible, setAddVariantModalVisible] = useState(false); // 添加细分类型模态框
  const [selectedVariantTypeOptions, setSelectedVariantTypeOptions] = useState([]); // 选定细分类型的选项
  const [optionConfigModalVisible, setOptionConfigModalVisible] = useState(false); // 选项配置模态框
  const [currentVariantType, setCurrentVariantType] = useState(null); // 当前编辑的细分类型
  const [currentVariantOptions, setCurrentVariantOptions] = useState([]); // 当前编辑的细分类型的所有选项
  const [optionConfigForm] = Form.useForm(); // 选项配置表单
  const [variantTypeForm] = Form.useForm();
  const [variantOptionForm] = Form.useForm();
  const [addVariantForm] = Form.useForm();
  const [editVariantConfigModalVisible, setEditVariantConfigModalVisible] = useState(false); // 编辑细分配置模态框
  const [editingVariantConfig, setEditingVariantConfig] = useState(null); // 当前编辑的细分配置
  const [variantConfigForm] = Form.useForm(); // 细分配置表单

  const [customerDetailVisible, setCustomerDetailVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [statusForm] = Form.useForm();
  const [productSortType, setProductSortType] = useState('id-asc'); // 商品排序类型，默认ID升序
  const [orderFilters, setOrderFilters] = useState({
    pickupNumber: '',
    customerName: '',
    status: 'all',
    startDate: '',
    endDate: ''
  }); // 订单筛选条件
  const [orderPagination, setOrderPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  }); // 订单分页
  const [allTags, setAllTags] = useState([]); // 所有可用标签
  const [tagModalVisible, setTagModalVisible] = useState(false); // 标签管理模态框
  const [tagForm] = Form.useForm(); // 标签表单
  const [editUsernameModalVisible, setEditUsernameModalVisible] = useState(false); // 编辑用户名模态框
  const [editingCustomer, setEditingCustomer] = useState(null); // 当前编辑的顾客
  const [usernameForm] = Form.useForm(); // 用户名编辑表单
  
  // Emoji选择器相关状态
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');

  // 商品筛选相关状态
  const [productFilters, setProductFilters] = useState({
    category: 'all',      // 分类筛选
    status: 'all',        // 状态筛选（可用/不可用）
    inventory: 'all',     // 库存筛选（有库存/无库存/不限量）
    search: ''            // 搜索关键词
  });

  useEffect(() => {
    if (!isLoggedIn() || !isAdmin()) {
      navigate('/');
      return;
    }
    fetchProducts();
    fetchOrders();
    fetchAdminList();
    fetchAllTags();
    fetchCategories(); // 确保分类数据在初始化时就加载
    
    // 根据当前标签页加载对应数据
    if (activeTab === 'customers') {
      fetchCustomers();
    }
  }, [isLoggedIn, isAdmin, navigate]);

  // 当标签页切换时加载对应数据
  useEffect(() => {
    if (activeTab === 'customers' && (!customers || customers.length === 0)) {
      fetchCustomers();
    } else if (activeTab === 'products') {
      // 商品管理tab下，根据子视图加载对应数据
      if (productSubView === 'variants' && (!variantTypes || variantTypes.length === 0)) {
        fetchVariantTypes();
      } else if (productSubView === 'categories' && (!categories || categories.length === 0)) {
        fetchCategories();
      }
    }
  }, [activeTab, productSubView]);

  const fetchProducts = async () => {
    try {
      const response = await api.getAdminProducts();
      setProducts(response.data || []);
    } catch (error) {
      message.error('获取商品失败');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.getAllOrders();
      setOrders(response.data || []);
    } catch (error) {
      message.error('获取订单失败');
      setOrders([]);
    } finally {
      setOrderLoading(false);
    }
  };

  const showModal = async (product = null) => {
    // 确保标签数据已加载
    if (allTags.length === 0) {
      console.log('标签数据为空，正在加载...');
      await fetchAllTags();
    }
    
    console.log('当前可用标签:', allTags);
    
    setEditingProduct(product);
    setModalVisible(true);
    
    // 使用 setTimeout 确保模态框完全渲染后再设置表单值
    setTimeout(() => {
      if (product) {
        console.log('编辑商品:', product);
        // 获取商品的标签
        api.getProductTags(product.id).then(response => {
          const productTags = response.data || [];
          const tagIds = productTags.map(tag => tag.id);
          // 确保布尔值类型正确转换
          const formData = {
            ...product,
            available: Boolean(product.available),
            unlimited_supply: Boolean(product.unlimited_supply),
            tagIds: tagIds
          };
          form.setFieldsValue(formData);
        }).catch(error => {
          console.error('获取商品标签失败:', error);
          // 确保布尔值类型正确转换，即使获取标签失败
          const formData = {
            ...product,
            available: Boolean(product.available),
            unlimited_supply: Boolean(product.unlimited_supply)
          };
          form.setFieldsValue(formData);
        });
        setImagePreview(product.image_url || '');
      } else {
        console.log('创建新商品');
        form.resetFields();
        // 设置新商品的默认值
        form.setFieldsValue({
          unlimited_supply: false,
          available_num: 100,
          available: true
        });
        setImagePreview('');
      }
    }, 100);
  };

  const showOrderDetail = async (order) => {
    try {
      const response = await api.getAdminOrderDetail(order.id);
      setSelectedOrder(response.data);
      setOrderDetailVisible(true);
    } catch (error) {
      message.error('获取订单详情失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const { tagIds, ...productData } = values;
      
      
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, productData);
        // 更新商品标签
        if (tagIds) {
          await api.setProductTags(editingProduct.id, tagIds);
        } else {
          await api.setProductTags(editingProduct.id, []);
        }
        message.success('商品更新成功');
        console.log('商品更新成功:', values);
      } else {
        const response = await api.createProduct(productData);
        // 为新商品设置标签
        if (tagIds && tagIds.length > 0) {
          console.log(`为新商品 ${response.data.id} 设置标签:`, tagIds);
          await api.setProductTags(response.data.id, tagIds);
        }
        message.success('商品创建成功');
        console.log('商品创建成功:', values);
      }
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteProduct(id);
      message.success('商品删除成功');
      fetchProducts();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status);
      message.success('订单状态已更新');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (error) {
      message.error('更新订单状态失败');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'orange', text: '待接单', icon: <ClockCircleOutlined /> },
      'preparing': { color: 'blue', text: '制作中', icon: <ClockCircleOutlined /> },
      'ready': { color: 'green', text: '待取餐', icon: <CheckOutlined /> },
      'completed': { color: 'gray', text: '已完成', icon: <CheckOutlined /> },
      'cancelled': { color: 'red', text: '已取消', icon: null }
    };
    const config = statusMap[status] || { color: 'default', text: status, icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
  };

  const productColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      ellipsis: true
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (price) => `¥${price}`
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category) => {
        // 从分类列表中找到对应的显示名称
        const categoryItem = categories.find(cat => cat.name === category);
        return categoryItem ? categoryItem.display_name : category;
      }
    },
    {
      title: '状态',
      dataIndex: 'available',
      key: 'available',
      width: 80,
      render: (available) => (
        <Tag color={available ? 'green' : 'red'}>
          {available ? '可用' : '不可用'}
        </Tag>
      )
    },
    {
      title: '库存',
      key: 'inventory',
      width: 100,
      render: (_, record) => {
        if (record.unlimited_supply) {
          return <Tag color="blue">不限量</Tag>;
        }
        const stockNum = record.available_num || 0;
        const color = stockNum > 10 ? 'green' : stockNum > 0 ? 'orange' : 'red';
        return (
          <Tag color={color}>
            {stockNum} 件
          </Tag>
        );
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags) => (
        <div>
          {tags && tags.length > 0 ? (
            tags.map(tag => (
              <Tag key={tag.id} color={tag.color || 'gold'} style={{ marginBottom: 4 }}>
                {tag.name}
              </Tag>
            ))
          ) : (
            <Tag color="default">无标签</Tag>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => showProductVariantModal(record)}
            title="配置细分"
          >
            细分
          </Button>
          <Popconfirm
            title="确定删除这个商品吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              title="删除商品"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id) => `#${id}`
    },
    {
      title: '取单号',
      dataIndex: 'pickup_number',
      key: 'pickup_number',
      width: 100,
      render: (pickup_number) => (
        <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
          {pickup_number}
        </Text>
      )
    },
    {
      title: '客户',
      dataIndex: 'username',
      key: 'username',
      width: 100
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 100,
      render: (amount) => `¥${amount}`
    },
    {
      title: '商品数量',
      dataIndex: 'item_count',
      key: 'item_count',
      width: 100,
      render: (count) => `${count} 件`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status)
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => formatDate(date)
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => showOrderDetail(record)}
          >
            查看详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleOrderStatusChange(record.id, 'preparing')}
            >
              接单
            </Button>
          )}
          {record.status === 'preparing' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleOrderStatusChange(record.id, 'ready')}
            >
              制作完成
            </Button>
          )}
          {record.status === 'ready' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleOrderStatusChange(record.id, 'completed')}
            >
              确认取餐
            </Button>
          )}
          {['pending', 'preparing'].includes(record.status) && (
            <Popconfirm
              title="确定取消这个订单吗？"
              onConfirm={() => handleOrderStatusChange(record.id, 'cancelled')}
            >
              <Button
                danger
                size="small"
              >
                取消订单
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const getOrderCountByStatus = (status) => {
    return (orders || []).filter(order => order.status === status).length;
  };

  const getUncompletedOrderCount = () => {
    return (orders || []).filter(order => order.status === 'pending' || order.status === 'preparing' || order.status === 'ready').length;
  };

  // 管理员管理相关函数
  const fetchAdminList = async () => {
    try {
      const response = await api.getAdminList();
      setAdminList(response.data || []);
    } catch (error) {
      message.error('获取管理员列表失败');
      setAdminList([]);
    }
  };

  const handleAddAdmin = async (values) => {
    try {
      await api.registerAdmin(values.username, values.password);
      message.success('管理员添加成功');
      setAdminModalVisible(false);
      adminForm.resetFields();
      fetchAdminList();
    } catch (error) {
      message.error(error.response?.data?.error || '添加管理员失败');
    }
  };

  const handleChangePassword = async (values) => {
    try {
      await api.changeAdminPassword(values.currentPassword, values.newPassword);
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.error || '密码修改失败');
    }
  };

  const handleDeleteAdmin = (adminId, username) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除管理员 "${username}" 吗？此操作不可撤销。`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.deleteAdmin(adminId);
          message.success('管理员删除成功');
          fetchAdminList();
        } catch (error) {
          message.error(error.response?.data?.error || '删除管理员失败');
        }
      }
    });
  };

  // 图片上传处理
  const handleImageUpload = async (file) => {
    setImageUploading(true);
    try {
      const response = await api.uploadImage(file);
      const imageUrl = response.data.imageUrl;
      
      // 更新表单中的图片URL
      form.setFieldsValue({ image_url: imageUrl });
      setImagePreview(imageUrl);
      
      message.success('图片上传成功');
      return false; // 阻止默认上传行为
    } catch (error) {
      message.error(error.response?.data?.error || '图片上传失败');
      return false;
    } finally {
      setImageUploading(false);
    }
  };

  // 图片URL输入变化处理
  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setImagePreview(url);
  };

  // 获取所有客户
  const fetchCustomers = async () => {
    setCustomerLoading(true);
    try {
      const response = await api.getAllCustomers();
      // 确保返回的是数组数据
      const customersData = response.data?.data || response.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      message.error('获取客户列表失败');
      setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };



  // 显示客户详情
  const showCustomerDetail = async (customer) => {
    try {
      const response = await api.getCustomerDetail(customer.id);
      
      // 根据后端API返回的数据结构，应该是 { success: true, data: { user: {...}, orders: [...] } }
      // 所以 response.data 应该包含 { success: true, data: {...} }
      // 我们需要的实际数据在 response.data.data 中
      const customerData = response.data?.data || response.data;
      
      setSelectedCustomer(customerData);
      setCustomerDetailVisible(true);
    } catch (error) {
      console.error('获取客户详情失败:', error);
      message.error('获取客户详情失败');
    }
  };

  // 删除顾客账号
  const handleDeleteCustomer = (customer) => {
    Modal.confirm({
      title: '确认删除顾客账号',
      content: (
        <div>
          <p>确定要删除顾客 <strong>{customer.username}</strong> 的账号吗？</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            ⚠️ 此操作将同时删除该用户的所有订单和购物车数据，且无法恢复！
          </p>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            用户信息：
            <br />• 用户ID: {customer.id}
            <br />• 注册时间: {formatDate(customer.created_at)}
            <br />• 已完成订单数量: {customer.total_orders} 个
            <br />• 消费总额: ¥{customer.total_spent || 0}
          </div>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.deleteCustomer(customer.id);
          message.success(`顾客 ${customer.username} 已删除`);
          fetchCustomers(); // 刷新顾客列表
        } catch (error) {
          message.error(error.response?.data?.error || '删除失败');
        }
      },
    });
  };

  // 显示编辑用户名模态框
  const showEditUsernameModal = (customer) => {
    setEditingCustomer(customer);
    setEditUsernameModalVisible(true);
    usernameForm.setFieldsValue({
      username: customer.username
    });
  };

  // 处理用户名编辑提交
  const handleUsernameSubmit = async (values) => {
    if (!editingCustomer || !editingCustomer.id) {
      message.error('编辑的顾客信息有误');
      return;
    }
    
    try {
      const response = await api.updateCustomerUsername(editingCustomer.id, values.username);
      message.success(response.data.message || '用户名修改成功');
      setEditUsernameModalVisible(false);
      usernameForm.resetFields();
      setEditingCustomer(null);
      fetchCustomers(); // 刷新顾客列表
    } catch (error) {
      message.error(error.response?.data?.error || '修改失败');
    }
  };

  // 取消编辑用户名
  const cancelEditUsername = () => {
    setEditUsernameModalVisible(false);
    usernameForm.resetFields();
    setEditingCustomer(null);
  };



  // 显示状态修改模态框
  const showStatusModal = (order) => {
    setSelectedOrderForStatus(order);
    statusForm.setFieldsValue({ status: order.status });
    setStatusModalVisible(true);
  };

  // 处理状态修改提交
  const handleStatusSubmit = async (values) => {
    if (!selectedOrderForStatus || !selectedOrderForStatus.id) {
      message.error('选择的订单信息有误');
      return;
    }
    
    try {
      if (values.status === selectedOrderForStatus.status) {
        message.warning('状态未发生变化');
        return;
      }
      
      await handleOrderStatusChange(selectedOrderForStatus.id, values.status);
      setStatusModalVisible(false);
      statusForm.resetFields();
      setSelectedOrderForStatus(null);
    } catch (error) {
      message.error('状态修改失败');
    }
  };

  // 取消状态修改
  const cancelStatusModal = () => {
    setStatusModalVisible(false);
    statusForm.resetFields();
    setSelectedOrderForStatus(null);
  };

  // 获取筛选和排序后的商品列表
  const getSortedProducts = () => {
    if (!products || products.length === 0) return [];
    
    let filteredProducts = [...products];
    
    // 应用筛选条件
    if (productFilters.category !== 'all') {
      filteredProducts = filteredProducts.filter(product => product.category === productFilters.category);
    }
    
    if (productFilters.status !== 'all') {
      if (productFilters.status === 'available') {
        filteredProducts = filteredProducts.filter(product => product.available);
      } else if (productFilters.status === 'unavailable') {
        filteredProducts = filteredProducts.filter(product => !product.available);
      }
    }
    
    if (productFilters.inventory !== 'all') {
      if (productFilters.inventory === 'unlimited') {
        filteredProducts = filteredProducts.filter(product => product.unlimited_supply);
      } else if (productFilters.inventory === 'in_stock') {
        filteredProducts = filteredProducts.filter(product => !product.unlimited_supply && (product.available_num || 0) > 0);
      } else if (productFilters.inventory === 'out_of_stock') {
        filteredProducts = filteredProducts.filter(product => !product.unlimited_supply && (product.available_num || 0) === 0);
      }
    }
    
    // 搜索关键词筛选
    if (productFilters.search.trim()) {
      const searchTerm = productFilters.search.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // 应用排序
    switch (productSortType) {
      case 'id-asc':
        filteredProducts.sort((a, b) => a.id - b.id);
        break;
      case 'id-desc':
        filteredProducts.sort((a, b) => b.id - a.id);
        break;
      case 'name-pinyin':
        filteredProducts.sort((a, b) => {
          // 使用 localeCompare 进行中文拼音排序
          return a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'accent' });
        });
        break;
      case 'price-asc':
        filteredProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-desc':
        filteredProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      default:
        // 默认使用ID升序
        filteredProducts.sort((a, b) => a.id - b.id);
        break;
    }
    
    return filteredProducts;
  };

  // 处理商品排序变化
  const handleProductSort = (sortType) => {
    setProductSortType(sortType);
  };

  // 处理商品筛选变化
  const handleProductFilter = (filterType, value) => {
    setProductFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // 重置商品筛选
  const resetProductFilters = () => {
    setProductFilters({
      category: 'all',
      status: 'all',
      inventory: 'all',
      search: ''
    });
  };

  // 获取筛选后的订单列表
  const getFilteredOrders = () => {
    let filteredOrders = [...(orders || [])];
    
    // 按取单号筛选
    if (orderFilters.pickupNumber.trim()) {
      filteredOrders = filteredOrders.filter(order => 
        order.pickup_number && order.pickup_number.toString().toLowerCase().includes(orderFilters.pickupNumber.toLowerCase())
      );
    }
    
    // 按客户名筛选
    if (orderFilters.customerName.trim()) {
      filteredOrders = filteredOrders.filter(order => 
        order.username && order.username.toLowerCase().includes(orderFilters.customerName.toLowerCase())
      );
    }
    
    // 按状态筛选
    if (orderFilters.status && orderFilters.status !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === orderFilters.status);
    }
    
    // 按日期筛选
    if (orderFilters.startDate) {
      const startDate = new Date(orderFilters.startDate);
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate;
      });
    }
    
    if (orderFilters.endDate) {
      const endDate = new Date(orderFilters.endDate + ' 23:59:59'); // 包含整天
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate <= endDate;
      });
    }
    
    return filteredOrders;
  };

  // 处理订单筛选变化
  const handleOrderFilter = (filterType, value) => {
    setOrderFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // 重置订单筛选
  const resetOrderFilters = () => {
    setOrderFilters({
      pickupNumber: '',
      customerName: '',
      status: 'all',
      startDate: '',
      endDate: ''
    });
  };

  // 获取所有标签
  const fetchAllTags = async () => {
    try {
      const response = await api.getAllTags();
      setAllTags(response.data || []);
    } catch (error) {
      console.error('获取标签失败:', error);
      setAllTags([]);
    }
  };

  // 创建标签
  const handleCreateTag = async (values) => {
    try {
      await api.createTag(values.name, values.color);
      message.success('标签创建成功');
      setTagModalVisible(false);
      tagForm.resetFields();
      fetchAllTags();
    } catch (error) {
      message.error(error.response?.data?.error || '创建标签失败');
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId, tagName) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除标签 "${tagName}" 吗？此操作将移除所有商品的该标签关联。`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.deleteTag(tagId);
          message.success('标签删除成功');
          fetchAllTags();
          fetchProducts(); // 重新获取商品数据
        } catch (error) {
          message.error(error.response?.data?.error || '删除标签失败');
        }
      }
    });
  };

  // 细分类型管理相关函数
  const fetchVariantTypes = async () => {
    setVariantTypeLoading(true);
    try {
      const response = await api.getVariantTypes();
      setVariantTypes(response.data || []);
    } catch (error) {
      message.error('获取细分类型失败');
      setVariantTypes([]);
    } finally {
      setVariantTypeLoading(false);
    }
  };

  const showVariantTypeModal = (variantType = null) => {
    setEditingVariantType(variantType);
    setVariantTypeModalVisible(true);
    if (variantType) {
      variantTypeForm.setFieldsValue(variantType);
    } else {
      variantTypeForm.resetFields();
    }
  };

  const showVariantOptionModal = (variantType, option = null) => {
    setEditingVariantType(variantType);
    setEditingVariantOption(option);
    setVariantOptionModalVisible(true);
    if (option) {
      variantOptionForm.setFieldsValue(option);
    } else {
      variantOptionForm.resetFields();
      variantOptionForm.setFieldsValue({ variant_type_id: variantType.id });
    }
  };

  const showProductVariantModal = async (product) => {
    setSelectedProductForVariant(product);
    setProductVariantModalVisible(true);
    
    // 确保细分类型数据已加载
    if (!variantTypes || variantTypes.length === 0) {
      await fetchVariantTypes();
    }
    
    // 加载商品的细分类型配置
    try {
      const response = await api.getProductVariants(product.id);
      const productVariants = response.data || [];
      setProductVariantTypes(productVariants);
    } catch (error) {
      console.error('获取商品细分类型配置失败:', error);
      setProductVariantTypes([]);
    }
  };

  // 显示添加细分类型模态框
  const showAddVariantModal = async () => {
    // 确保细分类型数据已加载
    if (!variantTypes || variantTypes.length === 0) {
      await fetchVariantTypes();
    }
    
    setAddVariantModalVisible(true);
    addVariantForm.resetFields();
    setSelectedVariantTypeOptions([]);
  };

  // 处理细分类型选择变化
  const handleVariantTypeChange = (variantTypeId) => {
    if (variantTypeId) {
      const selectedType = variantTypes.find(vt => vt.id === variantTypeId);
      if (selectedType && selectedType.options) {
        setSelectedVariantTypeOptions(selectedType.options);
        // 默认选择所有选项
        addVariantForm.setFieldsValue({
          enabled_options: selectedType.options.map(option => option.id)
        });
      } else {
        setSelectedVariantTypeOptions([]);
      }
    } else {
      setSelectedVariantTypeOptions([]);
    }
  };

  // 添加细分类型到商品
  const handleAddVariantToProduct = async (values) => {
    try {
      await api.configureProductVariants(selectedProductForVariant.id, values.variant_type_id, {
        is_required: values.is_required || false,
        sort_order: values.sort_order || 0
      });
      
      // 如果选择了具体的选项，配置选项
      if (values.enabled_options && values.enabled_options.length > 0) {
        await api.configureProductVariantOptions(
          selectedProductForVariant.id, 
          values.variant_type_id, 
          values.enabled_options
        );
      }
      
      message.success('细分类型添加成功');
      setAddVariantModalVisible(false);
      // 重新加载商品细分类型配置
      const response = await api.getProductVariants(selectedProductForVariant.id);
      setProductVariantTypes(response.data || []);
    } catch (error) {
      message.error('添加失败');
    }
  };

  // 删除商品的细分类型
  const handleRemoveVariantFromProduct = (variantTypeId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要从此商品中移除这个细分类型吗？',
      onOk: async () => {
        try {
          await api.removeProductVariant(selectedProductForVariant.id, variantTypeId);
          message.success('细分类型移除成功');
          // 重新加载商品细分类型配置
          const response = await api.getProductVariants(selectedProductForVariant.id);
          setProductVariantTypes(response.data || []);
        } catch (error) {
          message.error('移除失败');
        }
      },
    });
  };

  // 更新商品细分类型配置
  const handleUpdateProductVariant = async (variantTypeId, config) => {
    try {
      await api.configureProductVariants(selectedProductForVariant.id, variantTypeId, config);
      message.success('配置更新成功');
      // 重新加载商品细分类型配置
      const response = await api.getProductVariants(selectedProductForVariant.id);
      setProductVariantTypes(response.data || []);
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 显示编辑细分配置模态框
  const showEditVariantConfigModal = (variantType) => {
    setEditingVariantConfig(variantType);
    setEditVariantConfigModalVisible(true);
    // 设置表单默认值
    variantConfigForm.setFieldsValue({
      is_required: variantType.is_required,
      sort_order: variantType.sort_order
    });
  };

  // 处理细分配置提交
  const handleVariantConfigSubmit = async (values) => {
    try {
      await handleUpdateProductVariant(editingVariantConfig.id, values);
      setEditVariantConfigModalVisible(false);
      variantConfigForm.resetFields();
      setEditingVariantConfig(null);
    } catch (error) {
      // 错误处理已在 handleUpdateProductVariant 中进行
    }
  };

  // 显示选项配置模态框
  const showOptionConfigModal = async (variantType) => {
    setCurrentVariantType(variantType);
    setOptionConfigModalVisible(true);
    
    try {
      // 获取当前商品此细分类型的选项配置
      const response = await api.getProductVariantOptions(selectedProductForVariant.id, variantType.id);
      const options = response.data || [];
      
      // 保存完整的选项列表，并按权重排序
      const sortedOptions = [...options].sort((a, b) => {
        // 先按 product_sort_order 排序（如果存在），然后按 sort_order 排序
        const aOrder = a.product_sort_order !== null ? a.product_sort_order : a.sort_order || 999;
        const bOrder = b.product_sort_order !== null ? b.product_sort_order : b.sort_order || 999;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        // 如果排序相同，按显示名称排序
        return (a.display_name || '').localeCompare(b.display_name || '');
      });
      setCurrentVariantOptions(sortedOptions);
      
      // 设置表单默认值
      const enabledOptions = options
        .filter(option => option.product_enabled)
        .map(option => option.id);
      
      optionConfigForm.setFieldsValue({
        enabled_options: enabledOptions
      });
    } catch (error) {
      console.error('获取选项配置失败:', error);
      // 如果获取失败，使用默认选项列表，并按权重排序
      const defaultOptions = [...(variantType.options || [])].sort((a, b) => {
        const aOrder = a.sort_order || 999;
        const bOrder = b.sort_order || 999;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        return (a.display_name || '').localeCompare(b.display_name || '');
      });
      setCurrentVariantOptions(defaultOptions);
      optionConfigForm.setFieldsValue({
        enabled_options: defaultOptions.map(option => option.id) || []
      });
    }
  };

  // 处理选项配置提交
  const handleOptionConfigSubmit = async (values) => {
    try {
      await api.configureProductVariantOptions(
        selectedProductForVariant.id,
        currentVariantType.id,
        values.enabled_options || []
      );
      message.success('选项配置更新成功');
      setOptionConfigModalVisible(false);
      // 重新加载商品细分类型配置
      const response = await api.getProductVariants(selectedProductForVariant.id);
      setProductVariantTypes(response.data || []);
    } catch (error) {
      message.error('配置更新失败');
    }
  };

  const handleVariantTypeSubmit = async (values) => {
    try {
      if (editingVariantType) {
        await api.updateVariantType(editingVariantType.id, values);
        message.success('细分类型更新成功');
      } else {
        await api.createVariantType(values);
        message.success('细分类型创建成功');
      }
      setVariantTypeModalVisible(false);
      fetchVariantTypes();
    } catch (error) {
      console.error('细分类型操作失败:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || '操作失败';
      message.error(errorMsg);
    }
  };

  const handleVariantOptionSubmit = async (values) => {
    try {
      if (editingVariantOption) {
        await api.updateVariantOption(editingVariantOption.id, values);
        message.success('细分选项更新成功');
      } else {
        await api.createVariantOption(values);
        message.success('细分选项创建成功');
      }
      setVariantOptionModalVisible(false);
      fetchVariantTypes();
    } catch (error) {
      console.error('细分选项操作失败:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || '操作失败';
      message.error(errorMsg);
    }
  };



  const handleDeleteVariantType = (variantType) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除细分类型 "${variantType.display_name}" 吗？这将删除所有相关的选项和配置。`,
      onOk: async () => {
        try {
          await api.deleteVariantType(variantType.id);
          message.success('细分类型删除成功');
          fetchVariantTypes();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleDeleteVariantOption = (option) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选项 "${option.display_name}" 吗？如果有商品正在使用此选项，相关配置也会被移除。`,
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          console.log('正在删除选项:', option);
          await api.deleteVariantOption(option.id);
          message.success('选项删除成功');
          
          // 刷新细分类型数据
          await fetchVariantTypes();
          
          // 如果当前有商品细分配置模态框打开，也需要刷新商品配置
          if (productVariantModalVisible && selectedProductForVariant) {
            console.log('刷新商品细分配置...');
            try {
              const response = await api.getProductVariants(selectedProductForVariant.id);
              const productVariants = response.data || [];
              setProductVariantTypes(productVariants);
            } catch (error) {
              console.error('刷新商品细分配置失败:', error);
            }
          }
        } catch (error) {
          console.error('删除选项失败:', error);
          const errorMsg = error.response?.data?.error || error.message || '删除失败';
          message.error(errorMsg);
        }
      },
    });
  };

  // 分类管理相关函数
  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);
      const response = await api.getAllCategoriesAdmin();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('获取分类失败');
      setCategories([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const showCategoryModal = (category = null) => {
    setEditingCategory(category);
    setCategoryModalVisible(true);
    
    if (category) {
      categoryForm.setFieldsValue({
        name: category.name,
        display_name: category.display_name,
        description: category.description || '',
        sort_order: category.sort_order || 0,
        enabled: category.enabled
      });
    } else {
      categoryForm.resetFields();
      categoryForm.setFieldsValue({
        enabled: true,
        sort_order: 0
      });
    }
  };

  const handleCategorySubmit = async (values) => {
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, values);
        message.success('分类更新成功');
      } else {
        await api.createCategory(values);
        message.success('分类创建成功');
      }
      
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      setEditingCategory(null);
      fetchCategories();
      
      // 如果修改了分类，刷新商品列表
      fetchProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || '操作失败';
      message.error(errorMsg);
    }
  };

  const handleDeleteCategory = (category) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除分类 "${category.display_name}" 吗？`,
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.deleteCategory(category.id);
          message.success('分类删除成功');
          fetchCategories();
          // 刷新商品列表
          fetchProducts();
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message || '删除失败';
          message.error(errorMsg);
        }
      },
    });
  };

  const getCategoryStats = async (category) => {
    try {
      const response = await api.getCategoryStats(category.id);
      const stats = response.data.data.stats;
      Modal.info({
        title: `分类统计 - ${category.display_name}`,
        content: (
          <div>
            <p>分类名称: {category.name}</p>
            <p>显示名称: {category.display_name}</p>
            <p>描述: {category.description || '无'}</p>
            <p>关联商品数量: {stats.product_count} 个</p>
            <p>状态: {category.enabled ? '启用' : '禁用'}</p>
          </div>
        ),
      });
    } catch (error) {
      message.error('获取分类统计失败');
    }
  };

  // 管理员列表表格列
  const adminColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.username !== 'admin' && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteAdmin(record.id, record.username)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];




  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px 0' }}>
        <div className="container">
          <Card>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
              <SettingOutlined /> 管理后台
            </Title>

            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={[
                {
                  key: 'orders',
                  label: (
                    <span>
                      <ShoppingOutlined style={{ marginRight: 8 }} />
                      订单管理
                      <Badge count={getUncompletedOrderCount()} style={{ marginLeft: 8 }} />
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>
                          订单管理
                        </Title>
                        <Button 
                          type="primary" 
                          onClick={() => fetchOrders()}
                        >
                          刷新订单
                        </Button>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                          <Space wrap>
                            <Input
                              placeholder="搜索取单号"
                              value={orderFilters.pickupNumber}
                              onChange={(e) => handleOrderFilter('pickupNumber', e.target.value)}
                              style={{ width: 150 }}
                              allowClear
                            />
                            <Input
                              placeholder="搜索客户名"
                              value={orderFilters.customerName}
                              onChange={(e) => handleOrderFilter('customerName', e.target.value)}
                              style={{ width: 150 }}
                              allowClear
                            />
                            <Select
                              value={orderFilters.status}
                              style={{ width: 120 }}
                              onChange={(value) => handleOrderFilter('status', value)}
                            >
                              <Select.Option value="all">全部状态</Select.Option>
                              <Select.Option value="pending">待接单</Select.Option>
                              <Select.Option value="preparing">制作中</Select.Option>
                              <Select.Option value="ready">待取餐</Select.Option>
                              <Select.Option value="completed">已完成</Select.Option>
                              <Select.Option value="cancelled">已取消</Select.Option>
                            </Select>
                            <Input
                              placeholder="开始日期 (YYYY-MM-DD)"
                              value={orderFilters.startDate}
                              onChange={(e) => handleOrderFilter('startDate', e.target.value)}
                              style={{ width: 180 }}
                            />
                            <Input
                              placeholder="结束日期 (YYYY-MM-DD)"
                              value={orderFilters.endDate}
                              onChange={(e) => handleOrderFilter('endDate', e.target.value)}
                              style={{ width: 180 }}
                            />
                            <Button onClick={resetOrderFilters}>
                              重置筛选
                            </Button>
                          </Space>
                        </div>
                        <Text type="secondary">
                          {getFilteredOrders().length !== (orders || []).length ? (
                            <>
                              筛选结果: {getFilteredOrders().length} 个订单 (共 {(orders || []).length} 个)，
                            </>
                          ) : (
                            <>
                              共 {(orders || []).length} 个订单，
                            </>
                          )}
                          待处理 {getOrderCountByStatus('pending')} 个，
                          制作中 {getOrderCountByStatus('preparing')} 个，
                          待取餐 {getOrderCountByStatus('ready')} 个
                        </Text>
                      </div>

                      <Table
                        columns={[
                          {
                            title: '订单ID',
                            dataIndex: 'id',
                            key: 'id',
                            width: 80,
                          },
                          {
                            title: '取单号',
                            dataIndex: 'pickup_number',
                            key: 'pickup_number',
                            width: 100,
                            render: (text) => (
                              <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                                {text}
                              </Text>
                            ),
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 200,
                            render: (_, record) => (
                              <Space>
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<EyeOutlined />}
                                  onClick={() => showOrderDetail(record)}
                                >
                                  详情
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => showStatusModal(record)}
                                >
                                  修改状态
                                </Button>
                                {record.status === 'pending' && (
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleOrderStatusChange(record.id, 'preparing')}
                                  >
                                    接单
                                  </Button>
                                )}
                                {record.status === 'preparing' && (
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleOrderStatusChange(record.id, 'ready')}
                                  >
                                    完成
                                  </Button>
                                )}
                                {record.status === 'ready' && (
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleOrderStatusChange(record.id, 'completed')}
                                  >
                                    取餐
                                  </Button>
                                )}
                              </Space>
                            ),
                          },
                          {
                            title: '客户',
                            dataIndex: 'username',
                            key: 'username',
                            width: 120,
                          },
                          {
                            title: '金额',
                            dataIndex: 'total_amount',
                            key: 'total_amount',
                            width: 100,
                            render: (amount) => `¥${amount}`,
                          },
                          {
                            title: '状态',
                            dataIndex: 'status',
                            key: 'status',
                            width: 120,
                            render: (status) => getStatusTag(status),
                          },
                          {
                            title: '下单时间',
                            dataIndex: 'created_at',
                            key: 'created_at',
                            width: 160,
                            render: (text) => formatDate(text),
                          },
                        ]}
                        dataSource={getFilteredOrders()}
                        rowKey="id"
                        loading={orderLoading}
                        pagination={{
                          total: getFilteredOrders().length,
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total) => `共 ${total} 个订单`,
                        }}
                        scroll={{ x: 1200 }}
                      />
                    </div>
                  )
                },
                {
                  key: 'products',
                  label: (
                    <span>
                      <SettingOutlined style={{ marginRight: 8 }} />
                      商品管理
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between', 
                        alignItems: isMobile ? 'stretch' : 'center', 
                        marginBottom: 24,
                        gap: isMobile ? 16 : 0
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: isMobile ? 'flex-start' : 'center', 
                          gap: isMobile ? 12 : 16 
                        }}>
                          <Title level={3} style={{ margin: 0 }}>
                            {productSubView === 'products' && '商品管理'}
                            {productSubView === 'categories' && '分类管理'}
                            {productSubView === 'variants' && '细分管理'}
                          </Title>
                          
                          {productSubView !== 'products' && (
                            <Button
                              icon={<ArrowLeftOutlined />}
                              onClick={() => setProductSubView('products')}
                              style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                              返回商品管理
                            </Button>
                          )}
                        </div>
                        
                        <div style={{ 
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: isMobile ? 8 : 8,
                          width: isMobile ? '100%' : 'auto'
                        }}>
                          {productSubView === 'products' && (
                            <>
                              <Button
                                icon={<SettingOutlined />}
                                onClick={() => {
                                  setProductSubView('categories');
                                  if (!categories || categories.length === 0) {
                                    fetchCategories();
                                  }
                                }}
                                style={{ width: isMobile ? '100%' : 'auto' }}
                              >
                                分类管理
                              </Button>
                              <Button
                                icon={<SettingOutlined />}
                                onClick={() => {
                                  setProductSubView('variants');
                                  if (!variantTypes || variantTypes.length === 0) {
                                    fetchVariantTypes();
                                  }
                                }}
                                style={{ width: isMobile ? '100%' : 'auto' }}
                              >
                                细分管理
                              </Button>
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => showModal()}
                                style={{ width: isMobile ? '100%' : 'auto' }}
                              >
                                添加商品
                              </Button>
                            </>
                          )}
                          
                          {productSubView === 'categories' && (
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => showCategoryModal()}
                              style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                              添加分类
                            </Button>
                          )}
                          
                          {productSubView === 'variants' && (
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => showVariantTypeModal()}
                              style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                              添加细分类型
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 商品列表视图 */}
                      {productSubView === 'products' && (
                        <div>
                          {/* 筛选和排序控件 */}
                          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 8 }}>
                            {/* 第一行：排序 */}
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                              <Text strong style={{ minWidth: 60 }}>排序：</Text>
                              <Select
                                value={productSortType}
                                style={{ width: 180 }}
                                onChange={handleProductSort}
                              >
                                <Select.Option value="id-asc">ID 升序 ↑</Select.Option>
                                <Select.Option value="id-desc">ID 降序 ↓</Select.Option>
                                <Select.Option value="name-pinyin">名称拼音 A-Z</Select.Option>
                                <Select.Option value="price-asc">价格升序 ↑</Select.Option>
                                <Select.Option value="price-desc">价格降序 ↓</Select.Option>
                              </Select>
                            </div>

                            {/* 第二行：搜索 */}
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                              <Text strong style={{ minWidth: 60 }}>搜索：</Text>
                              <Input
                                placeholder="搜索商品名称或描述"
                                value={productFilters.search}
                                onChange={(e) => handleProductFilter('search', e.target.value)}
                                allowClear
                                style={{ flex: 1, maxWidth: 400 }}
                              />
                            </div>

                            {/* 第三行：筛选 */}
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                              <Text strong style={{ minWidth: 60 }}>筛选：</Text>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text>分类：</Text>
                                <Select
                                  value={productFilters.category}
                                  style={{ width: 120 }}
                                  onChange={(value) => handleProductFilter('category', value)}
                                >
                                  <Select.Option value="all">全部</Select.Option>
                                  {(categories || []).map(category => (
                                    <Select.Option key={category.name} value={category.name}>
                                      {category.emoji} {category.display_name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text>状态：</Text>
                                <Select
                                  value={productFilters.status}
                                  style={{ width: 100 }}
                                  onChange={(value) => handleProductFilter('status', value)}
                                >
                                  <Select.Option value="all">全部</Select.Option>
                                  <Select.Option value="available">可用</Select.Option>
                                  <Select.Option value="unavailable">不可用</Select.Option>
                                </Select>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text>库存：</Text>
                                <Select
                                  value={productFilters.inventory}
                                  style={{ width: 100 }}
                                  onChange={(value) => handleProductFilter('inventory', value)}
                                >
                                  <Select.Option value="all">全部</Select.Option>
                                  <Select.Option value="unlimited">不限量</Select.Option>
                                  <Select.Option value="in_stock">有库存</Select.Option>
                                  <Select.Option value="out_of_stock">无库存</Select.Option>
                                </Select>
                              </div>
                              
                              <Button onClick={resetProductFilters} type="default">
                                重置筛选
                              </Button>
                            </div>
                            
                            {/* 统计信息和活跃筛选条件 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                              <Text type="secondary">
                                显示 {getSortedProducts().length} / {(products || []).length} 个商品
                              </Text>
                              {/* 活跃筛选条件提示 */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {productFilters.search && (
                                  <Tag closable onClose={() => handleProductFilter('search', '')}>
                                    搜索: {productFilters.search}
                                  </Tag>
                                )}
                                {productFilters.category !== 'all' && (
                                  <Tag closable onClose={() => handleProductFilter('category', 'all')}>
                                    分类: {(() => {
                                      const category = categories.find(cat => cat.name === productFilters.category);
                                      return category ? category.display_name : productFilters.category;
                                    })()}
                                  </Tag>
                                )}
                                {productFilters.status !== 'all' && (
                                  <Tag closable onClose={() => handleProductFilter('status', 'all')}>
                                    状态: {productFilters.status === 'available' ? '可用' : '不可用'}
                                  </Tag>
                                )}
                                {productFilters.inventory !== 'all' && (
                                  <Tag closable onClose={() => handleProductFilter('inventory', 'all')}>
                                    库存: {(() => {
                                      const inventoryMap = {
                                        'unlimited': '不限量',
                                        'in_stock': '有库存',
                                        'out_of_stock': '无库存'
                                      };
                                      return inventoryMap[productFilters.inventory];
                                    })()}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </div>

                          <Table
                            columns={productColumns}
                            dataSource={getSortedProducts()}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                              total: getSortedProducts().length,
                              pageSize: 10,
                              showSizeChanger: true,
                              showQuickJumper: true,
                              showTotal: (total, range) => {
                                const filteredCount = getSortedProducts().length;
                                const totalCount = (products || []).length;
                                if (filteredCount === totalCount) {
                                  return `共 ${total} 个商品`;
                                } else {
                                  return `显示 ${range[0]}-${range[1]} 项，共 ${filteredCount} 个商品（总计 ${totalCount} 个）`;
                                }
                              },
                            }}
                            scroll={{ x: 970 }}
                          />
                        </div>
                      )}

                      {/* 分类管理视图 */}
                      {productSubView === 'categories' && (
                        <div>
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">
                              共 {(categories || []).length} 个分类
                            </Text>
                          </div>

                          <Table
                            columns={[
                              {
                                title: 'ID',
                                dataIndex: 'id',
                                key: 'id',
                                width: 80,
                              },
                              {
                                title: '分类名称',
                                dataIndex: 'name',
                                key: 'name',
                                width: 120,
                                render: (text) => <Text code>{text}</Text>,
                              },
                              {
                                title: '显示名称',
                                dataIndex: 'display_name',
                                key: 'display_name',
                                width: 150,
                                render: (text) => <Text strong>{text}</Text>,
                              },
                              {
                                title: 'Emoji',
                                dataIndex: 'emoji',
                                key: 'emoji',
                                width: 80,
                                render: (emoji) => (
                                  <span style={{ fontSize: '20px' }}>{emoji || '📦'}</span>
                                ),
                              },
                              {
                                title: '描述',
                                dataIndex: 'description',
                                key: 'description',
                                ellipsis: true,
                              },
                              {
                                title: '排序',
                                dataIndex: 'sort_order',
                                key: 'sort_order',
                                width: 80,
                                render: (order) => <Text>{order}</Text>,
                              },
                              {
                                title: '状态',
                                dataIndex: 'enabled',
                                key: 'enabled',
                                width: 100,
                                render: (enabled) => (
                                  <Tag color={enabled ? 'green' : 'red'}>
                                    {enabled ? '启用' : '禁用'}
                                  </Tag>
                                ),
                              },
                              {
                                title: '操作',
                                key: 'action',
                                width: 180,
                                fixed: 'right',
                                render: (_, record) => (
                                  <Space size={4} style={{ flexWrap: 'wrap' }}>
                                    <Button
                                      type="primary"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => getCategoryStats(record)}
                                      title="查看统计"
                                    />
                                    <Button
                                      size="small"
                                      icon={<EditOutlined />}
                                      onClick={() => showCategoryModal(record)}
                                      title="编辑分类"
                                    />
                                    <Button
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => handleDeleteCategory(record)}
                                      title="删除分类"
                                    />
                                  </Space>
                                ),
                              },
                            ]}
                            dataSource={categories || []}
                            rowKey="id"
                            loading={categoryLoading}
                            pagination={{
                              total: (categories || []).length,
                              pageSize: 10,
                              showSizeChanger: true,
                              showQuickJumper: true,
                              showTotal: (total) => `共 ${total} 个分类`,
                            }}
                            scroll={{ x: 800 }}
                          />
                        </div>
                      )}

                      {/* 细分管理视图 */}
                      {productSubView === 'variants' && (
                        <div>
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">
                              共 {(variantTypes || []).length} 个细分类型
                            </Text>
                          </div>

                          {variantTypes.map(variantType => (
                            <Card
                              key={variantType.id}
                              style={{ marginBottom: 16 }}
                            >
                              {/* 移动端优化的标题区域 */}
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                  <span style={{ fontSize: '18px', marginRight: 8 }}>
                                    {variantType.emoji || '⚙️'}
                                  </span>
                                  <Text strong style={{ fontSize: '16px' }}>
                                    {variantType.display_name}
                                  </Text>
                                  {variantType.is_required && (
                                    <Tag color="red" size="small" style={{ marginLeft: 8 }}>
                                      必选
                                    </Tag>
                                  )}
                                </div>
                                
                                {/* 响应式按钮组 */}
                                <div style={{ 
                                  display: 'flex', 
                                  flexDirection: isMobile ? 'column' : 'row',
                                  flexWrap: 'wrap', 
                                  gap: 8
                                }}>
                                  <Button
                                    size={isMobile ? 'middle' : 'small'}
                                    icon={<PlusOutlined />}
                                    onClick={() => showVariantOptionModal(variantType)}
                                    style={{ 
                                      minWidth: 'auto',
                                      width: isMobile ? '100%' : 'auto'
                                    }}
                                  >
                                    添加选项
                                  </Button>
                                  <Button
                                    size={isMobile ? 'middle' : 'small'}
                                    icon={<EditOutlined />}
                                    onClick={() => showVariantTypeModal(variantType)}
                                    style={{ 
                                      minWidth: 'auto',
                                      width: isMobile ? '100%' : 'auto'
                                    }}
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    size={isMobile ? 'middle' : 'small'}
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeleteVariantType(variantType)}
                                    style={{ 
                                      minWidth: 'auto',
                                      width: isMobile ? '100%' : 'auto'
                                    }}
                                  >
                                    删除
                                  </Button>
                                </div>
                              </div>

                              {/* 描述 */}
                              {variantType.description && (
                                <div style={{ marginBottom: 16 }}>
                                  <Text type="secondary">{variantType.description}</Text>
                                </div>
                              )}

                              {/* 选项列表 */}
                              <div>
                                <Text strong>选项列表：</Text>
                                <div style={{ marginTop: 8 }}>
                                  {variantType.options && variantType.options.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {variantType.options.map(option => (
                                        <div 
                                          key={option.id} 
                                          style={{ 
                                            display: 'flex', 
                                            flexDirection: isMobile ? 'column' : 'row',
                                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                                            alignItems: isMobile ? 'stretch' : 'center',
                                            padding: isMobile ? '12px 16px' : '8px 12px', 
                                            border: '1px solid #f0f0f0', 
                                            borderRadius: 6,
                                            backgroundColor: '#fafafa'
                                          }}
                                        >
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ 
                                              fontWeight: 500,
                                              marginBottom: option.price_adjustment !== 0 ? 4 : 0
                                            }}>
                                              {option.display_name}
                                            </div>
                                            {option.price_adjustment !== 0 && (
                                              <Text 
                                                size="small" 
                                                style={{ 
                                                  color: option.price_adjustment > 0 ? '#f50' : '#52c41a',
                                                  fontSize: '12px'
                                                }}
                                              >
                                                {option.price_adjustment > 0 ? '+' : ''}¥{option.price_adjustment}
                                              </Text>
                                            )}
                                          </div>
                                          
                                          <div style={{ 
                                            display: 'flex', 
                                            flexDirection: isMobile ? 'column' : 'row',
                                            gap: isMobile ? 8 : 4, 
                                            marginLeft: isMobile ? 0 : 8,
                                            marginTop: isMobile ? 8 : 0
                                          }}>
                                            <Button
                                              type="text"
                                              size={isMobile ? 'small' : 'small'}
                                              icon={<EditOutlined />}
                                              onClick={() => showVariantOptionModal(variantType, option)}
                                              style={{ 
                                                padding: isMobile ? '8px 12px' : '4px 8px',
                                                minWidth: isMobile ? 60 : 32,
                                                height: isMobile ? 36 : 32,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: isMobile ? '100%' : 'auto'
                                              }}
                                              title="编辑选项"
                                            >
                                              {isMobile && '编辑'}
                                            </Button>
                                            <Button
                                              type="text"
                                              size={isMobile ? 'small' : 'small'}
                                              danger
                                              icon={<DeleteOutlined />}
                                              onClick={() => handleDeleteVariantOption(option)}
                                              style={{ 
                                                padding: isMobile ? '8px 12px' : '4px 8px',
                                                minWidth: isMobile ? 60 : 32,
                                                height: isMobile ? 36 : 32,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: isMobile ? '100%' : 'auto'
                                              }}
                                              title="删除选项"
                                            >
                                              {isMobile && '删除'}
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ 
                                      textAlign: 'center', 
                                      padding: '20px',
                                      backgroundColor: '#fafafa',
                                      borderRadius: 6,
                                      border: '1px dashed #d9d9d9'
                                    }}>
                                      <Text type="secondary">暂无选项，请先添加选项</Text>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}

                          {variantTypes.length === 0 && !variantTypeLoading && (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '50px 20px',
                              backgroundColor: '#fafafa',
                              borderRadius: 8,
                              border: '1px dashed #d9d9d9'
                            }}>
                              <Text type="secondary">暂无细分类型，请先添加细分类型</Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'admins',
                  label: (
                    <span>
                      <UserOutlined style={{ marginRight: 8 }} />
                      管理员管理
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                          管理员管理
                        </Title>
                        <Space>
                          <Button
                            type="primary"
                            icon={<LockOutlined />}
                            onClick={() => setPasswordModalVisible(true)}
                          >
                            修改密码
                          </Button>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setAdminModalVisible(true)}
                          >
                            添加管理员
                          </Button>
                        </Space>
                      </div>

                      <Table
                        columns={[
                          {
                            title: 'ID',
                            dataIndex: 'id',
                            key: 'id',
                            width: 80,
                          },
                          {
                            title: '用户名',
                            dataIndex: 'username',
                            key: 'username',
                          },
                          {
                            title: '创建时间',
                            dataIndex: 'created_at',
                            key: 'created_at',
                            render: (text) => new Date(text).toLocaleString('zh-CN'),
                          },
                          {
                            title: '操作',
                            key: 'action',
                            render: (_, record) => (
                              <Space size="middle">
                                {record.username !== 'admin' && (
                                  <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeleteAdmin(record.id, record.username)}
                                  >
                                    删除
                                  </Button>
                                )}
                              </Space>
                            ),
                          },
                        ]}
                        dataSource={adminList}
                        rowKey="id"
                        pagination={{
                          total: (adminList || []).length,
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total) => `共 ${total} 个管理员`,
                        }}
                      />

                      {/* 添加管理员模态框 */}
                      <Modal
                        title="添加管理员"
                        open={adminModalVisible}
                        onCancel={() => {
                          setAdminModalVisible(false);
                          adminForm.resetFields();
                        }}
                        footer={null}
                        width={500}
                      >
                        <Form
                          form={adminForm}
                          layout="vertical"
                          onFinish={handleAddAdmin}
                        >
                          <Form.Item
                            label="用户名"
                            name="username"
                            rules={[
                              { required: true, message: '请输入用户名' },
                              { min: 3, message: '用户名至少3位' },
                              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                            ]}
                          >
                            <Input placeholder="请输入用户名" />
                          </Form.Item>

                          <Form.Item
                            label="密码"
                            name="password"
                            rules={[
                              { required: true, message: '请输入密码' },
                              { min: 6, message: '密码至少6位' }
                            ]}
                          >
                            <Input.Password placeholder="请输入密码" />
                          </Form.Item>

                          <Form.Item
                            label="确认密码"
                            name="confirmPassword"
                            dependencies={['password']}
                            rules={[
                              { required: true, message: '请确认密码' },
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error('两次输入的密码不一致'));
                                },
                              }),
                            ]}
                          >
                            <Input.Password placeholder="请确认密码" />
                          </Form.Item>

                          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                              <Button onClick={() => {
                                setAdminModalVisible(false);
                                adminForm.resetFields();
                              }}>
                                取消
                              </Button>
                              <Button type="primary" htmlType="submit">
                                添加
                              </Button>
                            </Space>
                          </Form.Item>
                        </Form>
                      </Modal>

                      {/* 修改密码模态框 */}
                      <Modal
                        title="修改密码"
                        open={passwordModalVisible}
                        onCancel={() => {
                          setPasswordModalVisible(false);
                          passwordForm.resetFields();
                        }}
                        footer={null}
                        width={500}
                      >
                        <Form
                          form={passwordForm}
                          layout="vertical"
                          onFinish={handleChangePassword}
                        >
                          <Form.Item
                            label="当前密码"
                            name="currentPassword"
                            rules={[{ required: true, message: '请输入当前密码' }]}
                          >
                            <Input.Password placeholder="请输入当前密码" />
                          </Form.Item>

                          <Form.Item
                            label="新密码"
                            name="newPassword"
                            rules={[
                              { required: true, message: '请输入新密码' },
                              { min: 6, message: '新密码至少6位' }
                            ]}
                          >
                            <Input.Password placeholder="请输入新密码" />
                          </Form.Item>

                          <Form.Item
                            label="确认新密码"
                            name="confirmNewPassword"
                            dependencies={['newPassword']}
                            rules={[
                              { required: true, message: '请确认新密码' },
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error('两次输入的密码不一致'));
                                },
                              }),
                            ]}
                          >
                            <Input.Password placeholder="请确认新密码" />
                          </Form.Item>

                          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                              <Button onClick={() => {
                                setPasswordModalVisible(false);
                                passwordForm.resetFields();
                              }}>
                                取消
                              </Button>
                              <Button type="primary" htmlType="submit">
                                修改密码
                              </Button>
                            </Space>
                          </Form.Item>
                        </Form>
                      </Modal>
                    </div>
                  )
                },
                {
                  key: 'customers',
                  label: (
                    <span>
                      <UserOutlined style={{ marginRight: 8 }} />
                      顾客管理
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>
                          顾客管理
                        </Title>
                        <Button 
                          type="primary" 
                          onClick={() => fetchCustomers()}
                        >
                          刷新列表
                        </Button>
                      </div>

                                             <div style={{ marginBottom: 16 }}>
                         <Text type="secondary">
                           共 {Array.isArray(customers) ? customers.length : 0} 个注册顾客
                         </Text>
                       </div>

                      <Table
                        columns={[
                          {
                            title: '用户ID',
                            dataIndex: 'id',
                            key: 'id',
                            width: 80,
                          },
                          {
                            title: '用户名',
                            dataIndex: 'username',
                            key: 'username',
                            width: 150,
                            render: (text) => (
                              <Text strong>{text}</Text>
                            ),
                          },
                          {
                            title: '注册时间',
                            dataIndex: 'created_at',
                            key: 'created_at',
                            width: 160,
                            render: (text) => formatDate(text),
                          },
                          {
                            title: '已完成订单数量',
                            dataIndex: 'total_orders',
                            key: 'total_orders',
                            width: 100,
                            render: (count) => (
                              <Tag color="blue">{count} 个</Tag>
                            ),
                          },
                          {
                            title: '消费总额',
                            dataIndex: 'total_spent',
                            key: 'total_spent',
                            width: 120,
                            render: (amount) => (
                              <Text strong style={{ color: '#52c41a' }}>
                                ¥{(amount || 0).toFixed(2)}
                              </Text>
                            ),
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 200,
                            render: (_, record) => (
                              <Space>
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<EyeOutlined />}
                                  onClick={() => showCustomerDetail(record)}
                                >
                                  详情
                                </Button>
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => showEditUsernameModal(record)}
                                >
                                  改名
                                </Button>
                                <Button
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleDeleteCustomer(record)}
                                >
                                  删除
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                        dataSource={customers || []}
                        rowKey="id"
                        loading={customerLoading}
                        pagination={{
                          total: Array.isArray(customers) ? customers.length : 0,
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total) => `共 ${total} 个顾客`,
                        }}
                        scroll={{ x: 800 }}
                      />
                    </div>
                  )
                }
              ]}
            />
          </Card>

          {/* 商品编辑模态框 */}
          <Modal
            title={editingProduct ? '编辑商品' : '添加商品'}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                name="name"
                label="商品名称"
                rules={[{ required: true, message: '请输入商品名称' }]}
              >
                <Input placeholder="请输入商品名称" />
              </Form.Item>

              <Form.Item
                name="description"
                label="商品描述"
              >
                <TextArea rows={3} placeholder="请输入商品描述" />
              </Form.Item>

              <Form.Item
                name="price"
                label="价格"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="请输入价格"
                  style={{ width: '100%' }}
                  addonBefore="¥"
                />
              </Form.Item>

              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {categories.map(category => (
                    <Select.Option key={category.id} value={category.name}>
                      {category.display_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="image_url"
                label="商品图片"
              >
                <div>
                  <Input 
                    placeholder="请输入图片链接或使用下方上传功能"
                    onChange={handleImageUrlChange}
                    style={{ marginBottom: 12 }}
                  />
                  
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* 图片上传 */}
                    <Upload
                      beforeUpload={handleImageUpload}
                      showUploadList={false}
                      accept="image/*"
                      disabled={imageUploading}
                    >
                      <Button 
                        icon={<UploadOutlined />} 
                        loading={imageUploading}
                        type="dashed"
                      >
                        {imageUploading ? '上传中...' : '上传图片'}
                      </Button>
                    </Upload>
                    
                    {/* 图片预览 */}
                    {imagePreview && (
                      <div style={{ border: '1px dashed #d9d9d9', padding: 8, borderRadius: 6 }}>
                        <Image
                          src={imagePreview}
                          alt="商品图片预览"
                          width={100}
                          height={100}
                          style={{ objectFit: 'cover' }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        />
                        <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#666' }}>
                          预览
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    支持 JPG、PNG、GIF、WebP 格式，文件大小不超过 5MB
                  </div>
                </div>
              </Form.Item>

              <Form.Item
                name="available"
                label="状态"
                initialValue={true}
              >
                <Select>
                  <Select.Option value={true}>可用</Select.Option>
                  <Select.Option value={false}>不可用</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="unlimited_supply"
                label="库存模式"
                initialValue={false}
              >
                <Select onChange={(value) => {
                  // 当选择不限量供应时，清空库存数量字段
                  if (value) {
                    form.setFieldsValue({ available_num: null });
                  }
                }}>
                  <Select.Option value={false}>限量供应</Select.Option>
                  <Select.Option value={true}>不限量供应</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.unlimited_supply !== currentValues.unlimited_supply
                }
              >
                {({ getFieldValue }) => {
                  const isUnlimited = getFieldValue('unlimited_supply');
                  return !isUnlimited ? (
                    <Form.Item
                      name="available_num"
                      label="库存数量"
                      initialValue={100}
                      rules={[
                        { required: true, message: '请输入库存数量' },
                        { type: 'number', min: 0, message: '库存数量不能小于0' }
                      ]}
                    >
                      <InputNumber
                        min={0}
                        step={1}
                        placeholder="请输入库存数量"
                        style={{ width: '100%' }}
                        addonAfter="件"
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      label="库存数量"
                    >
                      <Input 
                        value="不限量供应" 
                        disabled 
                        style={{ color: '#1890ff' }}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>

              <Form.Item
                name="tagIds"
                label="商品标签"
                extra="最多选择3个标签，标签会按选择顺序显示"
              >
                <Select
                  mode="multiple"
                  placeholder="选择标签（最多3个）"
                  style={{ width: '100%', marginBottom: 8 }}
                  maxTagCount={3}
                  maxCount={3}
                  options={allTags.map(tag => ({
                    label: tag.name,
                    value: tag.id
                  }))}
                />
              </Form.Item>

              <Form.Item label=" " colon={false}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button 
                    type="dashed" 
                    size="small"
                    onClick={async () => {
                      await fetchAllTags();
                      setTagModalVisible(true);
                    }}
                  >
                    管理标签
                  </Button>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    当前有 {allTags.length} 个可用标签
                  </Text>
                </div>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setModalVisible(false)}>
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    {editingProduct ? '更新' : '创建'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* 订单详情模态框 */}
          <Modal
            title={`订单详情 #${selectedOrder?.id} (取单号: ${selectedOrder?.pickup_number})`}
            open={orderDetailVisible}
            onCancel={() => setOrderDetailVisible(false)}
            footer={null}
            width={700}
          >
            {selectedOrder && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>客户:</strong> {selectedOrder.username}</Text>
                      <Text><strong>状态:</strong> {getStatusTag(selectedOrder.status)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>取单号:</strong> <span style={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}>{selectedOrder.pickup_number}</span></Text>
                      <Text><strong>总金额:</strong> ¥{selectedOrder.total_amount}</Text>
                    </div>
                    <Text><strong>下单时间:</strong> {formatDate(selectedOrder.created_at)}</Text>
                  </Space>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <Title level={4}>订单商品</Title>
                  <Table
                    dataSource={selectedOrder.items}
                    pagination={false}
                    size="small"
                    rowKey={(record) => {
                      // 使用商品名称、数量和细分配置组合生成唯一key
                      const variantKey = record.variant_selections && record.variant_selections.length > 0 
                        ? JSON.stringify(record.variant_selections) 
                        : 'no-variant';
                      return `${record.name}-${record.quantity}-${record.price}-${variantKey}`;
                    }}
                    columns={[
                      {
                        title: '商品名称',
                        dataIndex: 'name',
                        key: 'name'
                      },
                      {
                        title: '细分配置',
                        dataIndex: 'variant_selections',
                        key: 'variant_selections',
                        width: 200,
                        render: (variantSelections) => {
                          if (!variantSelections || variantSelections.length === 0) {
                            return <Text type="secondary">无细分</Text>;
                          }
                          
                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {variantSelections.map((selection, index) => (
                                <Tag key={index} color="blue" style={{ margin: 0 }}>
                                  {selection.type_display_name}: {selection.option_display_name}
                                  {selection.price_adjustment !== 0 && (
                                    <span style={{ 
                                      marginLeft: 4, 
                                      color: selection.price_adjustment > 0 ? '#f50' : '#52c41a',
                                      fontSize: '11px'
                                    }}>
                                      ({selection.price_adjustment > 0 ? '+' : ''}¥{selection.price_adjustment.toFixed(2)})
                                    </span>
                                  )}
                                </Tag>
                              ))}
                            </div>
                          );
                        }
                      },
                      {
                        title: '单价',
                        dataIndex: 'price',
                        key: 'price',
                        render: (price) => `¥${price}`
                      },
                      {
                        title: '数量',
                        dataIndex: 'quantity',
                        key: 'quantity'
                      },
                      {
                        title: '小计',
                        key: 'subtotal',
                        render: (_, record) => `¥${(record.price * record.quantity).toFixed(2)}`
                      }
                    ]}
                  />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Space>
                    {selectedOrder.status === 'pending' && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => handleOrderStatusChange(selectedOrder?.id, 'preparing')}
                      >
                        接单并开始制作
                      </Button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => handleOrderStatusChange(selectedOrder?.id, 'ready')}
                      >
                        制作完成
                      </Button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => handleOrderStatusChange(selectedOrder?.id, 'completed')}
                      >
                        确认取餐
                      </Button>
                    )}
                    {['pending', 'preparing'].includes(selectedOrder.status) && (
                      <Popconfirm
                        title="确定取消这个订单吗？"
                        onConfirm={() => handleOrderStatusChange(selectedOrder?.id, 'cancelled')}
                      >
                        <Button danger size="large">
                          取消订单
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </div>
              </div>
            )}
          </Modal>

          {/* 客户详情模态框 */}
          <Modal
            title={`客户详情 - ${selectedCustomer?.user?.username}`}
            open={customerDetailVisible}
            onCancel={() => setCustomerDetailVisible(false)}
            footer={null}
            width={900}
          >
            {selectedCustomer && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>用户ID:</strong> {selectedCustomer?.user?.id}</Text>
                      <Text><strong>用户名:</strong> {selectedCustomer?.user?.username}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>注册时间:</strong> {formatDate(selectedCustomer?.user?.created_at)}</Text>
                      <Text><strong>已完成订单总数:</strong> <Tag color="blue">{(selectedCustomer?.orders || []).filter(order => order.status === 'completed').length} 个订单</Tag></Text>
                    </div>
                  </Space>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <Title level={4}>订单历史</Title>
                  {(selectedCustomer.orders || []).length > 0 ? (
                    <Table
                      dataSource={selectedCustomer.orders}
                      pagination={{
                        pageSize: 5,
                        showSizeChanger: false,
                        showQuickJumper: false,
                        showTotal: (total) => `共 ${total} 个订单`,
                      }}
                      size="small"
                      rowKey="id"
                      columns={[
                        {
                          title: '订单ID',
                          dataIndex: 'id',
                          key: 'id',
                          width: 80,
                        },
                        {
                          title: '取单号',
                          dataIndex: 'pickup_number',
                          key: 'pickup_number',
                          width: 100,
                          render: (text) => (
                            <Text strong style={{ color: '#1890ff' }}>
                              {text}
                            </Text>
                          ),
                        },
                        {
                          title: '商品',
                          dataIndex: 'items',
                          key: 'items',
                          width: 300,
                          render: (items, record) => {
                            // 如果items是字符串，直接显示
                            if (typeof items === 'string') {
                              return (
                                <Text style={{ fontSize: '12px' }}>
                                  {items || '无商品信息'}
                                </Text>
                              );
                            }
                            
                            // 如果items是数组，显示详细信息
                            if (Array.isArray(items)) {
                              return (
                                <div style={{ fontSize: '12px' }}>
                                  {items.map((item, index) => (
                                    <div key={index} style={{ marginBottom: index < items.length - 1 ? 8 : 0 }}>
                                      <Text strong>{item.name}</Text>
                                      <Text type="secondary"> x{item.quantity}</Text>
                                      {item.variant_selections && item.variant_selections.length > 0 && (
                                        <div style={{ marginTop: 2 }}>
                                          {item.variant_selections.map((selection, selIndex) => (
                                            <Tag key={selIndex} size="small" color="blue" style={{ margin: '0 2px 2px 0' }}>
                                              {selection.type_display_name}: {selection.option_display_name}
                                            </Tag>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            
                            return (
                              <Text style={{ fontSize: '12px' }} type="secondary">
                                无商品信息
                              </Text>
                            );
                          },
                        },
                        {
                          title: '金额',
                          dataIndex: 'total_amount',
                          key: 'total_amount',
                          width: 100,
                          render: (amount) => `¥${amount}`,
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          width: 120,
                          render: (status) => getStatusTag(status),
                        },
                        {
                          title: '下单时间',
                          dataIndex: 'created_at',
                          key: 'created_at',
                          width: 140,
                          render: (text) => formatDate(text),
                        },
                      ]}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Text type="secondary">该客户还没有订单记录</Text>
                    </div>
                  )}
                </div>

                {(selectedCustomer.orders || []).length > 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                    <Space size="large">
                      <div>
                        <Text type="secondary">已完成订单总数</Text>
                        <br />
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                          {(selectedCustomer.orders || []).filter(order => order.status === 'completed').length}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">消费总额</Text>
                        <br />
                        <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                          ¥{(selectedCustomer?.orders || []).filter(order => order.status === 'completed').reduce((sum, order) => sum + parseFloat(order.total_amount), 0).toFixed(2)}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">平均订单金额</Text>
                        <br />
                        <Text strong style={{ fontSize: '18px', color: '#722ed1' }}>
                          ¥{(selectedCustomer?.orders || []).filter(order => order.status === 'completed').length > 0 ? ((selectedCustomer?.orders || []).filter(order => order.status === 'completed').reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / (selectedCustomer?.orders || []).filter(order => order.status === 'completed').length).toFixed(2) : '0.00'}
                        </Text>
                      </div>
                    </Space>
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* 状态修改模态框 */}
          <Modal
            title={`修改订单状态 - 订单 #${selectedOrderForStatus?.id}`}
            open={statusModalVisible}
            onCancel={cancelStatusModal}
            footer={null}
            width={500}
          >
            {selectedOrderForStatus && (
              <div>
                <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>订单ID:</strong> #{selectedOrderForStatus?.id}</Text>
                      <Text><strong>取单号:</strong> <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{selectedOrderForStatus?.pickup_number}</span></Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>客户:</strong> {selectedOrderForStatus?.username}</Text>
                      <Text><strong>金额:</strong> ¥{selectedOrderForStatus?.total_amount}</Text>
                    </div>
                    <div>
                      <Text><strong>当前状态:</strong> {getStatusTag(selectedOrderForStatus?.status)}</Text>
                    </div>
                  </Space>
                </div>

                <Form
                  form={statusForm}
                  layout="vertical"
                  onFinish={handleStatusSubmit}
                >
                  <Form.Item
                    label="选择新状态"
                    name="status"
                    rules={[{ required: true, message: '请选择订单状态' }]}
                  >
                    <Select placeholder="请选择要修改的状态">
                      <Select.Option value="pending">
                        <Space>
                          <Tag color="orange">待接单</Tag>
                          <Text type="secondary">- 订单刚创建，等待处理</Text>
                        </Space>
                      </Select.Option>
                      <Select.Option value="preparing">
                        <Space>
                          <Tag color="blue">制作中</Tag>
                          <Text type="secondary">- 已接单，正在制作</Text>
                        </Space>
                      </Select.Option>
                      <Select.Option value="ready">
                        <Space>
                          <Tag color="green">待取餐</Tag>
                          <Text type="secondary">- 制作完成，等待取餐</Text>
                        </Space>
                      </Select.Option>
                      <Select.Option value="completed">
                        <Space>
                          <Tag color="gray">已完成</Tag>
                          <Text type="secondary">- 已取餐，订单完成</Text>
                        </Space>
                      </Select.Option>
                      <Select.Option value="cancelled">
                        <Space>
                          <Tag color="red">已取消</Tag>
                          <Text type="secondary">- 订单已取消</Text>
                        </Space>
                      </Select.Option>
                    </Select>
                  </Form.Item>

                  <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
                    <Text type="warning" style={{ fontSize: '12px' }}>
                      <strong>注意：</strong>状态修改后不可撤销，请确认选择正确的状态。
                    </Text>
                  </div>

                  <Form.Item style={{ marginBottom: 0, marginTop: 24, textAlign: 'right' }}>
                    <Space>
                      <Button onClick={cancelStatusModal}>
                        取消
                      </Button>
                      <Button type="primary" htmlType="submit">
                        确认修改
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </div>
            )}
          </Modal>

                  {/* 编辑用户名模态框 */}
        <Modal
          title={`编辑顾客用户名 - ${editingCustomer?.username}`}
          open={editUsernameModalVisible}
          onOk={() => usernameForm.submit()}
          onCancel={cancelEditUsername}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={usernameForm}
            layout="vertical"
            onFinish={handleUsernameSubmit}
          >
            <Form.Item
              label="新用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' },
                { max: 20, message: '用户名最多20个字符' },
                {
                  pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/,
                  message: '用户名只能包含字母、数字、中文、下划线和短横线'
                }
              ]}
            >
              <Input 
                placeholder="请输入新的用户名"
                maxLength={20}
                showCount
              />
            </Form.Item>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '-10px' }}>
              提示：用户名修改后将立即生效，用户下次登录时需使用新用户名
            </div>
          </Form>
        </Modal>

        {/* 标签管理模态框 */}
        <Modal
          title="标签管理"
          open={tagModalVisible}
          onCancel={() => {
            setTagModalVisible(false);
            tagForm.resetFields();
          }}
          footer={null}
          width={600}
        >
            <div style={{ marginBottom: 24 }}>
              <Title level={5}>创建新标签</Title>
              <Form
                form={tagForm}
                layout="inline"
                onFinish={handleCreateTag}
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  name="name"
                  rules={[
                    { required: true, message: '请输入标签名称' },
                    { max: 20, message: '标签名称不能超过20字符' }
                  ]}
                >
                  <Input placeholder="标签名称" maxLength={20} />
                </Form.Item>
                <Form.Item
                  name="color"
                  initialValue="gold"
                >
                  <Select style={{ width: 160 }}>
                    <Select.Option value="gold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>金色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="red">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>红色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #ff4d4f, #ff7875)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="blue">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>蓝色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #1890ff, #40a9ff)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="green">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>绿色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #52c41a, #73d13d)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="purple">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>紫色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #722ed1, #9254de)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="orange">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>橙色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #fa8c16, #ffa940)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="cyan">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>青色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #13c2c2, #36cfc9)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="lime">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>酸橙色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #a0d911, #b7eb8f)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="pink">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>粉色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #eb2f96, #f759ab)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="magenta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>洋红色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #c41d7f, #d3adf7)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="volcano">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>火山色</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #fa541c, #ff7a45)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                    <Select.Option value="geekblue">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>极客蓝</span>
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          background: 'linear-gradient(45deg, #2f54eb, #597ef7)',
                          borderRadius: 3,
                          border: '1px solid #d9d9d9'
                        }}></div>
                      </div>
                    </Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    创建标签
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <div>
              <Title level={5}>现有标签</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allTags.map(tag => (
                  <div key={tag.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <Tag color={tag.color || 'gold'} style={{ margin: 0 }}>
                      {tag.name}
                    </Tag>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      style={{ marginLeft: 4 }}
                    />
                  </div>
                ))}
                {allTags.length === 0 && (
                  <Text type="secondary">暂无标签，请先创建标签</Text>
                )}
              </div>
            </div>
          </Modal>

          {/* 细分类型管理模态框 */}
          <Modal
            title={editingVariantType ? '编辑细分类型' : '添加细分类型'}
            open={variantTypeModalVisible}
            onCancel={() => {
              setVariantTypeModalVisible(false);
              variantTypeForm.resetFields();
            }}
            footer={null}
            width={600}
          >
            <Form
              form={variantTypeForm}
              layout="vertical"
              onFinish={handleVariantTypeSubmit}
            >
              <Form.Item
                label="类型名称"
                name="display_name"
                rules={[{ required: true, message: '请输入类型名称' }]}
              >
                <Input placeholder="如：温度、糖度、杯型等" />
              </Form.Item>
              <Form.Item
                label="内部标识"
                name="name"
                rules={[
                  { required: true, message: '请输入内部标识' },
                  { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线，且以字母或下划线开头' }
                ]}
              >
                <Input placeholder="如：temperature、sugar、size等" />
              </Form.Item>
              <Form.Item
                label="描述"
                name="description"
              >
                <Input.TextArea rows={3} placeholder="描述这个细分类型的用途" />
              </Form.Item>
              
              <Form.Item
                label="类型图标"
                name="emoji"
                extra="点击按钮选择emoji图标"
              >
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.emoji !== currentValues.emoji}>
                  {({ getFieldValue, setFieldsValue }) => {
                    const currentEmoji = getFieldValue('emoji') || '';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                          type="default"
                          onClick={() => setEmojiPickerVisible(true)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            minWidth: 80,
                            height: 40
                          }}
                        >
                          <span style={{ fontSize: '20px', marginRight: 4 }}>
                            {currentEmoji || '⚙️'}
                          </span>
                          选择
                        </Button>
                        <Input
                          value={currentEmoji}
                          placeholder="选择的emoji将显示在这里"
                          readOnly
                          style={{ flex: 1 }}
                        />
                        {currentEmoji && (
                          <Button
                            type="text"
                            size="small"
                            onClick={() => {
                              setFieldsValue({ emoji: '' });
                            }}
                          >
                            清除
                          </Button>
                        )}
                      </div>
                    );
                  }}
                </Form.Item>
              </Form.Item>
              <Form.Item
                name="is_required"
                valuePropName="checked"
              >
                <Checkbox>必选项（客户必须选择此类型）</Checkbox>
              </Form.Item>
              <Form.Item
                label="排序权重"
                name="sort_order"
                initialValue={0}
              >
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {editingVariantType ? '更新' : '创建'}
                  </Button>
                  <Button onClick={() => {
                    setVariantTypeModalVisible(false);
                    variantTypeForm.resetFields();
                  }}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* 细分选项管理模态框 */}
          <Modal
            title={editingVariantOption ? '编辑选项' : '添加选项'}
            open={variantOptionModalVisible}
            onCancel={() => {
              setVariantOptionModalVisible(false);
              variantOptionForm.resetFields();
            }}
            footer={null}
            width={600}
          >
            <Form
              form={variantOptionForm}
              layout="vertical"
              onFinish={handleVariantOptionSubmit}
            >
              <Form.Item
                label="选项名称"
                name="display_name"
                rules={[{ required: true, message: '请输入选项名称' }]}
              >
                <Input placeholder="如：热、冰、三分糖、大杯等" />
              </Form.Item>
              <Form.Item
                label="内部标识"
                name="name"
                rules={[
                  { required: true, message: '请输入内部标识' },
                  { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线，且以字母或下划线开头' }
                ]}
              >
                <Input placeholder="如：hot、ice、sugar_30、large等" />
              </Form.Item>
              <Form.Item
                label="价格调整"
                name="price_adjustment"
                initialValue={0}
                extra="正数表示加价，负数表示减价，0表示不调整价格"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  precision={2}
                  formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/¥\s?|(,*)/g, '')}
                />
              </Form.Item>
              <Form.Item
                label="排序权重"
                name="sort_order"
                initialValue={0}
              >
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="variant_type_id" style={{ display: 'none' }}>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {editingVariantOption ? '更新' : '创建'}
                  </Button>
                  <Button onClick={() => {
                    setVariantOptionModalVisible(false);
                    variantOptionForm.resetFields();
                  }}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* 商品细分配置模态框 */}
          <Modal
            title={`配置商品细分 - ${selectedProductForVariant?.name}`}
            open={productVariantModalVisible}
            onCancel={() => {
              setProductVariantModalVisible(false);
              setProductVariantTypes([]);
            }}
            footer={[
              <Button key="add" type="primary" onClick={showAddVariantModal}>
                <PlusOutlined /> 添加细分类型
              </Button>,
              <Button key="close" onClick={() => {
                setProductVariantModalVisible(false);
                setProductVariantTypes([]);
              }}>
                关闭
              </Button>
            ]}
            width={800}
          >
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                为此商品配置细分类型。点击"添加细分类型"来为商品添加新的细分选项。
              </Text>
            </div>
            
            {productVariantTypes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <InboxOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>暂未配置任何细分类型</div>
                <div style={{ marginTop: 8 }}>点击"添加细分类型"开始配置</div>
              </div>
            ) : (
              productVariantTypes.map(variantType => (
                <Card 
                  key={variantType.id} 
                  style={{ marginBottom: 16 }}
                  actions={[
                    <Button 
                      type="text" 
                      onClick={() => showOptionConfigModal(variantType)}
                    >
                      <SettingOutlined /> 配置选项
                    </Button>,
                    <Button 
                      type="text" 
                      onClick={() => showEditVariantConfigModal(variantType)}
                    >
                      <EditOutlined /> 编辑配置
                    </Button>,
                    <Button
                      type="text"
                      danger
                      onClick={() => handleRemoveVariantFromProduct(variantType.id)}
                    >
                      <DeleteOutlined /> 移除
                    </Button>
                  ]}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>{variantType.display_name}</Title>
                    {variantType.is_required && (
                      <Tag color="red" style={{ marginLeft: 8 }}>必选</Tag>
                    )}
                    <Tag color="blue" style={{ marginLeft: 8 }}>排序: {variantType.sort_order}</Tag>
                  </div>
                  
                  {variantType.description && (
                    <div style={{ marginBottom: 12, color: '#666' }}>
                      {variantType.description}
                    </div>
                  )}
                  
                  <div>
                    <Text type="secondary">可用选项：</Text>
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {variantType.options?.map(option => (
                        <Tag key={option.id} color="blue">
                          {option.display_name}
                          {option.price_adjustment !== 0 && (
                            <Text style={{ marginLeft: 4 }}>
                              ({option.price_adjustment > 0 ? '+' : ''}¥{option.price_adjustment})
                            </Text>
                          )}
                        </Tag>
                      )) || <Text type="secondary">暂无选项</Text>}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </Modal>

          {/* 添加细分类型到商品模态框 */}
          <Modal
            title="为商品添加细分类型"
            open={addVariantModalVisible}
            onCancel={() => {
              setAddVariantModalVisible(false);
              addVariantForm.resetFields();
            }}
            footer={null}
            width={600}
          >
            <Form
              form={addVariantForm}
              layout="vertical"
              onFinish={handleAddVariantToProduct}
            >
              <Form.Item
                label="选择细分类型"
                name="variant_type_id"
                rules={[{ required: true, message: '请选择细分类型' }]}
                extra={`当前共有 ${variantTypes?.length || 0} 个细分类型，其中 ${variantTypes?.filter(vt => !productVariantTypes.some(pvt => pvt.id === vt.id))?.length || 0} 个可添加`}
              >
                <Select 
                  placeholder={variantTypes?.length === 0 ? "请先在细分管理中创建细分类型" : "选择要添加的细分类型"}
                  onChange={handleVariantTypeChange}
                  notFoundContent={variantTypes?.length === 0 ? "暂无可用的细分类型" : "暂无可添加的细分类型"}
                >
                  {variantTypes
                    .filter(vt => !productVariantTypes.some(pvt => pvt.id === vt.id))
                    .map(variantType => (
                      <Select.Option key={variantType.id} value={variantType.id}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{variantType.display_name}</div>
                          {variantType.description && (
                            <div style={{ fontSize: '12px', color: '#666' }}>{variantType.description}</div>
                          )}
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {variantType.options?.length || 0} 个选项
                          </div>
                        </div>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
              
              {selectedVariantTypeOptions.length > 0 && (
                <Form.Item
                  label="启用的选项"
                  name="enabled_options"
                  extra="选择该商品可以使用的选项。如果不选择任何选项，将启用所有选项。"
                >
                  <Checkbox.Group style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedVariantTypeOptions.map(option => (
                        <Checkbox 
                          key={option.id} 
                          value={option.id}
                          style={{ width: '100%' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{option.display_name}</span>
                            {option.price_adjustment !== 0 && (
                              <Text style={{ color: option.price_adjustment > 0 ? '#f50' : '#52c41a', fontSize: '12px' }}>
                                {option.price_adjustment > 0 ? '+' : ''}¥{option.price_adjustment.toFixed(2)}
                              </Text>
                            )}
                          </div>
                        </Checkbox>
                      ))}
                    </div>
                  </Checkbox.Group>
                </Form.Item>
              )}
              
              <Form.Item
                name="is_required"
                valuePropName="checked"
              >
                <Checkbox>此商品必须选择此类型</Checkbox>
              </Form.Item>
              
              <Form.Item
                label="显示顺序"
                name="sort_order"
                initialValue={0}
              >
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    添加
                  </Button>
                  <Button onClick={() => {
                    setAddVariantModalVisible(false);
                    addVariantForm.resetFields();
                  }}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
                          </Form>
            </Modal>

            {/* 编辑细分配置模态框 */}
            <Modal
              title={`编辑细分配置 - ${editingVariantConfig?.display_name}`}
              open={editVariantConfigModalVisible}
              onCancel={() => {
                setEditVariantConfigModalVisible(false);
                variantConfigForm.resetFields();
                setEditingVariantConfig(null);
              }}
              footer={null}
              width={500}
            >
              <Form
                form={variantConfigForm}
                layout="vertical"
                onFinish={handleVariantConfigSubmit}
              >
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary">
                    配置此商品使用该细分类型的具体设置。
                  </Text>
                </div>

                <Form.Item
                  name="is_required"
                  valuePropName="checked"
                >
                  <Checkbox>此商品必须选择此类型</Checkbox>
                </Form.Item>
                
                <Form.Item
                  label="显示顺序"
                  name="sort_order"
                  extra="数值越小排序越靠前"
                >
                  <InputNumber min={0} max={999} style={{ width: '100%' }} />
                </Form.Item>
                
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      保存配置
                    </Button>
                    <Button onClick={() => {
                      setEditVariantConfigModalVisible(false);
                      variantConfigForm.resetFields();
                      setEditingVariantConfig(null);
                    }}>
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* 选项配置模态框 */}
            <Modal
              title={`配置选项 - ${currentVariantType?.display_name}`}
              open={optionConfigModalVisible}
              onCancel={() => {
                setOptionConfigModalVisible(false);
                optionConfigForm.resetFields();
              }}
              footer={null}
              width={600}
            >
              <Form
                form={optionConfigForm}
                layout="vertical"
                onFinish={handleOptionConfigSubmit}
              >
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary">
                    选择此商品在该细分类型下可以使用的选项。如果不选择任何选项，将启用所有选项。
                  </Text>
                </div>
                
                <Form.Item
                  label="启用的选项"
                  name="enabled_options"
                >
                  <Checkbox.Group style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentVariantOptions?.map(option => (
                        <Checkbox 
                          key={option.id} 
                          value={option.id}
                          style={{ width: '100%' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{option.display_name}</span>
                            {option.price_adjustment !== 0 && (
                              <Text style={{ color: option.price_adjustment > 0 ? '#f50' : '#52c41a', fontSize: '12px' }}>
                                {option.price_adjustment > 0 ? '+' : ''}¥{option.price_adjustment.toFixed(2)}
                              </Text>
                            )}
                          </div>
                        </Checkbox>
                      )) || <Text type="secondary">暂无可用选项</Text>}
                    </div>
                  </Checkbox.Group>
                </Form.Item>
                
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      保存配置
                    </Button>
                    <Button onClick={() => {
                      setOptionConfigModalVisible(false);
                      optionConfigForm.resetFields();
                    }}>
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* 分类管理模态框 */}
            <Modal
              title={editingCategory ? '编辑分类' : '添加分类'}
              open={categoryModalVisible}
              onCancel={() => {
                setCategoryModalVisible(false);
                categoryForm.resetFields();
                setEditingCategory(null);
              }}
              footer={null}
              width={600}
            >
              <Form
                form={categoryForm}
                layout="vertical"
                onFinish={handleCategorySubmit}
              >
                <Form.Item
                  label="分类名称"
                  name="name"
                  rules={[
                    { required: true, message: '请输入分类名称' },
                    { pattern: /^[a-zA-Z0-9_-]+$/, message: '分类名称只能包含字母、数字、下划线和连字符' },
                    { min: 1, max: 50, message: '分类名称长度必须在1-50字符之间' }
                  ]}
                  extra="用于系统内部识别，只能包含字母、数字、下划线和连字符"
                >
                  <Input placeholder="如: coffee, tea, dessert" />
                </Form.Item>

                <Form.Item
                  label="显示名称"
                  name="display_name"
                  rules={[
                    { required: true, message: '请输入显示名称' },
                    { min: 1, max: 100, message: '显示名称长度必须在1-100字符之间' }
                  ]}
                  extra="用户看到的分类名称，可以使用中文"
                >
                  <Input placeholder="如: 咖啡, 茶饮, 甜品" />
                </Form.Item>

                <Form.Item
                  label="分类图标"
                  name="emoji"
                  extra="点击按钮选择emoji图标"
                >
                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.emoji !== currentValues.emoji}>
                    {({ getFieldValue, setFieldsValue }) => {
                      const currentEmoji = getFieldValue('emoji') || '';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Button
                            type="default"
                            onClick={() => setEmojiPickerVisible(true)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              minWidth: 80,
                              height: 40
                            }}
                          >
                            <span style={{ fontSize: '20px', marginRight: 4 }}>
                              {currentEmoji || '📦'}
                            </span>
                            选择
                          </Button>
                          <Input
                            value={currentEmoji}
                            placeholder="选择的emoji将显示在这里"
                            readOnly
                            style={{ flex: 1 }}
                          />
                          {currentEmoji && (
                            <Button
                              type="text"
                              size="small"
                              onClick={() => {
                                setFieldsValue({ emoji: '' });
                              }}
                            >
                              清除
                            </Button>
                          )}
                        </div>
                      );
                    }}
                  </Form.Item>
                </Form.Item>

                <Form.Item
                  label="描述"
                  name="description"
                  rules={[
                    { max: 500, message: '描述长度不能超过500字符' }
                  ]}
                >
                  <TextArea 
                    rows={3} 
                    placeholder="分类描述（可选）" 
                    showCount 
                    maxLength={500}
                  />
                </Form.Item>

                <Form.Item
                  label="排序顺序"
                  name="sort_order"
                  extra="数值越小排序越靠前"
                >
                  <InputNumber 
                    min={0} 
                    max={999} 
                    style={{ width: '100%' }}
                    placeholder="0"
                  />
                </Form.Item>

                <Form.Item
                  name="enabled"
                  valuePropName="checked"
                >
                  <Checkbox>启用此分类</Checkbox>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setCategoryModalVisible(false);
                      categoryForm.resetFields();
                      setEditingCategory(null);
                    }}>
                      取消
                    </Button>
                    <Button type="primary" htmlType="submit">
                      {editingCategory ? '更新' : '创建'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Emoji选择器模态框 - 复用于分类和细分类型 */}
            <Modal
              title="选择Emoji图标"
              open={emojiPickerVisible}
              onCancel={() => setEmojiPickerVisible(false)}
              footer={null}
              width={isMobile ? '90%' : 400}
              centered
              zIndex={2000}
              style={{ zIndex: 2000 }}
              bodyStyle={{ 
                padding: isMobile ? 8 : 24,
                maxHeight: isMobile ? '70vh' : 'auto',
                overflow: 'auto'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                width: '100%',
                overflow: 'hidden'
              }}>
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    // 判断当前是哪个表单在使用emoji选择器
                    if (variantTypeModalVisible) {
                      variantTypeForm.setFieldsValue({ emoji: emojiData.emoji });
                    } else if (categoryModalVisible) {
                      categoryForm.setFieldsValue({ emoji: emojiData.emoji });
                    }
                    setEmojiPickerVisible(false);
                  }}
                  width={isMobile ? '100%' : 350}
                  height={isMobile ? 350 : 400}
                  searchDisabled={false}
                  skinTonesDisabled={true}
                  previewConfig={{
                    defaultEmoji: '⚙️',
                    defaultCaption: '选择一个emoji作为图标'
                  }}
                  style={{
                    maxWidth: '100%',
                    border: 'none',
                    boxShadow: 'none'
                  }}
                />
              </div>
            </Modal>
          </div>
        </Content>
      </Layout>
    );
  };

  export default AdminPage; 