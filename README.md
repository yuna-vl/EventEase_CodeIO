# EventEase Live 🎟️

> **Modern, Full-Stack Event Discovery, Registration & Management Platform**  
> Built with the **MERN** stack (MongoDB, Express, React, Node.js), featuring a responsive dark glassmorphism UI, dual-role RBAC (Student & Organizer), Google OAuth 2.0, real-time seat tracking, and downloadable digital event passes.

---

> [!IMPORTANT]
> ### 🔑 Important Organizer Access & Credentials
>
> | Parameter | Default Value | Description |
> |---|---|---|
> | **INITIAL_ORGANIZER_NAME** | `EventEase Admin` | Display name of the pre-configured administrator account |
> | **INITIAL_ORGANIZER_EMAIL** | `admin@eventease.live` | Login email for the pre-seeded organizer portal |
> | **INITIAL_ORGANIZER_PASSWORD** | `EventEaseAdmin2026!` | Password for the pre-seeded organizer account |
> | **ORGANIZER_INVITE_CODE / SECRET** | `EventEaseOrganizer2026!` | Secret invite code required to register **new** Organizer accounts (also accepts `EventEaseAdmin2026!`) |
>
> *Use these credentials to log in directly via the **Organiser Login** tab, or supply the **Invite Code** when creating a new organiser profile.*

---

## 🌟 Key Features

### 🎓 Student Experience
- **Interactive Event Discovery**: Browse events with real-time keyword search, categories (*Technical, Cultural, Sports, Workshop, Seminar, Hackathon*), date sorting, and fee filtering (Free vs. Paid).
- **Live Seat Availability**: Concurrency-safe, real-time badges indicating seats remaining (*"Filling Fast"*, *"Sold Out"*).
- **One-Click Atomic Registration**: Concurrency-safe event registration preventing overselling and duplicate bookings using atomic MongoDB `$inc` operations.
- **Digital Event Passes & PDF Export**: Instant digital ticket generation with pass codes/QR representations, downloadable as image or PDF (powered by `jspdf` and `html2canvas`).
- **Saved Events / Bookmarks**: Bookmark upcoming events to personal saved lists for quick access.
- **Real-Time Notification Center**: Live in-app notifications for event registrations, status updates, schedule changes, and event cancellations with mark-as-read controls.
- **Student Profile Management**: Personal student profile with university, department, student ID/roll number, graduation year, and contact details.

### 🏢 Organizer Experience
- **Authoritative Dashboard & Analytics**: Real-time KPI statistics including total events hosted, total registrations, overall attendance rate, and occupancy metrics.
- **Full Event Lifecycle Management**: Create, edit, publish, draft, or cancel events with custom schedules, venues, seat limits, and categories.
- **Banner Customization**: Upload custom banner artwork or select vibrant gradient presets.
- **Attendee Roster & Live Check-in**: View registrant lists per event, search attendee details, export lists, and mark attendance status in real time.
- **Multi-Tenant Ownership & Isolation**: Strict security guarantees ensuring organizers can only view, edit, or manage their own events, statistics, and attendee rosters.

### 🛡️ Security & Architecture
- **Role-Based Access Control (RBAC)**: Distinct permissions for `student` and `organizer` accounts enforced via Express middleware (`authenticateUser` & `requireRole`).
- **Google OAuth 2.0 Integration**: Cross-verified Google Sign-In using `@react-oauth/google` on the client and `google-auth-library` server-side ID token verification.
- **Protected Organizer Provisioning**: Prevents unauthorized privilege escalation via organizer secret code verification or secure CLI seeding.
- **Modern Glassmorphism UI**: High-contrast dark aesthetic, backdrop filters, smooth micro-interactions, and a responsive mobile bottom navigation bar.

---

## 📂 Project Structure

