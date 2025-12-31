
import React from 'react';
import { Topic } from '../types';

interface TopicCardProps {
  topic: Topic;
  onSelect: (topic: Topic) => void;
  isSelected?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onSelect, isSelected }) => {
  const difficultyColors = {
    Beginner: 'bg-green-100 text-green-700',
    Intermediate: 'bg-blue-100 text-blue-700',
    Advanced: 'bg-purple-100 text-purple-700'
  };

  return (
    <div 
      onClick={() => onSelect(topic)}
      className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
        isSelected 
        ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]' 
        : 'border-transparent bg-white hover:border-indigo-200 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-gray-900 text-lg">{topic.title}</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${difficultyColors[topic.difficulty]}`}>
          {topic.difficulty}
        </span>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{topic.description}</p>
    </div>
  );
};
