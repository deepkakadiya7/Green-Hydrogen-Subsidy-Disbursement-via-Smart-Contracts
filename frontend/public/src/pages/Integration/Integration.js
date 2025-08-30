import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon
} from '@mui/icons-material';

const Integration = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [testResults, setTestResults] = useState({});

  const integrations = [
    {
      id: 'blockchain',
      name: 'Blockchain Integration',
      description: 'Smart contract integration for subsidy distribution and verification',
      status: 'active',
      health: 'healthy',
      lastSync: '2024-01-15 10:30:00',
      type: 'blockchain',
      endpoint: 'https://ethereum.mainnet',
      apiKey: 'Configured',
      icon: <StorageIcon />,
      details: {
        network: 'Ethereum Mainnet',
        contractAddress: '0x1234...5678',
        gasLimit: '300,000',
        lastBlock: '18,456,789'
      }
    },
    {
      id: 'banking',
      name: 'Banking System',
      description: 'Integration with banking APIs for subsidy disbursement',
      status: 'active',
      health: 'healthy',
      lastSync: '2024-01-15 09:15:00',
      type: 'banking',
      endpoint: 'https://api.bank.com/v1',
      apiKey: 'Configured',
      icon: <SecurityIcon />,
      details: {
        bank: 'National Bank',
        accountType: 'Business',
        routingNumber: '****1234',
        lastTransaction: '2024-01-15 09:15:00'
      }
    },
    {
      id: 'oracle',
      name: 'Data Oracle',
      description: 'External data feeds for project verification and compliance',
      status: 'inactive',
      health: 'warning',
      lastSync: '2024-01-14 16:45:00',
      type: 'oracle',
      endpoint: 'https://oracle.data.com/api',
      apiKey: 'Not Configured',
      icon: <CloudIcon />,
      details: {
        provider: 'DataOracle Inc',
        dataTypes: 'Weather, Energy Prices',
        updateFrequency: '1 hour',
        lastUpdate: '2024-01-14 16:45:00'
      }
    },
    {
      id: 'regulatory',
      name: 'Regulatory Database',
      description: 'Government compliance and regulatory requirement checks',
      status: 'active',
      health: 'healthy',
      lastSync: '2024-01-15 08:30:00',
      type: 'regulatory',
      endpoint: 'https://gov.regulations.com/api',
      apiKey: 'Configured',
      icon: <ApiIcon />,
      details: {
        agency: 'Environmental Protection',
        jurisdiction: 'Federal',
        lastUpdate: '2024-01-15 08:30:00',
        complianceRate: '98.5%'
      }
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      default: return 'warning';
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ErrorIcon color="disabled" />;
    }
  };

  const handleIntegrationClick = (integration) => {
    setSelectedIntegration(integration);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedIntegration(null);
  };

  const handleToggleIntegration = (integrationId) => {
    // Implementation for toggling integration status
    console.log('Toggling integration:', integrationId);
  };

  const handleTestConnection = (integrationId) => {
    // Simulate testing connection
    setTestResults(prev => ({
      ...prev,
      [integrationId]: { status: 'testing', message: 'Testing connection...' }
    }));

    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      setTestResults(prev => ({
        ...prev,
        [integrationId]: {
          status: success ? 'success' : 'error',
          message: success ? 'Connection successful!' : 'Connection failed'
        }
      }));
    }, 2000);
  };

  const handleRefreshData = (integrationId) => {
    // Implementation for refreshing data
    console.log('Refreshing data for:', integrationId);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        System Integrations
      </Typography>

      {/* Integration Cards */}
      <Grid container spacing={3}>
        {integrations.map((integration) => (
          <Grid item xs={12} md={6} key={integration.id}>
            <Card className="dashboard-card" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: 'primary.main', mr: 2 }}>
                    {integration.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                      {integration.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {integration.description}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip 
                        label={integration.status} 
                        color={getStatusColor(integration.status)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Health
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getHealthIcon(integration.health)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {integration.health}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last Sync: {integration.lastSync}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Endpoint: {integration.endpoint}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    API Key: {integration.apiKey}
                  </Typography>
                </Box>

                {testResults[integration.id] && (
                  <Box sx={{ mb: 2 }}>
                    {testResults[integration.id].status === 'testing' && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LinearProgress sx={{ flexGrow: 1, mr: 1 }} />
                        <Typography variant="body2">Testing...</Typography>
                      </Box>
                    )}
                    {testResults[integration.id].status !== 'testing' && (
                      <Alert 
                        severity={testResults[integration.id].status} 
                        sx={{ py: 0 }}
                      >
                        {testResults[integration.id].message}
                      </Alert>
                    )}
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={integration.status === 'active'}
                        onChange={() => handleToggleIntegration(integration.id)}
                        color="primary"
                      />
                    }
                    label="Enable"
                  />
                </Box>
                <Box>
                  <Button
                    size="small"
                    startIcon={<SettingsIcon />}
                    onClick={() => handleIntegrationClick(integration)}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  >
                    Configure
                  </Button>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleRefreshData(integration.id)}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    size="small"
                    startIcon={testResults[integration.id]?.status === 'testing' ? <StopIcon /> : <PlayIcon />}
                    onClick={() => handleTestConnection(integration.id)}
                    variant="contained"
                    disabled={testResults[integration.id]?.status === 'testing'}
                  >
                    {testResults[integration.id]?.status === 'testing' ? 'Stop' : 'Test'}
                  </Button>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Integration Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Configure {selectedIntegration?.name}
        </DialogTitle>
        <DialogContent>
          {selectedIntegration && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Endpoint URL"
                    value={selectedIntegration.endpoint}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="API Key"
                    type="password"
                    value={selectedIntegration.apiKey === 'Configured' ? '••••••••' : ''}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedIntegration.status}
                      label="Status"
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Integration Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {Object.entries(selectedIntegration.details).map(([key, value]) => (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Integration;
