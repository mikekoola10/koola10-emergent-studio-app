import React, { useState, useEffect } from 'react';
import { Upload, Search, Filter, Video, Music, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { assetsAPI, episodesAPI } from '../services/api';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    episode_id: '',
    asset_type: '',
    search: '',
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    asset_type: 'video',
    episode_id: '',
    scene_id: '',
    tags: '',
  });

  useEffect(() => {
    loadEpisodes();
    loadAssets();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [filters]);

  const loadEpisodes = async () => {
    try {
      const response = await episodesAPI.getAll();
      setEpisodes(response.data);
    } catch (error) {
      console.error('Failed to load episodes:', error);
    }
  };

  const loadAssets = async () => {
    try {
      const filterParams = {};
      if (filters.episode_id) filterParams.episode_id = filters.episode_id;
      if (filters.asset_type) filterParams.asset_type = filters.asset_type;

      const response = await assetsAPI.getAll(filterParams);
      let filteredAssets = response.data;

      if (filters.search) {
        filteredAssets = filteredAssets.filter((asset) =>
          asset.filename.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setAssets(filteredAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) return;

    try {
      await assetsAPI.upload(
        uploadData.file,
        uploadData.asset_type,
        uploadData.episode_id || null,
        uploadData.scene_id || null,
        uploadData.tags
      );
      setShowUploadModal(false);
      setUploadData({ file: null, asset_type: 'video', episode_id: '', scene_id: '', tags: '' });
      await loadAssets();
      alert('Asset uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload asset:', error);
      alert('Failed to upload asset. Make sure S3 is configured.');
    }
  };

  const handleDelete = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await assetsAPI.delete(assetId);
      await loadAssets();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('Failed to delete asset');
    }
  };

  const getAssetIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video size={24} className="text-purple-600" />;
      case 'audio':
        return <Music size={24} className="text-pink-600" />;
      case 'prompt':
        return <FileText size={24} className="text-blue-600" />;
      case 'image':
        return <ImageIcon size={24} className="text-green-600" />;
      default:
        return <FileText size={24} className="text-gray-600" />;
    }
  };

  const getAssetTypeColor = (type) => {
    switch (type) {
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'audio':
        return 'bg-pink-100 text-pink-800';
      case 'prompt':
        return 'bg-blue-100 text-blue-800';
      case 'image':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Asset Library" subtitle="Manage your video clips, audio, and prompts" />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    data-testid="search-input"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={filters.episode_id}
                  onChange={(e) => setFilters({ ...filters, episode_id: e.target.value })}
                  data-testid="episode-filter"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Episodes</option>
                  {episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.title}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.asset_type}
                  onChange={(e) => setFilters({ ...filters, asset_type: e.target.value })}
                  data-testid="type-filter"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="prompt">Prompt</option>
                  <option value="image">Image</option>
                </select>

                <button
                  onClick={() => setShowUploadModal(true)}
                  data-testid="upload-btn"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center space-x-2 font-semibold"
                >
                  <Upload size={20} />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            {/* Assets Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading assets...</div>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-2">No assets found</p>
                  <p className="text-sm">Upload your first asset to get started</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    data-testid="asset-card"
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getAssetIcon(asset.asset_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{asset.filename}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getAssetTypeColor(asset.asset_type)}`}>
                            {asset.asset_type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        data-testid="delete-asset-btn"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div>Size: {formatFileSize(asset.file_size)}</div>
                      <div>Created: {new Date(asset.created_at).toLocaleDateString()}</div>
                      {Object.keys(asset.tags || {}).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(asset.tags).map(([key, value]) => (
                            <span key={key} className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {asset.url && (
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block text-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                      >
                        View Asset
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full" data-testid="upload-modal">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Asset</h2>

            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                <input
                  type="file"
                  data-testid="file-input"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
                <select
                  value={uploadData.asset_type}
                  onChange={(e) => setUploadData({ ...uploadData, asset_type: e.target.value })}
                  data-testid="asset-type-input"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="prompt">Prompt</option>
                  <option value="image">Image</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Episode (Optional)</label>
                <select
                  value={uploadData.episode_id}
                  onChange={(e) => setUploadData({ ...uploadData, episode_id: e.target.value })}
                  data-testid="episode-input"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (Optional)</label>
                <input
                  type="text"
                  data-testid="tags-input"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="character:KOOLA10, style:boondocks"
                />
                <p className="text-xs text-gray-500 mt-1">Format: key:value, key:value</p>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadData({ file: null, asset_type: 'video', episode_id: '', scene_id: '', tags: '' });
                  }}
                  data-testid="cancel-upload-btn"
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-upload-btn"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                >
                  Upload Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
