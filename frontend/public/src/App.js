import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

// Components
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Projects from './pages/Projects/Projects';
import Subsidies from './pages/Subsidies/Subsidies';
import Milestones from './pages/Milestones/Milestones';
import Audit from './pages/Audit/Audit';
import Integration from './pages/Integration/Integration';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Context
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Green color for hydrogen theme
      light: '#4caf50',
      dark: '#1b5e20',
    },
    secondary: {
      main: '#1976d2', // Blue for secondary actions
      light: '#42a5f5',
      dark: '#1565c0',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ProjectProvider>
          <Router>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="subsidies" element={<Subsidies />} />
                  <Route path="milestones" element={<Milestones />} />
                  <Route path="audit" element={<Audit />} />
                  <Route path="integration" element={<Integration />} />
                </Route>
              </Routes>
            </Box>
          </Router>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
