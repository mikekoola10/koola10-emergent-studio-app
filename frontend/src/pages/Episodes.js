import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import EpisodeCard from '../components/EpisodeCard';
import { episodesAPI } from '../services/api';

const Episodes = () => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    season: 1,
    episode_number: 1,
    description: '',
    master_prompt: '',
  });

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    try {
      const response = await episodesAPI.getAll();
      setEpisodes(response.data);
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await episodesAPI.create(formData);
      setShowCreateModal(false);
      setFormData({ title: '', season: 1, episode_number: 1, description: '', master_prompt: '' });
      await loadEpisodes();
    } catch (error) {
      console.error('Failed to create episode:', error);
      alert('Failed to create episode');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Episodes" subtitle="Manage your video episodes and seasons" />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">All Episodes</h3>
                <p className="text-sm text-gray-600 mt-1">{episodes.length} episodes total</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                data-testid="create-episode-btn"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-2 font-semibold"
              >
                <Plus size={20} />
                <span>New Episode</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading episodes...</div>
              </div>
            ) : episodes.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-2">No episodes yet</p>
                  <p className="text-sm">Create your first episode to get started</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {episodes.map((episode) => (
                  <EpisodeCard key={episode.id} episode={episode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Episode Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" data-testid="create-episode-modal">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Episode</h2>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
                  <input
                    type="number"
                    data-testid="season-input"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Episode Number</label>
                  <input
                    type="number"
                    data-testid="episode-number-input"
                    value={formData.episode_number}
                    onChange={(e) => setFormData({ ...formData, episode_number: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  data-testid="title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="First Time on the Grill"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  data-testid="description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the episode..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Master Prompt (Optional)</label>
                <textarea
                  data-testid="master-prompt-input"
                  value={formData.master_prompt}
                  onChange={(e) => setFormData({ ...formData, master_prompt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={6}
                  placeholder="Paste your Emergent master prompt here..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ title: '', season: 1, episode_number: 1, description: '', master_prompt: '' });
                  }}
                  data-testid="cancel-btn"
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-episode-btn"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                >
                  Create Episode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Episodes;
