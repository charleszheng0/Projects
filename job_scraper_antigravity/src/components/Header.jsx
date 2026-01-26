import { useState } from 'react'

/**
 * Header component with logo, search status, and user profile
 */
function Header({ searchStatus = 'inactive', userName = '', onToggleSidebar, onOpenSettings }) {
    const getStatusText = () => {
        switch (searchStatus) {
            case 'searching':
                return 'Searching...';
            case 'active':
                return 'Ready';
            default:
                return 'Inactive';
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <header className="header">
            <div className="header-logo">
                <button
                    className="btn btn-icon btn-ghost"
                    onClick={onToggleSidebar}
                    aria-label="Toggle sidebar"
                    style={{ marginRight: '8px', color: 'white' }}
                >
                    ☰
                </button>
                <div className="header-logo-icon">🚀</div>
                <div>
                    <div className="header-title">Autonomous Job Hunter</div>
                    <div className="header-subtitle">AI-Powered Career Platform</div>
                </div>
            </div>

            <div className="header-center">
                <div className="search-status">
                    <div className={`search-status-dot ${searchStatus}`}></div>
                    <span className="search-status-text">{getStatusText()}</span>
                </div>
            </div>

            <div className="header-right">
                <button
                    className="btn btn-icon btn-ghost"
                    onClick={onOpenSettings}
                    aria-label="Settings"
                    style={{ color: 'white', fontSize: '1.25rem' }}
                >
                    ⚙️
                </button>
                {userName && (
                    <div className="header-profile">
                        <div className="profile-avatar">{getInitials(userName)}</div>
                        <span className="profile-name">{userName}</span>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header
