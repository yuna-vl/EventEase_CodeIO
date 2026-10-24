# EventEase_CodeIO

Full-stack event management platform for students and organizers. Built with the MERN stack (MongoDB, Express, React, Node.js) and modern dark glassmorphism architecture.

---

## 📁 Project Structure

```text
EventEase_CodeIO/
├── client/                 # Frontend React application (Vite)
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── App.css         # Component styling
│   │   ├── App.jsx         # Landing view & health status tester
│   │   ├── index.css       # Design tokens & global styles
│   │   └── main.jsx        # React root entry
│   ├── .env.example        # Client environment template
│   ├── package.json        # Client dependencies & scripts
│   └── vite.config.js      # Vite config with API proxy
│
├── server/                 # Backend Node.js / Express application
│   ├── src/
│   │   ├── app.js          # Express app configuration & middleware
│   │   └── server.js       # Server bootstrap & listener
│   ├── .env.example        # Server environment template
│   └── package.json        # Server dependencies & scripts
│
├── .gitignore              # Root git ignore rules
├── package.json            # Root convenience scripts
└── README.md               # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### 1. Environment Setup

Copy the example environment files to `.env` in both `client` and `server`:

```bash
# In server directory:
cp server/.env.example server/.env

# In client directory:
cp client/.env.example client/.env
```

*(On Windows PowerShell, use `Copy-Item server/.env.example server/.env` and `Copy-Item client/.env.example client/.env`)*

#### Server Environment Variables (`server/.env`):
- `PORT`: Port the Express server listens on (Default: `5000`)
- `CLIENT_URL`: Client URL allowed by CORS (Default: `http://localhost:5173`)
- `MONGODB_URI`: MongoDB Atlas connection string (e.g. `mongodb+srv://<username>:<password>@eventeasecluster.mongodb.net/eventease_db?retryWrites=true&w=majority`)
- `JWT_SECRET`: Secret key used for signing and verifying JSON Web Tokens
- `JWT_EXPIRES_IN`: JWT expiration time (Default: `1d`)
- `INITIAL_ORGANIZER_NAME`: Display name for seed organizer (Default: `EventEase Admin`)
- `INITIAL_ORGANIZER_EMAIL`: Email address for seed organizer
- `INITIAL_ORGANIZER_PASSWORD`: Secure password for seed organizer

#### Client Environment Variables (`client/.env`):
- `VITE_API_BASE_URL`: Base URL for the backend API (Default: `http://localhost:5000/api`)

---

### 2. Dependency Installation & Database Seeding

Dependencies can be installed in each sub-directory:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

#### Seeding the Initial Organizer Account
To safely create your initial organizer account with bcrypt-hashed credentials:

```bash
# From root directory:
npm run seed:organizer

# Or inside server directory:
cd server
npm run seed:organizer
```
*(This script is safe to run multiple times; it refuses to create duplicate accounts if the email already exists).*

---

### 3. Running in Development

Open two terminal windows:

#### Terminal 1 — Backend Server
```bash
cd server
npm run dev
```
*Backend runs on: `http://localhost:5000`*
*Health check URL: `http://localhost:5000/api/health`*

#### Terminal 2 — Frontend Client
```bash
cd client
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

Alternatively, from the root folder:
```bash
# Run backend from root
npm run dev:server

# Run frontend from root
npm run dev:client
```

---

### 4. API Endpoints

#### Authentication (Organizer)
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates organizer with email & password, returns JWT | `200` / `400` / `401` |
| `GET` | `/api/auth/me` | Protected | Returns authenticated organizer's profile | `200` / `401` |

#### Events & Registrations
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | Backend and MongoDB health verification | `200` |
| `GET` | `/api/events` | Public | List all events (sorted by upcoming date) | `200` |
| `GET` | `/api/events/:id` | Public | Get details of a single event | `200` / `404` |
| `POST` | `/api/events` | **Protected** | Create a new event with validated input | `201` / `400` / `401` |
| `POST` | `/api/events/:id/register` | Public | Register a participant (concurrency & capacity-safe) | `201` / `400` / `409` |
| `GET` | `/api/events/:id/attendees` | **Protected** | Fetch attendee roster for an event | `200` / `401` / `404` |

> 🔒 **Authorization Details**: Protected endpoints require an `Authorization` HTTP header with the format: `Bearer <jwt_token>`. Unauthenticated requests receive HTTP `401 Unauthorized`.

---

### 5. Automated API Verification Suite

To run the automated test suite testing validation, duplicate prevention, seat capacity, and concurrent race conditions:

```bash
# From root directory:
npm run test:server

# Or inside server directory:
cd server
npm test
```

---

### 6. Building for Production

To test the frontend production build:
```bash
cd client
npm run build
```
The compiled assets will be placed in `client/dist/`.
>>>>>>> 6934881 (Initial commit: EventEase full-stack platform with student and organizer portals)
