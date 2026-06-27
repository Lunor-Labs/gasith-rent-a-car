import axios from 'axios';
import { supabase } from './supabase';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

export default API;

// ─── Vehicles ────────────────────────────────────────────────────────────────
export const getVehicles = (params?: { limit?: number }) => API.get('/vehicles', { params });
export const getLandingVehicles = () => API.get('/vehicles/landing');
export const getVehicle = (id: string) => API.get(`/vehicles/${id}`);
export const createVehicle = (data: FormData) => API.post('/vehicles', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateVehicle = (id: string, data: FormData) => API.put(`/vehicles/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteVehicle = (id: string) => API.delete(`/vehicles/${id}`);
export const getVehicleMeterReadings = (id: string) => API.get(`/vehicles/${id}/meter-readings`);

// ─── Customers ────────────────────────────────────────────────────────────────
export const getCustomers = (params?: { include_inactive?: string }) => API.get('/customers', { params });
export const getCustomer = (id: string) => API.get(`/customers/${id}`);
export const createCustomer = (data: FormData) => API.post('/customers', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateCustomer = (id: string, data: FormData) => API.put(`/customers/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCustomer = (id: string) => API.delete(`/customers/${id}`);
export const getCustomerBookings = (id: string) => API.get(`/customers/${id}/bookings`);
export const toggleBlacklist = (id: string, data: { blacklisted: boolean; reason?: string }) =>
  API.patch(`/customers/${id}/blacklist`, data);

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const getBookings = (params?: { limit?: number }) => API.get('/bookings', { params });
export const getBooking = (id: string) => API.get(`/bookings/${id}`);
export const createBooking = (data: any) => API.post('/bookings', data);
export const completeBooking = (id: string, data: any) => API.put(`/bookings/${id}/complete`, data);
export const updateBooking = (id: string, data: any) => API.put(`/bookings/${id}`, data);
export const deleteBooking = (id: string) => API.delete(`/bookings/${id}`);
export const getDashboardStats = () => API.get('/bookings/stats/dashboard');
export const getRevenueStats = (params?: { range?: string }) => API.get('/bookings/stats/revenue', { params });

// ─── Invoices ────────────────────────────────────────────────────────────────
export const getInvoices = () => API.get('/invoices');
export const generateInvoice = (bookingId: string) => API.post(`/invoices/generate/${bookingId}`);
export const getWhatsAppLink = (invoiceId: string) => API.get(`/invoices/${invoiceId}/whatsapp`);

// ─── Pricing Config ───────────────────────────────────────────────────────────
export const getPricingConfig = () => API.get('/pricing-config');
export const updatePricingConfig = (data: { firstDayFreeKm: number; subsequentDayFreeKm: number }) =>
  API.put('/pricing-config', data);

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const getPublicReviews   = ()          => API.get('/reviews/public');
export const getAdminReviews    = ()          => API.get('/reviews');
export const syncGoogleReviews  = ()          => API.post('/reviews/sync');
export const toggleReview       = (id: string) => API.put(`/reviews/${id}/toggle`);

// ─── Reports ──────────────────────────────────────────────────────────────────
type ReportParams = { from?: string; to?: string; vehicleId?: string };
export const getReportFinancial    = (params?: ReportParams) => API.get('/reports/financial',    { params });
export const getReportCommissions  = (params?: ReportParams) => API.get('/reports/commissions',  { params });
export const getReportBookings     = (params?: ReportParams) => API.get('/reports/bookings',     { params });
export const getReportVehicles     = (params?: ReportParams) => API.get('/reports/vehicles',     { params });
export const toggleCommissionPaid  = (bookingId: string)  => API.patch(`/reports/commissions/${bookingId}/toggle-paid`);

// ─── Credits ─────────────────────────────────────────────────────────────────
export const getCreditAccounts   = ()                                   => API.get('/credits');
export const getCreditAccount    = (customerId: string)                 => API.get(`/credits/${customerId}`);
export const addCreditPayment    = (customerId: string, data: { amount: number; paidAt?: string; note?: string }) => API.post(`/credits/${customerId}/payments`, data);
export const deleteCreditPayment = (paymentId: string)                  => API.delete(`/credits/payments/${paymentId}`);

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const getTasks   = ()                                                        => API.get('/tasks');
export const createTask = (data: { title: string; tag: string; tagLabel: string }) => API.post('/tasks', data);
export const toggleTask = (id: string)                                              => API.patch(`/tasks/${id}`);

// ─── Agreements ───────────────────────────────────────────────────────────────
export const signAgreement = (bookingId: string, data: { signature: string; language: 'en' | 'si' }) =>
  API.post(`/agreements/${bookingId}/sign`, data);
export const getAppConfig  = () => API.get('/agreements/app-config');
export const saveAppConfig = (data: { companySignatoryName: string; companySignatoryTitle: string; companySignature: string }) =>
  API.put('/agreements/app-config', data);
