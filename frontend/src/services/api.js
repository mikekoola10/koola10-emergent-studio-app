import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMe: () => api.get('/auth/me'),
};

export const episodesAPI = {
  create: (data) => api.post('/episodes', data),
  getAll: () => api.get('/episodes'),
  getOne: (id) => api.get(`/episodes/${id}`),
  update: (id, data) => api.put(`/episodes/${id}`, data),
  delete: (id) => api.delete(`/episodes/${id}`),
};

export const scenesAPI = {
  create: (data) => api.post('/scenes', data),
  getAll: (episodeId) => api.get('/scenes', { params: { episode_id: episodeId } }),
  getOne: (id) => api.get(`/scenes/${id}`),
  update: (id, data) => api.put(`/scenes/${id}`, data),
  delete: (id) => api.delete(`/scenes/${id}`),
};

export const chatAPI = {
  sendMessage: (data) => api.post('/chat', data),
  getHistory: (episodeId, limit = 100) => api.get('/chat', { params: { episode_id: episodeId, limit } }),
  generatePrompt: (script) => {
    const formData = new FormData();
    formData.append('script', script);
    return api.post('/chat/generate-prompt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  formatScript: (rawText) => {
    const formData = new FormData();
    formData.append('raw_text', rawText);
    return api.post('/chat/format-script', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  breakdownScenes: (script) => {
    const formData = new FormData();
    formData.append('script', script);
    return api.post('/chat/breakdown-scenes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const assetsAPI = {
  upload: (file, assetType, episodeId, sceneId, tags) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    if (episodeId) formData.append('episode_id', episodeId);
    if (sceneId) formData.append('scene_id', sceneId);
    if (tags) formData.append('tags', tags);
    return api.post('/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: (filters) => api.get('/assets', { params: filters }),
  delete: (id) => api.delete(`/assets/${id}`),
};

export const videoAPI = {
  generate: (data) => api.post('/video/generate', data),
  getJobs: (episodeId) => api.get('/video/jobs', { params: { episode_id: episodeId } }),
  getJob: (id) => api.get(`/video/jobs/${id}`),
};

export const productionAPI = {
  get: (episodeId) => api.get(`/production/${episodeId}`),
  update: (episodeId, data) => api.put(`/production/${episodeId}`, data),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
