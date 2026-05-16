import './config/firebase'; // initializes firebase + dotenv before anything else
import express from 'express';
import cors from 'cors';
import * as functions from 'firebase-functions';
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicles.routes';
import customerRoutes from './routes/customers.routes';
import bookingRoutes from './routes/bookings.routes';
import invoiceRoutes from './routes/invoices.routes';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Cloud Functions Gen 1 export
export const api = functions.https.onRequest(app);

// Local development server (not used in Cloud Functions)
if (!process.env.FIREBASE_CONFIG) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚗 Gasith Backend running on http://localhost:${PORT}`);
  });
}

export default app;
