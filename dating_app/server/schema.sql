-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL,
    city VARCHAR(100) NOT NULL,
    location_lat DECIMAL,
    location_lng DECIMAL,
    gender VARCHAR(50),
    interested_in VARCHAR(50), -- Simple string for MVP, e.g., 'female', 'male', 'everyone'
    min_age_preference INTEGER,
    max_age_preference INTEGER,
    max_distance_km INTEGER,
    routine_tags TEXT[], -- Array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Presence Sessions Table (The 1-hour visibility window)
CREATE TABLE presence_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    activity_tag VARCHAR(50), -- 'Working', 'Cooking', etc.
    status_text VARCHAR(255),
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Active Windows Table (The 48-hour connection)
CREATE TABLE shared_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'closed'
    extended_from_window_id UUID REFERENCES shared_windows(id),
    user_a_reopt_in BOOLEAN, -- For the re-opt-in logic
    user_b_reopt_in BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    window_id UUID REFERENCES shared_windows(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) DEFAULT 'text',
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
