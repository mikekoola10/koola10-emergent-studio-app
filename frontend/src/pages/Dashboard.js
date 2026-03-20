import React, { useState, useEffect } from 'react';
import { Film, Users, Palette } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { episodesAPI, productionAPI } from '../services/api';

const Dashboard = () => {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [productionTracking, setProductionTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultCharacters = [
    {
      character_name: 'KOOLA10',
      notes: 'Calm, sharp, unbothered, master roaster, owner of the diner',
      appearance_details: 'Confident demeanor, signature style',
      voice_notes: 'Smooth, controlled delivery',
    },
    {
      character_name: 'Spiral Jay',
      notes: 'Fast-talking, cocky, lightning-mouth roaster',
      appearance_details: 'Energetic, animated movements',
      voice_notes: 'Rapid-fire delivery',
    },
    {
      character_name: 'Luna Slice',
      notes: 'Soft-spoken, deadly, magical aura flickers like moonlight',
      appearance_details: 'Moonlit magical effects',
      voice_notes: 'Soft but impactful',
    },
    {
      character_name: 'Big Brick',
      notes: 'Loud, confident, fashion-roasting powerhouse',
      appearance_details: 'Bold fashion choices',
      voice_notes: 'Booming voice',
    },
  ];

  const defaultStyleRules = [
    { trigger: 'Punchline', style: 'boondocks', description: 'Switch to exaggerated Boondocks animation' },
    { trigger: 'Reaction', style: '4k', description: 'Switch to 4K cinematic realism' },
    { trigger: 'Bell rings', style: 'boondocks', description: 'Trigger style change with bell' },
    { trigger: 'Emotional beat', style: '4k', description: 'Use 4K for emotional moments' },
    { trigger: 'Magic pulse', style: '4k', description: '4K slow-motion for magic effects' },
  ];

  useEffect(() => {
    loadEpisodes();
  }, []);

  useEffect(() => {
    if (selectedEpisode) {
      loadProductionTracking();
    }
  }, [selectedEpisode]);

  const loadEpisodes = async () => {
    try {
      const response = await episodesAPI.getAll();
      setEpisodes(response.data);
      if (response.data.length > 0) {
        setSelectedEpisode(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductionTracking = async () => {
    try {
      const response = await productionAPI.get(selectedEpisode.id);
      setProductionTracking(response.data);
    } catch (error) {
      console.error('Failed to load production tracking:', error);
    }
  };

  const handleUpdateProgress = async (field, value) => {
    try {
      const update = { ...selectedEpisode, [field]: value };
      await episodesAPI.update(selectedEpisode.id, update);
      setSelectedEpisode(update);
      await loadEpisodes();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleUpdateTracking = async (updates) => {
    try {
      const updatedTracking = { ...productionTracking, ...updates };
      await productionAPI.update(selectedEpisode.id, updatedTracking);
      setProductionTracking(updatedTracking);
    } catch (error) {
      console.error('Failed to update tracking:', error);
    }
  };

  const getStyleColor = (style) => {
    return style === 'boondocks' ? 'bg-purple-100 text-purple-800' : 'bg-pink-100 text-pink-800';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Production Dashboard" subtitle="Track episode progress and maintain consistency" />

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
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    S{String(ep.season).padStart(2, '0')}E{String(ep.episode_number).padStart(2, '0')} - {ep.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedEpisode && (
              <>
                {/* Episode Progress */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <Film size={24} className="text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Episode Progress</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Script Completion</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={selectedEpisode.script_completion_percent}
                            onChange={(e) => handleUpdateProgress('script_completion_percent', parseFloat(e.target.value))}
                            data-testid="script-progress-input"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm font-semibold text-purple-600">%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-purple-600 h-3 rounded-full transition-all"
                          style={{ width: `${selectedEpisode.script_completion_percent}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Clips Generated</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={selectedEpisode.clips_generated_percent}
                            onChange={(e) => handleUpdateProgress('clips_generated_percent', parseFloat(e.target.value))}
                            data-testid="clips-progress-input"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm font-semibold text-pink-600">%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-pink-600 h-3 rounded-full transition-all"
                          style={{ width: `${selectedEpisode.clips_generated_percent}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Edits Assembled</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={selectedEpisode.edits_assembled_percent}
                            onChange={(e) => handleUpdateProgress('edits_assembled_percent', parseFloat(e.target.value))}
                            data-testid="edits-progress-input"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm font-semibold text-blue-600">%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{ width: `${selectedEpisode.edits_assembled_percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Character Consistency */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <Users size={24} className="text-pink-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Character Consistency</h3>
                  </div>

                  <div className="space-y-4">
                    {(productionTracking?.character_notes?.length > 0 ? productionTracking.character_notes : defaultCharacters).map((char, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg" data-testid="character-note">
                        <h4 className="font-semibold text-gray-900 mb-2">{char.character_name}</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Personality:</span> {char.notes}</p>
                          {char.appearance_details && (
                            <p><span className="font-medium">Appearance:</span> {char.appearance_details}</p>
                          )}
                          {char.voice_notes && (
                            <p><span className="font-medium">Voice:</span> {char.voice_notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style Rules */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <Palette size={24} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Style Switch Rules</h3>
                  </div>

                  <div className="space-y-3">
                    {(productionTracking?.style_rules?.length > 0 ? productionTracking.style_rules : defaultStyleRules).map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg" data-testid="style-rule">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold text-gray-900">{rule.trigger}</span>
                            <span className="text-gray-500">→</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStyleColor(rule.style)}`}>
                              {rule.style}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Production Notes */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Notes</h3>
                  <textarea
                    value={productionTracking?.notes || ''}
                    onChange={(e) => handleUpdateTracking({ notes: e.target.value })}
                    data-testid="production-notes-input"
                    placeholder="Add any production notes, reminders, or special instructions..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={6}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
