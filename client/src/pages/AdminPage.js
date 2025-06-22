import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Popconfirm, Typography, Tabs, Tag, Badge, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, ShoppingOutlined, CheckOutlined, ClockCircleOutlined, EyeOutlined, UserOutlined, LockOutlined, UploadOutlined, InboxOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const AdminPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin } = useAuth();
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
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyOrderLoading, setHistoryOrderLoading] = useState(false);
  const [historyOrderPagination, setHistoryOrderPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [historyOrderFilters, setHistoryOrderFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  });
  const [customerDetailVisible, setCustomerDetailVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [statusForm] = Form.useForm();
  const [productSortType, setProductSortType] = useState('id-asc'); // 商品排序类型，默认ID升序
  const [orderFilters, setOrderFilters] = useState({
    pickupNumber: '',
    customerName: ''
  }); // 订单筛选条件
  const [allTags, setAllTags] = useState([]); // 所有可用标签
  const [tagModalVisible, setTagModalVisible] = useState(false); // 标签管理模态框
  const [tagForm] = Form.useForm(); // 标签表单

  useEffect(() => {
    if (!isLoggedIn() || !isAdmin()) {
      navigate('/');
      return;
    }
    fetchProducts();
    fetchOrders();
    fetchAdminList();
    fetchAllTags();
    
    // 根据当前标签页加载对应数据
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'history') {
      fetchHistoryOrders();
    }
  }, [isLoggedIn, isAdmin, navigate]);

  // 当标签页切换时加载对应数据
  useEffect(() => {
    if (activeTab === 'customers' && (!customers || customers.length === 0)) {
      fetchCustomers();
    } else if (activeTab === 'history' && (!historyOrders || historyOrders.length === 0)) {
      fetchHistoryOrders();
    }
  }, [activeTab]);

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
    return new Date(dateString).toLocaleString('zh-CN');
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
      width: 80
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个商品吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
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
      setCustomers(response.data || []);
    } catch (error) {
      message.error('获取客户列表失败');
      setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  // 获取历史订单
  const fetchHistoryOrders = async (page = 1, filters = historyOrderFilters) => {
    setHistoryOrderLoading(true);
    try {
      const params = {
        page,
        limit: historyOrderPagination.pageSize,
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status
      };
      
      const response = await api.getAllHistoryOrders(params);
      const orders = response.data?.data?.orders || [];
      
      setHistoryOrders(orders);
      setHistoryOrderPagination({
        ...historyOrderPagination,
        current: page,
        total: response.data?.data?.pagination?.total || 0
      });
    } catch (error) {
      message.error('获取历史订单失败');
      setHistoryOrders([]); // 确保在错误时也设置为空数组
      setHistoryOrderPagination({
        ...historyOrderPagination,
        current: 1,
        total: 0
      });
    } finally {
      setHistoryOrderLoading(false);
    }
  };

  // 显示客户详情
  const showCustomerDetail = async (customer) => {
    try {
      const response = await api.getCustomerDetail(customer.id);
      setSelectedCustomer(response.data);
      setCustomerDetailVisible(true);
    } catch (error) {
      message.error('获取客户详情失败');
    }
  };

  // 处理历史订单筛选
  const handleHistoryOrderFilter = (filters) => {
    setHistoryOrderFilters(filters);
    fetchHistoryOrders(1, filters);
  };

  // 处理历史订单分页
  const handleHistoryOrderPagination = (page, pageSize) => {
    setHistoryOrderPagination({
      ...historyOrderPagination,
      current: page,
      pageSize
    });
    fetchHistoryOrders(page, historyOrderFilters);
  };

  // 显示状态修改模态框
  const showStatusModal = (order) => {
    setSelectedOrderForStatus(order);
    statusForm.setFieldsValue({ status: order.status });
    setStatusModalVisible(true);
  };

  // 处理状态修改提交
  const handleStatusSubmit = async (values) => {
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

  // 获取排序后的商品列表
  const getSortedProducts = () => {
    const productList = [...(products || [])];
    
    switch (productSortType) {
      case 'id-asc':
        return productList.sort((a, b) => a.id - b.id);
      case 'id-desc':
        return productList.sort((a, b) => b.id - a.id);
      case 'name-pinyin':
        return productList.sort((a, b) => {
          // 使用 localeCompare 进行中文拼音排序
          return a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'accent' });
        });
      case 'price-asc':
        return productList.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case 'price-desc':
        return productList.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      default:
        // 默认使用ID升序
        return productList.sort((a, b) => a.id - b.id);
    }
  };

  // 处理商品排序变化
  const handleProductSort = (sortType) => {
    setProductSortType(sortType);
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
      customerName: ''
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>
                          商品管理
                        </Title>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => showModal()}
                        >
                          添加商品
                        </Button>
                      </div>

                      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Text>排序方式：</Text>
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
                        </Space>
                        <Text type="secondary">
                          共 {(products || []).length} 个商品
                        </Text>
                      </div>

                      <Table
                        columns={productColumns}
                        dataSource={getSortedProducts()}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                          total: (products || []).length,
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total) => `共 ${total} 个商品`,
                        }}
                        scroll={{ x: 970 }}
                      />
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
                          <UserOutlined style={{ marginRight: 8 }} />
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
                  key: 'history',
                  label: (
                    <span>
                      <HistoryOutlined style={{ marginRight: 8 }} />
                      历史订单
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Space wrap>
                          <Button
                            type="primary"
                            onClick={() => fetchHistoryOrders()}
                          >
                            刷新订单
                          </Button>
                          
                          <Select
                            value={historyOrderFilters.status}
                            style={{ width: 120 }}
                            onChange={(value) => handleHistoryOrderFilter({ ...historyOrderFilters, status: value })}
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
                            value={historyOrderFilters.startDate}
                            onChange={(e) => setHistoryOrderFilters({ ...historyOrderFilters, startDate: e.target.value })}
                            style={{ width: 180 }}
                          />
                          
                          <Input
                            placeholder="结束日期 (YYYY-MM-DD)"
                            value={historyOrderFilters.endDate}
                            onChange={(e) => setHistoryOrderFilters({ ...historyOrderFilters, endDate: e.target.value })}
                            style={{ width: 180 }}
                          />
                          
                          <Button
                            onClick={() => handleHistoryOrderFilter(historyOrderFilters)}
                          >
                            筛选
                          </Button>
                          
                          <Button
                            onClick={() => {
                              setHistoryOrderFilters({ status: 'all', startDate: '', endDate: '' });
                              fetchHistoryOrders(1, { status: 'all', startDate: '', endDate: '' });
                            }}
                          >
                            重置
                          </Button>
                        </Space>
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
                              <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                                {text}
                              </Text>
                            ),
                          },
                          {
                            title: '客户',
                            dataIndex: 'customer_name',
                            key: 'customer_name',
                            width: 120,
                          },
                          {
                            title: '商品',
                            dataIndex: 'items',
                            key: 'items',
                            ellipsis: true,
                            render: (items) => (
                              <Text style={{ fontSize: '12px' }}>
                                {items || '无商品信息'}
                              </Text>
                            ),
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
                        dataSource={historyOrders}
                        rowKey="id"
                        loading={historyOrderLoading}
                        pagination={{
                          current: historyOrderPagination.current,
                          pageSize: historyOrderPagination.pageSize,
                          total: historyOrderPagination.total,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 个订单`,
                          onChange: handleHistoryOrderPagination,
                          onShowSizeChange: handleHistoryOrderPagination,
                        }}
                        scroll={{ x: 1200 }}
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
                  <Select.Option value="coffee">咖啡</Select.Option>
                  <Select.Option value="tea">茶饮</Select.Option>
                  <Select.Option value="dessert">甜品</Select.Option>
                  <Select.Option value="snack">小食</Select.Option>
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
                    columns={[
                      {
                        title: '商品名称',
                        dataIndex: 'name',
                        key: 'name'
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
                        onClick={() => handleOrderStatusChange(selectedOrder.id, 'preparing')}
                      >
                        接单并开始制作
                      </Button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => handleOrderStatusChange(selectedOrder.id, 'ready')}
                      >
                        制作完成
                      </Button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => handleOrderStatusChange(selectedOrder.id, 'completed')}
                      >
                        确认取餐
                      </Button>
                    )}
                    {['pending', 'preparing'].includes(selectedOrder.status) && (
                      <Popconfirm
                        title="确定取消这个订单吗？"
                        onConfirm={() => handleOrderStatusChange(selectedOrder.id, 'cancelled')}
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
                      <Text><strong>用户ID:</strong> {selectedCustomer.user.id}</Text>
                      <Text><strong>用户名:</strong> {selectedCustomer.user.username}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>注册时间:</strong> {formatDate(selectedCustomer.user.created_at)}</Text>
                      <Text><strong>订单总数:</strong> <Tag color="blue">{(selectedCustomer.orders || []).length} 个订单</Tag></Text>
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
                          ellipsis: true,
                          render: (items) => (
                            <Text style={{ fontSize: '12px' }}>
                              {items || '无商品信息'}
                            </Text>
                          ),
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
                        <Text type="secondary">订单总数</Text>
                        <br />
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                          {(selectedCustomer.orders || []).length}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">消费总额</Text>
                        <br />
                        <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                          ¥{selectedCustomer.orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0).toFixed(2)}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">平均订单金额</Text>
                        <br />
                        <Text strong style={{ fontSize: '18px', color: '#722ed1' }}>
                          ¥{((selectedCustomer.orders || []).reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / (selectedCustomer.orders || []).length).toFixed(2)}
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
                      <Text><strong>订单ID:</strong> #{selectedOrderForStatus.id}</Text>
                      <Text><strong>取单号:</strong> <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{selectedOrderForStatus.pickup_number}</span></Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text><strong>客户:</strong> {selectedOrderForStatus.username}</Text>
                      <Text><strong>金额:</strong> ¥{selectedOrderForStatus.total_amount}</Text>
                    </div>
                    <div>
                      <Text><strong>当前状态:</strong> {getStatusTag(selectedOrderForStatus.status)}</Text>
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
        </div>
      </Content>
    </Layout>
  );
};

export default AdminPage; 