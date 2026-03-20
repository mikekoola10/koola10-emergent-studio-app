import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Clock, TrendingUp } from 'lucide-react';

const EpisodeCard = ({ episode }) => {
  return (
    <Link to={`/episodes/${episode.id}`} data-testid="episode-card">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900" data-testid="episode-title">
              S{String(episode.season).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{episode.title}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center">
            <Film size={24} className="text-white" />
          </div>
        </div>

        {episode.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">{episode.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Script</span>
            <span className="font-semibold text-purple-600">{episode.script_completion_percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${episode.script_completion_percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Clips</span>
            <span className="font-semibold text-pink-600">{episode.clips_generated_percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-pink-600 h-1.5 rounded-full"
              style={{ width: `${episode.clips_generated_percent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>v{episode.version}</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp size={14} />
            <span>{new Date(episode.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EpisodeCard;
