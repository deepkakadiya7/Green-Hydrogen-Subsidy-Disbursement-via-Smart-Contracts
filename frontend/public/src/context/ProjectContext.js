import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [subsidies, setSubsidies] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new project
  const createProject = async (projectData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/projects', projectData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProjects(prev => [...prev, response.data]);
      setError(null);
      return { success: true, project: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create project';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Update project
  const updateProject = async (projectId, updateData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/projects/${projectId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId ? response.data : project
        )
      );
      setError(null);
      return { success: true, project: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update project';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Delete project
  const deleteProject = async (projectId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProjects(prev => prev.filter(project => project.id !== projectId));
      setError(null);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete project';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Fetch subsidies
  const fetchSubsidies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/subsidies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubsidies(response.data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch subsidies');
      console.error('Error fetching subsidies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch milestones
  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/milestones', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMilestones(response.data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch milestones');
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get project statistics
  const getProjectStats = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalSubsidies = subsidies.reduce((sum, s) => sum + s.amount, 0);
    const pendingSubsidies = subsidies.filter(s => s.status === 'pending').length;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalSubsidies,
      pendingSubsidies
    };
  };

  useEffect(() => {
    // Fetch initial data when context is mounted
    fetchProjects();
    fetchSubsidies();
    fetchMilestones();
  }, []);

  const value = {
    projects,
    subsidies,
    milestones,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    fetchSubsidies,
    fetchMilestones,
    getProjectStats
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
