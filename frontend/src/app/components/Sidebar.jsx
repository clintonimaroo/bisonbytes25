import React, { useState } from 'react';
import '../styles/sidebar.scss';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Sidebar() {
    const [isMinimized, setIsMinimized] = useState(false);
    // Chat History (Mock data for now)
    const [chatHistory, setChatHistory] = useState([
        {
            title: "Generate a roadmap for HTML",
            date: "2023-10-01T12:00:00Z" // ISO format for easy parsing
        },
        {
            title: "Generate a roadmap for Python",
            date: "2023-10-02T14:30:00Z"
        },
        {
            title: "Generate a roadmap for CSS",
            date: "2023-10-03T09:15:00Z"
        }
    ]);

    const toggleSidebar = () => {
        setIsMinimized(!isMinimized);
    };

    return (
        <div className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
            <button className="minimize-button" onClick={toggleSidebar}>
                <i className={`fas ${isMinimized ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </button>
            {/* Add your sidebar content here */}
            <div className="sidebar-content">
                <div className="sidebar-content-item">
                  {/* Chat History Search */}
                    {/* <div className="chat-history-search">
                        <input type="text" placeholder="Search" />
                    </div> */}
                    {/** Chat History */}
                    <div className="chat-history">
                        {chatHistory.map((chat, index) => (
                            <div className="chat-history-item" key={index}>
                                <div className="chat-history-item-text">
                                    {chat.title}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
