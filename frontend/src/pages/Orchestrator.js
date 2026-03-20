import React, { useState, useEffect } from 'react';
import { Play, Loader, CheckCircle, XCircle, Clock } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { episodesAPI, scenesAPI, videoAPI } from '../services/api';

const Orchestrator = () => {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('full_episode'); // 'full_episode' or 'scene'

  useEffect(() => {
    loadEpisodes();
  }, []);

  useEffect(() => {
    if (selectedEpisode) {
      loadScenes();
      loadJobs();
    }
  }, [selectedEpisode]);

  const loadEpisodes = async () => {
    try {
      const response = await episodesAPI.getAll();
      setEpisodes(response.data);
    } catch (error) {
      console.error('Failed to load episodes:', error);
    }
  };

  const loadScenes = async () => {
    try {
      const response = await scenesAPI.getAll(selectedEpisode.id);
      setScenes(response.data);
    } catch (error) {
      console.error('Failed to load scenes:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await videoAPI.getJobs(selectedEpisode.id);
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const handleGenerateFullEpisode = async () => {
    if (!selectedEpisode.master_prompt) {
      alert('This episode does not have a master prompt');
      return;
    }

    setLoading(true);
    try {
      await videoAPI.generate({
        episode_id: selectedEpisode.id,
        prompt: selectedEpisode.master_prompt,
        mode: 'full_episode',
      });
      await loadJobs();
      alert('Video generation job submitted!');
    } catch (error) {
      console.error('Failed to generate video:', error);
      alert('Failed to submit job. Check if Emergent API is configured.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScene = async (scene) => {
    if (!scene.prompt) {
      alert('This scene does not have a prompt');
      return;
    }

    setLoading(true);
    try {
      await videoAPI.generate({
        episode_id: selectedEpisode.id,
        scene_id: scene.id,
        prompt: scene.prompt,
        mode: 'scene',
      });
      await loadJobs();
      alert('Scene generation job submitted!');
    } catch (error) {
      console.error('Failed to generate scene:', error);
      alert('Failed to submit job. Check if Emergent API is configured.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'queued':
        return <Clock size={16} className="text-yellow-500" />;
      case 'generating':
        return <Loader size={16} className="text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Video Orchestrator" subtitle="Generate videos using Emergent API" />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Episode Selection */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Episode</h3>
              <select
                value={selectedEpisode?.id || ''}
                onChange={(e) => {
                  const ep = episodes.find((ep) => ep.id === e.target.value);
                  setSelectedEpisode(ep);
                }}
                data-testid="episode-select"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose an episode...</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    S{String(ep.season).padStart(2, '0')}E{String(ep.episode_number).padStart(2, '0')} - {ep.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedEpisode && (
              <>
                {/* Generation Mode */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Mode</h3>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setMode('full_episode')}
                      data-testid="mode-full-episode"
                      className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all ${
                        mode === 'full_episode'
                          ? 'border-purple-600 bg-purple-50 text-purple-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold mb-1">Full Episode Mode</div>
                      <div className="text-sm text-gray-600">Generate entire episode from master prompt</div>
                    </button>
                    <button
                      onClick={() => setMode('scene')}
                      data-testid="mode-scene"
                      className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all ${
                        mode === 'scene'
                          ? 'border-purple-600 bg-purple-50 text-purple-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold mb-1">Scene Mode</div>
                      <div className="text-sm text-gray-600">Generate individual scenes</div>
                    </button>
                  </div>
                </div>

                {/* Full Episode Mode */}
                {mode === 'full_episode' && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Full Episode Generation</h3>
                    <p className="text-gray-600 mb-4">
                      This will use the master prompt to generate the entire episode as one continuous video.
                    </p>
                    {selectedEpisode.master_prompt ? (
                      <button
                        onClick={handleGenerateFullEpisode}
                        data-testid="generate-full-episode-btn"
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center space-x-2 font-semibold"
                      >
                        <Play size={20} />
                        <span>{loading ? 'Submitting...' : 'Generate Full Episode'}</span>
                      </button>
                    ) : (
                      <div className="text-red-600">No master prompt available for this episode</div>
                    )}
                  </div>
                )}

                {/* Scene Mode */}
                {mode === 'scene' && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Scene Generation</h3>
                    {scenes.length === 0 ? (
                      <p className="text-gray-600">No scenes found for this episode</p>
                    ) : (
                      <div className="space-y-3">
                        {scenes.map((scene) => (
                          <div
                            key={scene.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                Scene {scene.scene_number}: {scene.title}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {scene.location} - {scene.time} - {scene.style}
                              </div>
                            </div>
                            <button
                              onClick={() => handleGenerateScene(scene)}
                              data-testid={`generate-scene-${scene.scene_number}-btn`}
                              disabled={loading || !scene.prompt}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                            >
                              <Play size={16} />
                              <span>Generate</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Generation Jobs */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Jobs</h3>
                  {jobs.length === 0 ? (
                    <p className="text-gray-600">No generation jobs yet</p>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          data-testid="video-job-card"
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(job.status)}
                              <span className="font-semibold text-gray-900">{job.mode === 'full_episode' ? 'Full Episode' : 'Scene'}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {new Date(job.created_at).toLocaleString()}
                            </div>
                            {job.error_message && (
                              <div className="text-sm text-red-600 mt-1">{job.error_message}</div>
                            )}
                          </div>
                          {job.result_url && (
                            <a
                              href={job.result_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                            >
                              View Result
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orchestrator;
