import { useState } from 'react'

/**
 * Settings Modal - Application configuration options
 */
function SettingsModal({ settings, onSave, onClose }) {
    const [formData, setFormData] = useState({
        autoApply: settings.autoApply || false,
        autoApplyThreshold: settings.autoApplyThreshold || 80,
        searchFrequency: settings.searchFrequency || 'moderate',
        maxApplicationsPerDay: settings.maxApplicationsPerDay || 30,
        requireReview: settings.requireReview !== false,
        notificationsEnabled: settings.notificationsEnabled !== false
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">⚙️ Settings</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Automation Settings */}
                    <div className="settings-group">
                        <h4 className="settings-group-title">🤖 Automation</h4>

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <h4>Auto-Apply</h4>
                                <p>Automatically apply to high-scoring opportunities</p>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={formData.autoApply}
                                    onChange={(e) => handleChange('autoApply', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {formData.autoApply && (
                            <div className="settings-option">
                                <div className="settings-option-info">
                                    <h4>Auto-Apply Threshold</h4>
                                    <p>Minimum match score to auto-apply ({formData.autoApplyThreshold}%)</p>
                                </div>
                                <input
                                    type="range"
                                    min="50"
                                    max="95"
                                    step="5"
                                    value={formData.autoApplyThreshold}
                                    onChange={(e) => handleChange('autoApplyThreshold', parseInt(e.target.value))}
                                    style={{ width: '120px' }}
                                />
                            </div>
                        )}

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <h4>Require Review</h4>
                                <p>Review applications before sending (recommended)</p>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={formData.requireReview}
                                    onChange={(e) => handleChange('requireReview', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Search Settings */}
                    <div className="settings-group">
                        <h4 className="settings-group-title">🔍 Search</h4>

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <h4>Search Frequency</h4>
                                <p>How often to search for new opportunities</p>
                            </div>
                            <select
                                className="form-select"
                                value={formData.searchFrequency}
                                onChange={(e) => handleChange('searchFrequency', e.target.value)}
                                style={{ width: 'auto' }}
                            >
                                <option value="aggressive">Every hour</option>
                                <option value="moderate">Every 4 hours</option>
                                <option value="conservative">Twice daily</option>
                            </select>
                        </div>

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <h4>Max Applications Per Day</h4>
                                <p>Daily limit to prevent over-application</p>
                            </div>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.maxApplicationsPerDay}
                                onChange={(e) => handleChange('maxApplicationsPerDay', parseInt(e.target.value) || 30)}
                                min="1"
                                max="100"
                                style={{ width: '80px', textAlign: 'center' }}
                            />
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="settings-group">
                        <h4 className="settings-group-title">🔔 Notifications</h4>

                        <div className="settings-option">
                            <div className="settings-option-info">
                                <h4>Enable Notifications</h4>
                                <p>Get alerts for high-priority opportunities</p>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={formData.notificationsEnabled}
                                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Rate Limiting Info */}
                    <div style={{
                        padding: '1rem',
                        background: 'var(--warning-50)',
                        borderRadius: 'var(--radius-lg)',
                        borderLeft: '3px solid var(--warning)',
                        marginTop: '1rem'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚠️</span> Rate Limiting Active
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            To protect your reputation, applications are limited to {formData.maxApplicationsPerDay} per day with a minimum 1-minute interval between applications.
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal
