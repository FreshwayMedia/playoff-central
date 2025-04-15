# NHL Playoff Pool

A web application for managing NHL playoff pools, allowing users to create teams, track standings, and compete with friends.

## Features

- User authentication and authorization
- Team creation and management
- Real-time standings updates
- Detailed scoring system
- Responsive design for all devices

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nhl-playoff-pool.git
cd nhl-playoff-pool
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:
- Create `.env` for development
- Create `production.env` for production

Example `.env`:
```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/nhl-playoff-pool
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create a new team
- `GET /api/teams/:id` - Get team by ID
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Standings
- `GET /api/standings` - Get current standings

## Deployment

The application is configured for deployment on Railway. To deploy:

1. Push your changes to the main branch
2. Railway will automatically deploy the latest version

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 