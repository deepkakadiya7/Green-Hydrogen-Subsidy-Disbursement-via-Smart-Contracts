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
  Chip,
  LinearProgress
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useProject } from '../../context/ProjectContext';

const Milestones = () => {
  const { milestones, projects, loading } = useProject();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    dueDate: '',
    status: 'pending',
    progress: 0,
    priority: 'medium',
    type: 'development'
  });

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        projectId: milestone.projectId || '',
        title: milestone.title || '',
        description: milestone.description || '',
        dueDate: milestone.dueDate || '',
        status: milestone.status || 'pending',
        progress: milestone.progress || 0,
        priority: milestone.priority || 'medium',
        type: milestone.type || 'development'
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        projectId: '',
        title: '',
        description: '',
        dueDate: '',
        status: 'pending',
        progress: 0,
        priority: 'medium',
        type: 'development'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMilestone(null);
    setFormData({
      projectId: '',
      title: '',
      description: '',
      dueDate: '',
      status: 'pending',
      progress: 0,
      priority: 'medium',
      type: 'development'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Here you would call the API to create/update milestone
      setSnackbar({ open: true, message: 'Milestone saved successfully!', severity: 'success' });
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ open: true, message: 'Operation failed!', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this milestone?')) {
      try {
        // Here you would call the API to delete milestone
        setSnackbar({ open: true, message: 'Milestone deleted successfully!', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: 'Delete failed!', severity: 'error' });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'development': return 'primary';
      case 'regulatory': return 'secondary';
      case 'financial': return 'info';
      case 'technical': return 'warning';
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
    { field: 'title', headerName: 'Milestone Title', width: 250 },
    { field: 'type', headerName: 'Type', width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getTypeColor(params.value)}
          size="small"
        />
      )
    },
    { field: 'priority', headerName: 'Priority', width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getPriorityColor(params.value)}
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
    { field: 'progress', headerName: 'Progress', width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress
              variant="determinate"
              value={params.value || 0}
              sx={{ height: 8, borderRadius: 5 }}
            />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">
              {params.value || 0}%
            </Typography>
          </Box>
        </Box>
      )
    },
    { field: 'dueDate', headerName: 'Due Date', width: 120, type: 'date' },
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
          Milestones Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Add New Milestone
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={milestones}
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

      {/* Add/Edit Milestone Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}
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
                label="Milestone Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  <MenuItem value="development">Development</MenuItem>
                  <MenuItem value="regulatory">Regulatory</MenuItem>
                  <MenuItem value="financial">Financial</MenuItem>
                  <MenuItem value="technical">Technical</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
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
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
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
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
              {editingMilestone ? 'Update' : 'Create'}
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

export default Milestones;
