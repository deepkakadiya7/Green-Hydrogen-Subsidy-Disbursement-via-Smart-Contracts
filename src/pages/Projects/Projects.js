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
  Snackbar
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useProject } from '../../context/ProjectContext';

const Projects = () => {
  const { projects, createProject, updateProject, deleteProject, loading } = useProject();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    capacity: '',
    technology: '',
    status: 'pending',
    startDate: '',
    endDate: '',
    budget: '',
    progress: 0
  });

  const handleOpenDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name || '',
        description: project.description || '',
        location: project.location || '',
        capacity: project.capacity || '',
        technology: project.technology || '',
        status: project.status || 'pending',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        budget: project.budget || '',
        progress: project.progress || 0
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        location: '',
        capacity: '',
        technology: '',
        status: 'pending',
        startDate: '',
        endDate: '',
        budget: '',
        progress: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      location: '',
      capacity: '',
      technology: '',
      status: 'pending',
      startDate: '',
      endDate: '',
      budget: '',
      progress: 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
        setSnackbar({ open: true, message: 'Project updated successfully!', severity: 'success' });
      } else {
        await createProject(formData);
        setSnackbar({ open: true, message: 'Project created successfully!', severity: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ open: true, message: 'Operation failed!', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        setSnackbar({ open: true, message: 'Project deleted successfully!', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: 'Delete failed!', severity: 'error' });
      }
    }
  };

  const columns = [
    { field: 'name', headerName: 'Project Name', width: 200, flex: 1 },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'capacity', headerName: 'Capacity (MW)', width: 120, type: 'number' },
    { field: 'technology', headerName: 'Technology', width: 150 },
    { field: 'status', headerName: 'Status', width: 120,
      renderCell: (params) => (
        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 1,
            backgroundColor: params.value === 'active' ? 'success.light' : 
                           params.value === 'completed' ? 'info.light' : 'warning.light',
            color: params.value === 'active' ? 'success.dark' : 
                   params.value === 'completed' ? 'info.dark' : 'warning.dark',
            fontWeight: 'medium'
          }}
        >
          {params.value}
        </Box>
      )
    },
    { field: 'budget', headerName: 'Budget ($)', width: 120, type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '0'
    },
    { field: 'progress', headerName: 'Progress', width: 120, type: 'number',
      renderCell: (params) => `${params.value || 0}%`
    },
    { field: 'startDate', headerName: 'Start Date', width: 120, type: 'date' },
    { field: 'endDate', headerName: 'End Date', width: 120, type: 'date' },
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
          Projects Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Add New Project
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={projects}
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

      {/* Add/Edit Project Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                label="Project Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Capacity (MW)"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Technology"
                value={formData.technology}
                onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                fullWidth
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="on-hold">On Hold</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Progress (%)"
                type="number"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                fullWidth
                margin="normal"
                inputProps={{ min: 0, max: 100 }}
              />
              <TextField
                label="Budget ($)"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              margin="normal"
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingProject ? 'Update' : 'Create'}
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

export default Projects;
