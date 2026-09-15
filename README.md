# Calling Agent

AI-powered Calling Agent with CRM Call Management, real-time analytics, and automated lead & sales representative assignment.

## Project Structure

```
calling_agent/
├── backend/            # Express.js, Sequelize ORM, MySQL backend API
│   ├── src/            # Core modules, controllers, routes, and services
│   ├── tests/          # Authentication & RBAC test suite
│   └── package.json
├── frontend/           # React 19 dashboard & calling agent UI
│   ├── src/            # Components, hooks, and API client
│   └── package.json
└── README.md
```

## Features

- **Automated AI Voice Calling**: Integration with voice calling providers (e.g. Bolna) for inbound and outbound calls.
- **Calling Agent Dashboard**: Complete management of call records, status tracking, filters, audio recordings, and analytics.
- **Sales Rep Assignment**: Direct assignment of calls and leads to marketing representatives.
- **Role-Based Access Control (RBAC)**: Secure access gating for `super-admin`, `admin`, and `location-admin` roles.
- **MySQL Database Integration**: Seamless sync between leads, calls, activities, users, and employee details.

## Quick Start

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the server:
   ```bash
   npm start
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
