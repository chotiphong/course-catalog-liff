const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Database Tables
const initDB = async () => {
  try {
    // สร้างตาราง courses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id SERIAL PRIMARY KEY,
        course_type VARCHAR(100),
        course_subtype VARCHAR(100),
        course_name VARCHAR(255) NOT NULL,
        course_date VARCHAR(255),
        start_date DATE,
        course_detail TEXT,
        course_apply TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // เพิ่มข้อมูลตัวอย่าง (ถ้าไม่มี)
    const { rows } = await pool.query('SELECT COUNT(*) FROM courses');
    if (parseInt(rows[0].count) === 0) {
      const sampleCourses = [
        {
          course_type: 'Safety Training',
          course_subtype: 'Basic Safety',
          course_name: 'Basic Safety Orientation',
          course_date: '15-16 กรกฎาคม 2567',
          start_date: '2024-07-15',
          course_detail: 'https://example.com/safety-basic-detail',
          course_apply: 'https://example.com/safety-basic-apply',
          active: true
        },
        {
          course_type: 'Safety Training',
          course_subtype: 'Advanced Safety',
          course_name: 'Advanced Safety Management',
          course_date: '20-22 กรกฎาคม 2567',
          start_date: '2024-07-20',
          course_detail: 'https://example.com/safety-advanced-detail',
          course_apply: 'https://example.com/safety-advanced-apply',
          active: true
        },
        {
          course_type: 'Technical Training',
          course_subtype: 'Docker',
          course_name: 'Docker Fundamentals',
          course_date: '1-3 สิงหาคม 2567',
          start_date: '2024-08-01',
          course_detail: 'https://example.com/docker-detail',
          course_apply: 'https://example.com/docker-apply',
          active: true
        },
        {
          course_type: 'Technical Training',
          course_subtype: 'Kubernetes',
          course_name: 'Kubernetes for Beginners',
          course_date: '5-7 สิงหาคม 2567',
          start_date: '2024-08-05',
          course_detail: 'https://example.com/k8s-detail',
          course_apply: 'https://example.com/k8s-apply',
          active: true
        },
        {
          course_type: 'Management Training',
          course_subtype: 'Leadership',
          course_name: 'Leadership Development Program',
          course_date: '10-12 สิงหาคม 2567',
          start_date: '2024-08-10',
          course_detail: 'https://example.com/leadership-detail',
          course_apply: 'https://example.com/leadership-apply',
          active: true
        },
        {
          course_type: 'Technical Training',
          course_subtype: 'AWS',
          course_name: 'AWS Cloud Practitioner',
          course_date: '15-17 สิงหาคม 2567',
          start_date: '2024-08-15',
          course_detail: 'https://example.com/aws-detail',
          course_apply: 'https://example.com/aws-apply',
          active: true
        }
      ];

      for (const course of sampleCourses) {
        await pool.query(`
          INSERT INTO courses (course_type, course_subtype, course_name, course_date, start_date, course_detail, course_apply, active) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          course.course_type,
          course.course_subtype, 
          course.course_name,
          course.course_date,
          course.start_date,
          course.course_detail,
          course.course_apply,
          course.active
        ]);
      }
      console.log('✅ Sample course data inserted');
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Course Catalog API is running!',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL on Railway'
  });
});

// GET /api/course-types - ดึงประเภทหลักสูตรไม่ซ้ำ
app.get('/api/course-types', async (req, res) => {
  try {
    console.log('📚 Fetching course types...');
    
    const result = await pool.query(`
      SELECT DISTINCT course_type 
      FROM courses 
      WHERE active = true 
      ORDER BY course_type
    `);
    
    const courseTypes = result.rows.map(row => row.course_type);
    console.log(`Found ${courseTypes.length} course types:`, courseTypes);
    
    res.json(courseTypes);
    
  } catch (error) {
    console.error('❌ Error fetching course types:', error);
    res.status(500).json({ 
      error: 'Failed to fetch course types',
      details: error.message 
    });
  }
});

// GET /api/courses/:courseType - ดึงหลักสูตรตามประเภท
app.get('/api/courses/:courseType', async (req, res) => {
  try {
    const { courseType } = req.params;
    console.log(`📅 Fetching courses for type: ${courseType}`);
    
    const result = await pool.query(`
      SELECT 
        course_id,
        course_type,
        course_subtype,
        course_name,
        course_date,
        start_date,
        course_detail,
        course_apply
      FROM courses 
      WHERE course_type = $1 AND active = true 
      ORDER BY start_date ASC
    `, [courseType]);
    
    console.log(`Found ${result.rows.length} courses for ${courseType}`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching courses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses',
      details: error.message 
    });
  }
});

// GET /api/courses - ดึงหลักสูตรทั้งหมดที่ active
app.get('/api/courses', async (req, res) => {
  try {
    console.log('📚 Fetching all active courses...');
    
    const result = await pool.query(`
      SELECT 
        course_id,
        course_type,
        course_subtype,
        course_name,
        course_date,
        start_date,
        course_detail,
        course_apply
      FROM courses 
      WHERE active = true 
      ORDER BY start_date ASC
    `);
    
    console.log(`Found ${result.rows.length} active courses`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching all courses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses',
      details: error.message 
    });
  }
});

// GET /api/course/:courseId - ดึงรายละเอียดหลักสูตรตาม ID
app.get('/api/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(`📖 Fetching course details for ID: ${courseId}`);
    
    const result = await pool.query(`
      SELECT * FROM courses 
      WHERE course_id = $1 AND active = true
    `, [courseId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error fetching course details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch course details',
      details: error.message 
    });
  }
});

// GET /api/search - ค้นหาหลักสูตร
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    console.log(`🔍 Searching courses for: ${q}`);
    
    const result = await pool.query(`
      SELECT 
        course_id,
        course_type,
        course_subtype,
        course_name,
        course_date,
        start_date,
        course_detail,
        course_apply
      FROM courses 
      WHERE active = true 
      AND (
        course_name ILIKE $1 
        OR course_type ILIKE $1 
        OR course_subtype ILIKE $1
      )
      ORDER BY start_date ASC
    `, [`%${q}%`]);
    
    console.log(`Found ${result.rows.length} courses matching "${q}"`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error searching courses:', error);
    res.status(500).json({ 
      error: 'Failed to search courses',
      details: error.message 
    });
  }
});

// GET /api/stats - สถิติหลักสูตร
app.get('/api/stats', async (req, res) => {
  try {
    const totalCourses = await pool.query('SELECT COUNT(*) as count FROM courses WHERE active = true');
    const coursesByType = await pool.query(`
      SELECT course_type, COUNT(*) as count 
      FROM courses 
      WHERE active = true 
      GROUP BY course_type 
      ORDER BY count DESC
    `);
    
    res.json({
      totalCourses: parseInt(totalCourses.rows[0].count),
      coursesByType: coursesByType.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: dbResult.rows[0].now
      },
      environment: {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      database: { connected: false },
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const startServer = async () => {
  try {
    await initDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🗄️  Database: PostgreSQL`);
      console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Connected' : 'Not set'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
