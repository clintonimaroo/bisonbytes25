import React, { useState } from 'react';
import '../styles/sidebar.scss';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Sidebar() {
    const [isMinimized, setIsMinimized] = useState(false);

    const toggleSidebar = () => {
        setIsMinimized(!isMinimized);
    };

    return (
        <div className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
            <button className="minimize-button" onClick={toggleSidebar}>
                <i className={`fas ${isMinimized ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </button>
            {/* Add your sidebar content here */}
        </div>
    );
}
