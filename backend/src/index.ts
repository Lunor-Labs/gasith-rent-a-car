import './config/supabase'; // initializes supabase + dotenv before anything else
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicles.routes';
import customerRoutes from './routes/customers.routes';
import bookingRoutes from './routes/bookings.routes';
import invoiceRoutes from './routes/invoices.routes';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, health checks)
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
    ].filter(Boolean);

    // Allow any *.vercel.app subdomain (covers all preview + production deploys)
    if (
      allowed.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/invoices', invoiceRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚗 Gasith Backend running on http://localhost:${PORT}`);
});

export default app;
