import axios from 'axios';
import { auth } from './firebase';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

// ─── Vehicles ────────────────────────────────────────────────────────────────
export const getVehicles = () => API.get('/vehicles');
export const getLandingVehicles = () => API.get('/vehicles/landing');
export const getVehicle = (id: string) => API.get(`/vehicles/${id}`);
export const createVehicle = (data: FormData) => API.post('/vehicles', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateVehicle = (id: string, data: FormData) => API.put(`/vehicles/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteVehicle = (id: string) => API.delete(`/vehicles/${id}`);
export const getVehicleMeterReadings = (id: string) => API.get(`/vehicles/${id}/meter-readings`);

// ─── Customers ────────────────────────────────────────────────────────────────
export const getCustomers = () => API.get('/customers');
export const getCustomer = (id: string) => API.get(`/customers/${id}`);
export const createCustomer = (data: FormData) => API.post('/customers', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateCustomer = (id: string, data: FormData) => API.put(`/customers/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCustomer = (id: string) => API.delete(`/customers/${id}`);
export const getCustomerBookings = (id: string) => API.get(`/customers/${id}/bookings`);

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const getBookings = () => API.get('/bookings');
export const getBooking = (id: string) => API.get(`/bookings/${id}`);
export const createBooking = (data: any) => API.post('/bookings', data);
export const completeBooking = (id: string, data: any) => API.put(`/bookings/${id}/complete`, data);
export const updateBooking = (id: string, data: any) => API.put(`/bookings/${id}`, data);
export const deleteBooking = (id: string) => API.delete(`/bookings/${id}`);
export const getDashboardStats = () => API.get('/bookings/stats/dashboard');
export const getRevenueStats = () => API.get('/bookings/stats/revenue');

// ─── Invoices ────────────────────────────────────────────────────────────────
export const getInvoices = () => API.get('/invoices');
export const generateInvoice = (bookingId: string) => API.post(`/invoices/generate/${bookingId}`);
export const getWhatsAppLink = (invoiceId: string) => API.get(`/invoices/${invoiceId}/whatsapp`);