```text
EventEase_CodeIO/
├── client/                     # Frontend React application (Vite)
│   ├── public/                 # Static assets & public icons
│   ├── src/
│   │   ├── assets/             # Images & static media
│   │   ├── components/         # Modular React UI components
│   │   │   ├── DigitalPassModal.jsx    # Ticket pass modal & PDF download
│   │   │   ├── DiscoveryHeader.jsx     # Category filters & search bar
│   │   │   ├── EventCard.jsx           # Interactive event cards
│   │   │   ├── EventDetailModal.jsx    # Event details & registration dialog
│   │   │   ├── FilterModal.jsx         # Multi-criteria filter drawer
│   │   │   ├── MobileBottomNav.jsx     # Mobile view responsive navigation
│   │   │   ├── MyEventsView.jsx        # Organizer event management view
│   │   │   ├── MyTicketsView.jsx       # Student registered passes view
│   │   │   ├── Navbar.jsx              # Main application header & role badges
│   │   │   ├── NotificationBell.jsx    # Notification dropdown panel
│   │   │   ├── OrganizerDashboard.jsx  # Organizer KPIs & analytics
│   │   │   ├── RoleAuth.jsx            # Unified login/signup modal (Email & Google)
│   │   │   ├── SavedEventsView.jsx     # Bookmarked events panel
│   │   │   └── StudentProfileView.jsx  # Student profile editor
│   │   ├── context/            # React context providers (AuthContext, etc.)
│   │   ├── services/           # Axios/Fetch API client abstractions
│   │   ├── utils/              # Client helpers (date formatting, PDF export)
│   │   ├── App.css             # Main styling & glassmorphic tokens
│   │   ├── App.jsx             # Main router & layout controller
│   │   ├── index.css           # Global typography & root styles
│   │   └── main.jsx            # React 19 application root
│   ├── .env.example            # Client environment variable template
│   ├── package.json            # Client dependencies & scripts
│   └── vite.config.js          # Vite config with API proxy
│
├── server/                     # Backend Node.js / Express API
│   ├── src/
│   │   ├── config/             # MongoDB connection & database bootstrap
│   │   ├── controllers/        # Route controllers
│   │   │   ├── authController.js       # Login, signup & Google OAuth
│   │   │   ├── eventController.js      # CRUD, registration & live attendance
│   │   │   ├── notificationController.js # User notifications
│   │   │   └── studentController.js    # Student profiles, saved events, passes
│   │   ├── middleware/         # Auth verification & RBAC guards
│   │   │   └── auth.js         # JWT verification & role validation
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── Event.js        # Event schema & capacity indexing
│   │   │   ├── Notification.js # Notification schema
│   │   │   ├── Organizer.js    # Legacy organizer schema
│   │   │   ├── Registration.js # Atomic registration & ticket model
│   │   │   ├── SavedEvent.js   # Student bookmarks
│   │   │   └── User.js         # Unified user model (Student & Organizer)
│   │   ├── routes/             # Express API routes
│   │   │   ├── authRoutes.js           # /api/auth
│   │   │   ├── eventRoutes.js          # /api/events
│   │   │   ├── notificationRoutes.js   # /api/notifications
│   │   │   └── studentRoutes.js        # /api/students
│   │   ├── scripts/            # Database seed and maintenance scripts
│   │   │   ├── auditLegacyEvents.js    # Event ownership audit utility
│   │   │   └── seedOrganizer.js        # Initial organizer provisioning script
│   │   ├── app.js              # Express middleware and route configuration
│   │   └── server.js           # Server entry point & port listener
│   ├── .env.example            # Server environment variable template
│   ├── package.json            # Server dependencies & scripts
│   ├── test-api.js             # General API test suite
│   ├── test-ownership-and-stats.js # Multi-tenant isolation test suite
│   └── test-role-auth.js       # RBAC & authentication verification suite
│
├── .gitignore                  # Git ignore rules
├── package.json                # Root convenience scripts
└── README.md                   # Project documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Vanilla CSS3 (Glassmorphism, CSS Grid, Flexbox), `@react-oauth/google`, `jspdf`, `html2canvas` |
| **Backend** | Node.js, Express.js (ES Modules) |
| **Database** | MongoDB Atlas, Mongoose 9+ |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs`, Google OAuth 2.0 (`google-auth-library`) |
| **Testing** | Node.js native test scripts (`test-role-auth.js`, `test-ownership-and-stats.js`, `test-api.js`) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or later (`v20+` LTS recommended)
- **npm**: `v9.0.0` or later
- **MongoDB**: A running local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI

---

### 1. Installation

Clone the repository and install all root, server, and client dependencies:

```bash
# Clone the repository
git clone https://github.com/your-username/EventEase_CodeIO.git
cd EventEase_CodeIO

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Return to root directory
cd ..
```

---

### 2. Environment Configuration

Create `.env` configuration files in both `server/` and `client/` directories based on the provided examples.

#### Backend Configuration (`server/.env`):
```env
# Server Port
PORT=5000

# Client URL (Allowed CORS Origin)
CLIENT_URL=http://localhost:5173

# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/eventease_db?retryWrites=true&w=majority

# JWT Authentication Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRES_IN=1d

# Google OAuth 2.0 Client ID (Backend Token Verification)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Organizer Registration Secret (Guards organizer signup)
ORGANIZER_SIGNUP_SECRET=EventEaseOrganizer2026!

# Seed Administrator Credentials (for npm run seed:organizer)
INITIAL_ORGANIZER_NAME=EventEase Admin
INITIAL_ORGANIZER_EMAIL=admin@eventease.live
INITIAL_ORGANIZER_PASSWORD=AdminSecurePassword123!
```

