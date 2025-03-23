"use client";
import React from 'react';
import './StatusIndicator.css';

const StatusIndicator = ({ isWakeWordListening, isListening, isGenerating }) => {
  let statusText = '';
  let statusClass = '';
  
  if (isGenerating) {
    statusText = 'Generating roadmap...';
    statusClass = 'status-generating';
  } else if (isListening) {
    statusText = 'Listening...';
    statusClass = 'status-listening';
  } else if (isWakeWordListening) {
    statusText = 'Say "Hey Buddy" to start';
    statusClass = 'status-waiting';
  }
  
  // Don't show anything if no status is active
  if (!statusText) return null;
  
  return (
    <div className={`status-indicator ${statusClass}`}>
      <div className="status-dot"></div>
      <span className="status-text">{statusText}</span>
    </div>
  );
};

export default StatusIndicator; 