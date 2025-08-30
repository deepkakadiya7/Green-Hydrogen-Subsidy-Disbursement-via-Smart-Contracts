# Green Hydrogen Subsidy System - Frontend

A modern React-based frontend application for managing green hydrogen subsidy projects, built with Material-UI and modern web technologies.

## 🚀 Features

- **Modern Dashboard**: Comprehensive overview with charts and statistics
- **Project Management**: Full CRUD operations for green hydrogen projects
- **Subsidy Tracking**: Manage subsidy applications and distributions
- **Milestone Management**: Track project progress and milestones
- **Audit Trail**: Complete system activity logging and compliance tracking
- **System Integrations**: Manage external system connections (blockchain, banking, etc.)
- **Responsive Design**: Mobile-first approach with Material-UI components
- **Authentication**: Secure user login and registration system
- **Real-time Updates**: Live data updates and notifications

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks and functional components
- **Material-UI (MUI) 5** - Professional UI component library
- **React Router 6** - Client-side routing
- **Axios** - HTTP client for API communication
- **Recharts** - Beautiful and responsive charts
- **Formik & Yup** - Form handling and validation
- **Web3.js & Ethers** - Blockchain integration capabilities

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   └── Layout/        # Main layout with navigation
│   ├── context/           # React context for state management
│   │   ├── AuthContext.js # Authentication state
│   │   └── ProjectContext.js # Project data state
│   ├── pages/             # Application pages
│   │   ├── Auth/          # Login and registration
│   │   ├── Dashboard/     # Main dashboard
│   │   ├── Projects/      # Project management
│   │   ├── Subsidies/     # Subsidy management
│   │   ├── Milestones/    # Milestone tracking
│   │   ├── Audit/         # Audit trail
│   │   └── Integration/   # System integrations
│   ├── App.js             # Main application component
│   ├── index.js           # Application entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npm start
   # or
   yarn start
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (not recommended)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend root directory:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_BLOCKCHAIN_NETWORK=ethereum
REACT_APP_CONTRACT_ADDRESS=0x1234...
```

### Backend Integration

The frontend is configured to proxy API requests to the backend server running on port 5000. Make sure your backend server is running before testing the frontend.

## 🎨 UI Components

### Material-UI Theme

The application uses a custom Material-UI theme with:
- **Primary Color**: Green (#2e7d32) - representing hydrogen/sustainability
- **Secondary Color**: Blue (#1976d2) - for secondary actions
- **Custom Components**: Enhanced buttons, cards, and form elements

### Responsive Design

- Mobile-first approach
- Responsive grid system
- Collapsible sidebar navigation
- Touch-friendly interface

## 📊 Data Management

### State Management

- **AuthContext**: Manages user authentication state
- **ProjectContext**: Handles project data and operations
- **Local Storage**: Persists authentication tokens

### API Integration

- RESTful API communication with backend
- JWT token authentication
- Error handling and loading states
- Real-time data updates

## 🔐 Authentication

### Features

- User registration with validation
- Secure login system
- JWT token management
- Role-based access control
- Password validation and security

### User Roles

- **User**: Basic access to view projects and subsidies
- **Manager**: Enhanced access to manage projects and approvals
- **Administrator**: Full system access and configuration

## 📈 Dashboard Features

### Overview Cards

- Total projects count
- Active projects
- Total subsidies distributed
- Pending subsidies

### Charts and Analytics

- Monthly project trends
- Subsidy distribution charts
- Project status distribution
- Progress tracking

### Recent Activity

- Latest project updates
- Recent subsidy activities
- System notifications

## 🏗️ Project Management

### Project CRUD Operations

- Create new projects
- Edit project details
- Update project status
- Delete projects
- Progress tracking

### Project Fields

- Basic information (name, description, location)
- Technical details (capacity, technology)
- Timeline (start/end dates)
- Budget and progress
- Status management

## 💰 Subsidy Management

### Subsidy Types

- **Capital**: Infrastructure and equipment
- **Operational**: Day-to-day operations
- **Research & Development**: Innovation projects

### Status Tracking

- Pending approval
- Approved
- Rejected
- Disbursed

## 🎯 Milestone Tracking

### Milestone Types

- **Development**: Technical milestones
- **Regulatory**: Compliance requirements
- **Financial**: Funding milestones
- **Technical**: Engineering achievements

### Progress Monitoring

- Percentage completion
- Due date tracking
- Priority levels
- Status updates

## 🔍 Audit Trail

### Tracking Features

- User actions logging
- System changes recording
- IP address tracking
- Timestamp logging
- Export capabilities

### Filtering and Search

- Date range filtering
- User-based filtering
- Action type filtering
- Full-text search

## 🔗 System Integrations

### Supported Integrations

- **Blockchain**: Smart contract integration
- **Banking**: Payment processing
- **Data Oracle**: External data feeds
- **Regulatory**: Compliance databases

### Integration Features

- Connection testing
- Health monitoring
- Configuration management
- Status tracking

## 🧪 Testing

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 📦 Building for Production

### Build Process

```bash
# Create production build
npm run build

# The build folder will contain:
# - Optimized JavaScript bundles
# - Minified CSS
# - Static assets
# - Service worker (if enabled)
```

### Deployment

The built application can be deployed to:
- Static hosting services (Netlify, Vercel)
- Cloud platforms (AWS S3, Google Cloud Storage)
- Traditional web servers (Apache, Nginx)

## 🤝 Contributing

### Development Guidelines

1. Follow React best practices
2. Use functional components with hooks
3. Implement proper error handling
4. Add loading states for async operations
5. Maintain responsive design
6. Write clean, documented code

### Code Style

- Use ES6+ features
- Implement proper TypeScript (if enabled)
- Follow Material-UI design patterns
- Maintain consistent naming conventions

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Change port in package.json scripts
2. **API connection**: Verify backend server is running
3. **Build errors**: Clear node_modules and reinstall
4. **CORS issues**: Check backend CORS configuration

### Debug Mode

Enable debug logging by setting:
```env
REACT_APP_DEBUG=true
```

## 📚 Additional Resources

- [Material-UI Documentation](https://mui.com/)
- [React Documentation](https://reactjs.org/)
- [Create React App Guide](https://create-react-app.dev/)

## 📄 License

This project is part of the Green Hydrogen Subsidy System and follows the same licensing terms.

---

**Built with ❤️ for sustainable energy management**
