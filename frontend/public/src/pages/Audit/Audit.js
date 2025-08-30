import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

const Audit = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  // Sample audit data
  const auditLogs = [
    {
      id: 1,
      timestamp: '2024-01-15 10:30:00',
      user: 'admin@system.com',
      action: 'Project Created',
      details: 'Green Hydrogen Project Alpha created',
      ipAddress: '192.168.1.100',
      status: 'success',
      module: 'Projects'
    },
    {
      id: 2,
      timestamp: '2024-01-15 09:15:00',
      user: 'manager@company.com',
      action: 'Subsidy Approved',
      details: 'Subsidy $500,000 approved for Project Beta',
      ipAddress: '192.168.1.101',
      status: 'success',
      module: 'Subsidies'
    },
    {
      id: 3,
      timestamp: '2024-01-15 08:45:00',
      user: 'analyst@org.com',
      action: 'Data Export',
      details: 'Project report exported to CSV',
      ipAddress: '192.168.1.102',
      status: 'success',
      module: 'Reports'
    },
    {
      id: 4,
      timestamp: '2024-01-14 17:20:00',
      user: 'admin@system.com',
      action: 'User Login',
      details: 'Successful login from new device',
      ipAddress: '192.168.1.100',
      status: 'success',
      module: 'Authentication'
    },
    {
      id: 5,
      timestamp: '2024-01-14 16:30:00',
      user: 'user@company.com',
      action: 'Failed Login',
      details: 'Invalid password attempt',
      ipAddress: '192.168.1.103',
      status: 'failed',
      module: 'Authentication'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const getModuleColor = (module) => {
    switch (module) {
      case 'Projects': return 'primary';
      case 'Subsidies': return 'secondary';
      case 'Reports': return 'info';
      case 'Authentication': return 'warning';
      default: return 'default';
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || log.status === filterType;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    
    return matchesSearch && matchesType && matchesUser;
  });

  const exportAuditLog = () => {
    // Implementation for exporting audit logs
    console.log('Exporting audit logs...');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Audit Trail
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Actions
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {auditLogs.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Successful Actions
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {auditLogs.filter(log => log.status === 'success').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Failed Actions
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {auditLogs.filter(log => log.status === 'failed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Active Users
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {new Set(auditLogs.map(log => log.user)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Actions, Details, or Users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={filterType}
                label="Status Filter"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>User Filter</InputLabel>
              <Select
                value={filterUser}
                label="User Filter"
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <MenuItem value="all">All Users</MenuItem>
                {Array.from(new Set(auditLogs.map(log => log.user))).map(user => (
                  <MenuItem key={user} value={user}>{user}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Tooltip title="Export Audit Log">
              <IconButton 
                color="primary" 
                onClick={exportAuditLog}
                sx={{ border: 1, borderColor: 'primary.main' }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Log Table */}
      <Paper sx={{ width: '100%' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Details</strong></TableCell>
                <TableCell><strong>Module</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>IP Address</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {log.user}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {log.action}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                      {log.details}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.module} 
                      color={getModuleColor(log.module)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.status} 
                      color={getStatusColor(log.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {log.ipAddress}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {filteredLogs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No audit logs found matching your criteria
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Audit;
