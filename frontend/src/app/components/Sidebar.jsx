import React, { useState } from 'react';
import { useEffect } from 'react';
import '../styles/sidebar.scss';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Sidebar() {
    const [isMinimized, setIsMinimized] = useState(false);
    // Chat History (Mock data for now)
    const [chatHistory, setChatHistory] = useState({});

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


    useEffect(() => {
        const fetchChatHistory = async () => {
            const response = await fetch('./chatHistory.json'); // Adjust the endpoint as needed
            const data = await response.json();

            // Sort the data by date before grouping
            const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            const groupedData = groupChatHistory(sortedData); // Group the fetched data
            setChatHistory(groupedData);
        };
    
        fetchChatHistory();
    }, []);

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
                                <h4>{group}</h4>
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
