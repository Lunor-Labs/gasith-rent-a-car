# Gasith Rent a Car 🚗

Full-stack vehicle rental management system for Sri Lanka.

## Project Structure

```
gasith_rent_a_car/
├── frontend/     # Next.js 16 (App Router)
├── backend/      # Express.js + Firebase Admin
└── firebase/     # Firestore & Storage rules
```

---

## Setup

### 1. Firebase Console
1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** → Email/Password
3. Enable **Firestore Database**
4. Enable **Storage**
5. Create an **Admin user** via Authentication
6. Generate a **Service Account** key: Project Settings → Service Accounts → Generate new private key

### 2. Backend (`/backend`)

Copy `.env.example` → `.env` and fill in:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
FIREBASE_PROJECT_ID=rent-577ca
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@rent-577ca.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=rent-577ca.appspot.com
```

```bash
cd backend
npm install
npm run dev   # starts on http://localhost:5000
```

### 3. Frontend (`/frontend`)

Copy `.env.local` and fill in your Firebase **web app** credentials
(from Firebase Console → Project Settings → Web App):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rent-577ca.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rent-577ca
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rent-577ca.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_WHATSAPP_NUMBER=94XXXXXXXXX
```

```bash
cd frontend
npm install
npm run dev   # starts on http://localhost:3000
```

### 4. Deploy Firebase Rules

```bash
cd firebase
firebase deploy --only firestore:rules,storage
```

---

## Features

| Feature | Details |
|---|---|
| 🌐 Landing Page | Mobile-first, dark/gold theme, live vehicle showcase |
| 💬 WhatsApp Float | Floating button for visitors to contact for rentals |
| 🔒 Admin Login | Firebase Auth email/password |
| 📊 Dashboard | Monthly revenue chart (bar), active bookings, total stats |
| 🚗 Vehicles | CRUD, image upload, show/hide on landing, meter tracking |
| 👥 Customers | CRUD + NIC front/back & Driving License upload to Firebase Storage |
| 📋 Bookings | Create, manage, filter by status |
| 🏁 Booking Detail | Enter end meter → auto-calculate km × rate, apply discount |
| 🧾 Invoices | PDF generated server-side (jsPDF), download + WhatsApp share |
| 🤝 Outsourced | Enter final payment, editable commission % (default 10%), net profit shown |
| 📈 Revenue | Auto-updated monthly revenue aggregation in Firestore |

---

## Admin URLs

| Page | URL |
|---|---|
| Landing | http://localhost:3000 |
| Login | http://localhost:3000/login |
| Dashboard | http://localhost:3000/admin |
| Vehicles | http://localhost:3000/admin/vehicles |
| Customers | http://localhost:3000/admin/customers |
| Bookings | http://localhost:3000/admin/bookings |
| Invoices | http://localhost:3000/admin/invoices |

---

## API Endpoints (Backend)

```
GET    /api/vehicles/landing         Public vehicle list for landing page
GET    /api/vehicles                 All vehicles (admin)
POST   /api/vehicles                 Create vehicle + image upload
PUT    /api/vehicles/:id             Update vehicle
DELETE /api/vehicles/:id             Delete vehicle

GET    /api/customers                All customers (admin)
POST   /api/customers                Create customer + doc upload
PUT    /api/customers/:id            Update customer
DELETE /api/customers/:id            Delete customer

GET    /api/bookings                 All bookings
POST   /api/bookings                 Create booking
PUT    /api/bookings/:id/complete    Complete booking (meter + price calc)
GET    /api/bookings/stats/dashboard Dashboard stats
GET    /api/bookings/stats/revenue   Monthly revenue (12 months)

POST   /api/invoices/generate/:bookingId  Generate PDF invoice
GET    /api/invoices/:id/whatsapp         Get WhatsApp share URL
```
