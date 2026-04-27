import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://koola10.fly.dev';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}

export interface ChatResponse {
  response: string;
  model?: string;
}

export interface Episode {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status?: string;
}

export interface CreateEpisodeRequest {
  title: string;
  description: string;
}

export interface LoreRequest {
  question: string;
}

export interface LoreResponse {
  answer: string;
}

export interface StyleRequest {
  scene: string;
}

export interface StyleResponse {
  styleRules: string;
  videoPrompt: string;
}

export interface VideoJobRequest {
  prompt: string;
}

export interface VideoJobResponse {
  jobId: string;
  status: string;
  createdAt: string;
}

export interface VideoJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  error?: string;
}

export interface VerticalStatus {
  vertical: string;
  agentCount: number;
  state: string;
}

export interface SwarmStatus {
  verticals: VerticalStatus[];
}

export interface VerticalRevenue {
  vertical: string;
  revenue: number;
}

export interface SwarmRevenue {
  revenues: VerticalRevenue[];
}

export interface SwarmReport {
  report: string;
}

// API Methods
export const apiClient = {
  // Studio Chat
  chat: async (messages: ChatMessage[], model?: string): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/ai/chat', {
      messages,
      model,
    });
    return response.data;
  },

  // Episodes
  getEpisodes: async (): Promise<Episode[]> => {
    const response = await api.get<Episode[]>('/studio/episodes');
    return response.data;
  },

  createEpisode: async (data: CreateEpisodeRequest): Promise<Episode> => {
    const response = await api.post<Episode>('/studio/episode', data);
    return response.data;
  },

  // Lore Console
  getLoreAnswer: async (question: string): Promise<LoreResponse> => {
    const response = await api.post<LoreResponse>('/studio/lore', {
      question,
    });
    return response.data;
  },

  // Style Engine
  getStyleRules: async (scene: string): Promise<StyleResponse> => {
    const response = await api.post<StyleResponse>('/studio/style', {
      scene,
    });
    return response.data;
  },

  // Video Orchestrator
  startVideoJob: async (prompt: string): Promise<VideoJobResponse> => {
    const response = await api.post<VideoJobResponse>('/studio/video-job', {
      prompt,
    });
    return response.data;
  },

  getVideoJobStatus: async (jobId: string): Promise<VideoJobStatus> => {
    const response = await api.get<VideoJobStatus>(`/studio/video-job/${jobId}`);
    return response.data;
  },

  // Swarm Ops
  getSwarmStatus: async (): Promise<VerticalStatus[]> => {
    const response = await api.get<VerticalStatus[]>('/swarm/status');
    return response.data;
  },

  getSwarmRevenue: async (): Promise<VerticalRevenue[]> => {
    const response = await api.get<VerticalRevenue[]>('/swarm/revenue');
    return response.data;
  },

  getSwarmReport: async (): Promise<SwarmReport> => {
    const response = await api.get<SwarmReport>('/swarm/report');
    return response.data;
  },

  deployVertical: async (vertical: string, count: number = 10): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/swarm/${vertical}/deploy`, { count });
    return response.data;
  },

  dispatchTask: async (vertical: string, task: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/swarm/${vertical}/dispatch`, { task });
    return response.data;
  },
};

export default api;
