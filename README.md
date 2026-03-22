# Movie Streaming Web Application

A full-stack movie streaming application built with a modern tech stack. The platform allows users to browse movies and series, stream content, manage watchlists, view watch history, and enjoy movies together in real-time Watch Parties.

## 🚀 Features

### For Users 
*   **Authentication & Profiles**: Register, login, manage profile, and track watch history.
*   **Movie Browsing & Search**: Explore an extensive catalog of single movies and TV series with detailed information (genres, cast, ratings from TMDB/IMDb).
*   **Video Streaming**: High-quality video playback with support for HLS streams (`hls.js`).
*   **Watch Party (Real-time)**: Create rooms and invite friends to watch movies together. Video playback is synchronized across all users in the room (Play/Pause/Seek sync) using WebSockets (`Socket.io`).
*   **Watchlist**: Save movies to watch later.
*   **Reviews & Ratings**: Rate and write reviews for movies.
*   **Subscriptions**: Premium plans available with duration and stream limits.

### For Admins
*   **Dashboard**: Overview of platform statistics.
*   **Content Management**: Manage movies, episodes, and synchronize content from external APIs.
*   **User Management**: View and modify user roles and subscriptions.

## 🛠️ Technology Stack

### Frontend
*   **Framework**: React 19 with TypeScript and Vite
*   **Styling**: Tailwind CSS v4
*   **State Management**: Zustand
*   **Routing**: React Router DOM v7
*   **Forms & Validation**: React Hook Form + Zod
*   **API Client**: Axios
*   **Video Player**: HLS.js
*   **Real-time Communication**: Socket.io-client
*   **Icons**: Lucide React

### Backend
*   **Environment**: Node.js & Express with TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Caching & Message Queues**: Redis & BullMQ
*   **Real-time Communication**: Socket.io
*   **Authentication**: JSON Web Tokens (JWT) & bcryptjs
*   **Other Tools**: Helmet (Security), Morgan (Logging)

## 📦 Project Structure

```
movie-app/
├── backend/                  # Express + Prisma + Redis backend
│   ├── prisma/               # Prisma schema and migrations
│   └── src/                  # Source code (controllers, routes, sockets, jobs)
├── frontend/                 # React + Vite frontend
│   ├── src/                  # Source code (components, pages, store, hooks)
│   └── public/               # Static assets
└── README.md                 # Project documentation
```

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL
*   Redis server running

### Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables by copying `.env.example` to `.env` and configuring your connection strings (Database, Redis, JWT Secret).
4.  Run Prisma migrations to set up the database schema:
    ```bash
    npm run db:migrate
    ```
5.  Start the development server:
    ```bash
    npm run dev
    ```

### Frontend Setup
1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables (e.g., API URL).
4.  Start the development server:
    ```bash
    npm run dev
    ```

## 📜 License

This project is licensed under the ISC License.
