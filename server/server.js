const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');

async function ensureAdmin(){
  try {
    const email = 'admin@gmail.com';
    let admin = await User.findOne({ email });
    if(!admin){
      admin = await User.create({ name: 'admin', email, password: 'admin123', role: 'admin' });
      console.log('Seeded default admin user');
    } else {
      let changed = false;
      if(admin.role !== 'admin'){ admin.role = 'admin'; changed = true; }
      // Force reset password to known value
      admin.password = 'admin123';
      changed = true;
      if(changed){
        await admin.save();
        console.log('Verified/updated admin user');
      }
    }
  } catch (e){
    console.error('Failed to ensure admin user', e.message);
  }
}

dotenv.config();
connectDB().then(()=> ensureAdmin());

const app = express();

// CORS with explicit origin & credentials
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Ensure uploads directory exists and serve it statically
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.error('Failed to create uploads directory', e.message);
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/shops', require('./routes/shopRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Error middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
