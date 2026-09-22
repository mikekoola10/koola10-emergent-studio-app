import axios, { AxiosInstance } from 'axios';

function normalizeApiBaseUrl(raw: string): string {
  let url = (raw || '').trim();
  // Repair a common typo: "https:/host" (single slash) -> "https://host"
  url = url.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/(?!\/)/, '$1://');
  // Strip trailing slashes so path joins stay clean
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL =
  normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '') || 'https://koola10.fly.dev';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Turn a request failure into something a person can read.
// Network-level failures (offline, DNS, bad URL, timeout) become a plain
// "Network error" message; meaningful server replies keep their own message.
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Network error. Please try again.';
    }
    const data = err.response.data as { error?: string } | undefined;
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  }
  return fallback;
}

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
  // Beat Lab — mixing & mastering coach
  beatlab: async (messages: ChatMessage[]): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/ai/beatlab', {
      messages,
    });
    return response.data;
  },
  // Beat Lab — Nova listens to an uploaded bounce (uses fetch so the browser
  // sets the multipart boundary; axios's default JSON Content-Type would break it)
  beatlabListen: async (audio: File, question: string): Promise<ChatResponse> => {
    const form = new FormData();
    form.append('audio', audio);
    form.append('question', question);
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/ai/beatlab-listen`, {
        method: 'POST',
        body: form,
      });
    } catch {
      throw new Error('Network error. Please try again.');
    }
    if (!res.ok) {
      let msg = 'Nova could not hear that bounce. Please try again.';
      try {
        const data = (await res.json()) as { error?: string };
        if (data && typeof data.error === 'string' && data.error.trim()) msg = data.error;
      } catch {
        /* keep fallback */
      }
      throw new Error(msg);
    }
    return (await res.json()) as ChatResponse;
  },
};

export default api;
