const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  }
});

// 图片上传接口（仅管理员）
router.post('/image', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 返回图片URL
    const imageUrl = `/images/${req.file.filename}`;
    
    res.json({
      message: '图片上传成功',
      imageUrl: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('图片上传错误:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// 删除图片接口（仅管理员）
router.delete('/image/:filename', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    
    res.json({ message: '图片删除成功' });
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(500).json({ error: '删除图片失败' });
  }
});

// 获取上传的图片列表（仅管理员）
router.get('/images', authenticateToken, requireAdmin, (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    const images = imageFiles.map(filename => ({
      filename,
      url: `/images/${filename}`,
      uploadTime: fs.statSync(path.join(uploadDir, filename)).birthtime
    }));
    
    // 按上传时间倒序排列
    images.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));
    
    res.json(images);
  } catch (error) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({ error: '获取图片列表失败' });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过5MB限制' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: '上传字段名错误，应为image' });
    }
  }
  
  if (error.message === '只允许上传图片文件') {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('上传错误:', error);
  res.status(500).json({ error: '文件上传失败' });
});

module.exports = router; 