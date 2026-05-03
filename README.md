# TeamTracker - Team Task Manager

A full-stack web application for team project management with role-based access control, Kanban boards, and progress tracking.

![TeamTracker](https://img.shields.io/badge/TeamTracker-Team%20Task%20Manager-6366f1?style=for-the-badge)

## 🚀 Features

### Authentication
- **Signup & Login** with JWT-based authentication
- Role selection during registration (Admin / Member)
- Persistent sessions with automatic token refresh

### Project Management
- Create, edit, and delete projects
- Assign project colors for visual organization
- Add/remove team members with role management
- Project-level admin vs member permissions

### Task Management
- **Kanban Board** view per project (To Do → In Progress → Review → Done)
- Task assignment to team members
- Priority levels: Low, Medium, High, Critical
- Due date tracking with overdue alerts
- Inline status updates from any view
- Full CRUD operations on tasks

### Dashboard
- At-a-glance stats: projects, tasks, completed, overdue
- Status distribution breakdown
- Personal "My Tasks" panel
- Overdue tasks alert panel
- Priority distribution chart

### Role-Based Access Control
| Action | Admin | Member |
|--------|-------|--------|
| Create projects | ✅ | ✅ |
| Delete any project | ✅ | ❌ (own only) |
| Add/remove members | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Update task status | ✅ | ✅ |
| Delete tasks | ✅ | ❌ (own only) |
| View all projects | ✅ | ✅ (member of) |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Styling | Vanilla CSS (Glassmorphic Dark Theme) |
| Icons | Lucide React |
| HTTP | Axios |
| Notifications | React Hot Toast |

## 📁 Project Structure

```
taskflow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Layout, reusable components
│   │   ├── context/        # Auth context provider
│   │   ├── pages/          # Dashboard, Projects, Tasks, Auth
│   │   ├── utils/          # API client (Axios)
│   │   ├── App.jsx         # Routes & auth guards
│   │   └── index.css       # Design system
│   └── index.html
├── server/                 # Express backend
│   ├── config/             # Database connection
│   ├── controllers/        # Auth, Project, Task logic
│   ├── middleware/          # JWT auth & role checks
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   └── server.js           # Express entry point
└── package.json            # Root scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd taskflow
npm run install:all
```

### 2. Configure Environment

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/taskmanager
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

Visit `http://localhost:5173`

## 🌐 Deployment (Railway)

### One-Click Deploy

1. Push code to GitHub
2. Go to [Railway](https://railway.app) and create a new project
3. Connect your GitHub repo
4. Set environment variables:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - A secure random string
   - `JWT_EXPIRE` - `7d`
   - `NODE_ENV` - `production`
5. Set build command: `npm run build`
6. Set start command: `npm start`
7. Deploy!

The server serves the built React app in production mode.

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users` | List all users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| POST | `/api/projects/:id/members/remove` | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filterable) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/dashboard/stats` | Dashboard stats |

## 📸 Screenshots

*Screenshots will be added after deployment*

## 📄 License

MIT