#### Frontend Configuration (`client/.env`):
```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000/api

# Google OAuth 2.0 Client ID (for @react-oauth/google)
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

> 💡 **Google OAuth Setup Note**: To enable Google Sign-In, obtain a Client ID from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Configure `http://localhost:5173` under **Authorized JavaScript Origins**.

---

### 3. Provisioning the Initial Organizer Account

Before logging in as an organizer, seed the database with the initial verified organizer account:

```bash
# From workspace root:
npm run seed:organizer

# Or directly from the server folder:
cd server
npm run seed:organizer
```
*This command is idempotent: if the organizer already exists, it verifies credentials without creating duplicate records.*

---

### 4. Running the Development Servers

You can start both servers using separate terminal windows or from the root:

#### Option A: Running from Root
```bash
# Terminal 1: Backend server (http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend client (http://localhost:5173)
npm run dev:client
```

#### Option B: Running in Subdirectories
```bash
# In server/
cd server
npm run dev

# In client/
cd client
npm run dev
```

Once running, navigate to:
- **Client App**: [http://localhost:5173](http://localhost:5173)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📡 API Reference

All protected endpoints require an `Authorization` header containing the user's JWT:
```http
Authorization: Bearer <jwt_token>
```

### 1. Authentication Routes (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate student or organizer with email & password |
| `POST` | `/api/auth/signup` | Public / Protected | Register a new user (`organizerSecret` required for organizers) |
| `POST` | `/api/auth/google` | Public | Google OAuth token verification and login/registration |
| `GET` | `/api/auth/me` | Protected | Fetch current authenticated user's profile and active role |

---

### 2. Events & Management Routes (`/api/events`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | List all published events (supports search, category, status filters) |
| `POST` | `/api/events` | **Organizer** | Create a new event |
| `GET` | `/api/events/organizer/events` | **Organizer** | Fetch events created by the logged-in organizer |
| `GET` | `/api/events/organizer/stats` | **Organizer** | Fetch authoritative organizer dashboard analytics & KPIs |
| `POST` | `/api/events/upload-banner` | **Organizer** | Upload or set custom event banner image |
| `GET` | `/api/events/:id` | Public | Retrieve detailed event information |
| `PUT` | `/api/events/:id` | **Organizer** | Update event details (restricted to owning organizer) |
| `DELETE`| `/api/events/:id` | **Organizer** | Delete an event (restricted to owning organizer) |
| `PATCH`| `/api/events/:id/status` | **Organizer** | Update event status (`published`, `draft`, `cancelled`) |
| `PATCH`| `/api/events/:id/cancel` | **Organizer** | Cancel event and notify registered attendees |
| `POST` | `/api/events/:id/register`| Public / Auth | Concurrency-safe participant event registration |
| `GET` | `/api/events/:id/attendees`| **Organizer** | Retrieve registered attendee roster for an event |
| `PATCH`| `/api/events/:id/attendees/:attendeeId/attendance` | **Organizer** | Toggle attendee check-in / verified attendance |

---

### 3. Student Routes (`/api/students`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/students/me` | **Student** | Retrieve student profile details |
| `PATCH`| `/api/students/me` | **Student** | Update student profile information |
| `GET` | `/api/students/saved-events` | **Student** | Retrieve full details of bookmarked events |
| `GET` | `/api/students/saved-events/ids` | **Student** | Retrieve array of saved event IDs for quick UI sync |
| `POST` | `/api/students/saved-events/:eventId` | **Student** | Save/bookmark an event |
| `DELETE`| `/api/students/saved-events/:eventId` | **Student** | Remove event from bookmarks |
| `GET` | `/api/students/tickets` | **Student** | Retrieve all registered event tickets & passes |
| `GET` | `/api/students/tickets/:ticketId` | **Student** | Retrieve single ticket pass details |

---

### 4. Notification Routes (`/api/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Protected | Fetch current user notifications |
| `PATCH`| `/api/notifications/read-all` | Protected | Mark all user notifications as read |
| `PATCH`| `/api/notifications/:id/read` | Protected | Mark a single notification as read |

---

## 🧪 Automated Testing

EventEase includes end-to-end API test suites validating security, RBAC, race conditions, and tenant isolation:

```bash
# 1. Run Role-Based Access Control (RBAC) & Authentication test suite
npm run test:rbac

# 2. Run Multi-Tenant Organizer Ownership & Dashboard Statistics test suite
npm run test:ownership

# 3. Run General Server & Concurrency Registration test suite
npm run test:server

# 4. Run Legacy Event Ownership Audit script
npm run audit:legacy
```

---

## 📦 Production Build

To build the frontend client for production deployment:

```bash
# Build production bundle
npm run build:client
```
The optimized production assets will be output to `client/dist/`, ready for hosting on Vercel, Netlify, or serving via static Express middleware.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
