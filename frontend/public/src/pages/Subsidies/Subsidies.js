import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useProject } from '../../context/ProjectContext';

const Subsidies = () => {
  const { subsidies, projects, loading } = useProject();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSubsidy, setEditingSubsidy] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    projectId: '',
    amount: '',
    type: 'capital',
    status: 'pending',
    applicationDate: '',
    approvalDate: '',
    disbursementDate: '',
    notes: ''
  });

  const handleOpenDialog = (subsidy = null) => {
    if (subsidy) {
      setEditingSubsidy(subsidy);
      setFormData({
        projectId: subsidy.projectId || '',
        amount: subsidy.amount || '',
        type: subsidy.type || 'capital',
        status: subsidy.status || 'pending',
        applicationDate: subsidy.applicationDate || '',
        approvalDate: subsidy.approvalDate || '',
        disbursementDate: subsidy.disbursementDate || '',
        notes: subsidy.notes || ''
      });
    } else {
      setEditingSubsidy(null);
      setFormData({
        projectId: '',
        amount: '',
        type: 'capital',
        status: 'pending',
        applicationDate: '',
        approvalDate: '',
        disbursementDate: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSubsidy(null);
    setFormData({
      projectId: '',
      amount: '',
      type: 'capital',
      status: 'pending',
      applicationDate: '',
      approvalDate: '',
      disbursementDate: '',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Here you would call the API to create/update subsidy
      setSnackbar({ open: true, message: 'Subsidy saved successfully!', severity: 'success' });
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ open: true, message: 'Operation failed!', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subsidy?')) {
      try {
        // Here you would call the API to delete subsidy
        setSnackbar({ open: true, message: 'Subsidy deleted successfully!', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: 'Delete failed!', severity: 'error' });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'disbursed': return 'info';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'capital': return 'primary';
      case 'operational': return 'secondary';
      case 'research': return 'info';
      default: return 'default';
    }
  };

  const columns = [
    { 
      field: 'projectName', 
      headerName: 'Project', 
      width: 200, 
      flex: 1,
      valueGetter: (params) => {
        const project = projects.find(p => p.id === params.row.projectId);
        return project ? project.name : 'Unknown Project';
      }
    },
    { field: 'amount', headerName: 'Amount ($)', width: 150, type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '0'
    },
    { field: 'type', headerName: 'Type', width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getTypeColor(params.value)}
          size="small"
        />
      )
    },
    { field: 'status', headerName: 'Status', width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    { field: 'applicationDate', headerName: 'Application Date', width: 150, type: 'date' },
    { field: 'approvalDate', headerName: 'Approval Date', width: 150, type: 'date' },
    { field: 'disbursementDate', headerName: 'Disbursement Date', width: 150, type: 'date' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => handleOpenDialog(params.row)}
            variant="outlined"
          >
            Edit
          </Button>
          <Button
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(params.row.id)}
            variant="outlined"
            color="error"
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Subsidies Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Add New Subsidy
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={subsidies}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection
          disableSelectionOnClick
          loading={loading}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Paper>

      {/* Add/Edit Subsidy Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSubsidy ? 'Edit Subsidy' : 'Add New Subsidy'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Project</InputLabel>
                <Select
                  value={formData.projectId}
                  label="Project"
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  required
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                required
                label="Amount ($)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                fullWidth
                margin="normal"
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="capital">Capital</MenuItem>
                  <MenuItem value="operational">Operational</MenuItem>
                  <MenuItem value="research">Research & Development</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="disbursed">Disbursed</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Application Date"
                type="date"
                value={formData.applicationDate}
                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Approval Date"
                type="date"
                value={formData.approvalDate}
                onChange={(e) => setFormData({ ...formData, approvalDate: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Disbursement Date"
                type="date"
                value={formData.disbursementDate}
                onChange={(e) => setFormData({ ...formData, disbursementDate: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              margin="normal"
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingSubsidy ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Subsidies;
