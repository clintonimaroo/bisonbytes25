import React from 'react';
import './StatusIndicator.css';

const StatusIndicator = ({ isWakeWordListening, isListening, isGenerating }) => {
    let status = 'idle';
    let statusText = 'Ready';

    if (isWakeWordListening) {
        status = 'wake-word-listening';
        statusText = 'Listening for "Hey Buddy"';
    }

    if (isListening) {
        status = 'listening';
        statusText = 'Listening...';
    }

    if (isGenerating) {
        status = 'generating';
        statusText = 'Generating roadmap...';
    }

    return (
        <div className={`status-indicator ${status}`}>
            <div className="status-dot" />
            <span className="status-text">{statusText}</span>
        </div>
    );
};

export default StatusIndicator; 