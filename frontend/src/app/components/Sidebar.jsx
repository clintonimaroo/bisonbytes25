import React, { useState } from 'react';
import '../styles/sidebar.scss';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Sidebar() {
    const [isMinimized, setIsMinimized] = useState(false);
    // Chat History (Mock data for now)
    const [chatHistory, setChatHistory] = useState({
        "Today": [
            {
                title: "Generate a roadmap for HTML",
                date: "2023-10-01T12:00:00Z"
            }
        ],
        "Yesterday": [
            {
                title: "Generate a roadmap for Python",
                date: "2023-10-02T14:30:00Z"
            }
        ],
        "Last 7 Days": [
            {
                title: "Generate a roadmap for CSS",
                date: "2023-10-03T09:15:00Z"
            }
        ]
    });

    const toggleSidebar = () => {
        setIsMinimized(!isMinimized);
    };

    const getDateGroup = (date) => {
        const now = new Date();
        const chatDate = new Date(date);
        
        const diffTime = now - chatDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays <= 7) return "Last 7 Days";
        if (diffDays <= 30) return "Last 30 Days";
    
        const year = chatDate.getFullYear();
        const currentYear = now.getFullYear();
    
        if (year === currentYear) {
            return chatDate.toLocaleString('default', { month: 'long' });
        } else {
            return year.toString();
        }
    };

    const groupChatHistory = (chatHistory) => {
        const groupedChats = {};
    
        chatHistory.forEach(chat => {
            const group = getDateGroup(chat.date);
            if (!groupedChats[group]) {
                groupedChats[group] = [];
            }
            groupedChats[group].push(chat);
        });
    
        return groupedChats;
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
                        {Object.keys(chatHistory).map((group, index) => (
                            <div className="chat-history-group" key={index}>
                                <h3>{group}</h3>
                                {chatHistory[group].map((chat, index) => (
                                    <div className="chat-history-item" key={index}>
                                        <div className="chat-history-item-text">
                                            {chat.title}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
