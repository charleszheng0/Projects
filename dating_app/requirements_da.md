ANTIGRAVITY PROMPT: Revolutionary Dating App with Ghosting Scores, Blind Matching & Radical Transparency
OBJECTIVE
Create a fully functional web-based dating app with three revolutionary core features:

Public Ghosting/Accountability Scores - Reputation system that holds users accountable
Photos After Personality - Blind matching where you connect based on personality before seeing photos
Radical Transparency Profiles - Honest, unfiltered profiles with video verification and required vulnerability


CORE APP ARCHITECTURE
Main Views/Pages:
1. Onboarding Flow - Profile creation with video verification
2. Discovery Feed - Personality-first matching (no photos initially)
3. Chat Interface - Messaging with photo reveal mechanics
4. Profile View - Full transparency profiles with accountability scores
5. My Matches - Active conversations and connection status
6. My Profile - Edit your own profile and view your reputation
7. Settings - Preferences and account management

FEATURE 1: PUBLIC GHOSTING SCORES & ACCOUNTABILITY SYSTEM
User Reputation Schema
javascriptconst userReputation = {
  userId: "user_123",
  
  // Main Reputation Scores (0-100)
  ghostingScore: 85, // Higher = more reliable communicator
  authenticityScore: 92, // How accurate their profile is according to dates
  responseScore: 78, // How consistently they respond to messages
  
  // Detailed Metrics
  metrics: {
    conversationsStarted: 45,
    conversationsCompleted: 38, // Ended properly with closure
    conversationsGhosted: 7, // Disappeared without explanation
    avgResponseTime: "4 hours",
    messagesReceived: 523,
    messagesRepliedTo: 445,
    datesScheduled: 12,
    datesAttended: 11,
    datesNoShow: 1
  },
  
  // Badges (earned through good behavior)
  badges: [
    {
      name: "Respectful Communicator",
      icon: "💬",
      description: "Always provides closure when ending conversations",
      earnedDate: "2025-01-15"
    },
    {
      name: "Reliable Dater",
      icon: "⭐",
      description: "Shows up to scheduled dates 95%+ of the time",
      earnedDate: "2025-01-20"
    },
    {
      name: "Authentic Profile",
      icon: "✓",
      description: "Profile accuracy verified by 10+ dates",
      earnedDate: "2025-01-10"
    }
  ],
  
  // Recent Feedback (anonymized)
  recentFeedback: [
    {
      type: "positive",
      category: "communication",
      comment: "Very respectful and clear about intentions",
      date: "2025-01-26"
    },
    {
      type: "neutral",
      category: "ghosting",
      comment: "Ended conversation politely",
      date: "2025-01-24"
    }
  ],
  
  // Warnings (visible to potential matches)
  warnings: [],
  
  lastUpdated: "2025-01-27T10:30:00Z"
};
Accountability Tracking System
Implement conversation state tracking:
javascriptconst conversationStates = {
  ACTIVE: "active", // Ongoing conversation
  FADING: "fading", // One person hasn't responded in 48+ hours
  ENDED_PROPERLY: "ended_properly", // Both parties acknowledged ending
  GHOSTED: "ghosted", // One person disappeared without explanation
  MUTUAL_UNMATCH: "mutual_unmatch" // Both agreed to end
};

async function trackConversationStatus(conversationId, userId) {
  const conversation = await getConversation(conversationId);
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const hoursSinceLastMessage = (Date.now() - new Date(lastMessage.timestamp)) / (1000 * 60 * 60);
  
  // Detect potential ghosting
  if (hoursSinceLastMessage > 72 && lastMessage.senderId !== userId) {
    // Other person hasn't responded in 3 days
    await notifyUserOfPotentialGhosting(userId, conversationId);
  }
  
  // Update conversation state
  if (hoursSinceLastMessage > 168) { // 7 days
    await markAsGhosted(conversationId, lastMessage.senderId);
  }
}

async function markAsGhosted(conversationId, ghosterUserId) {
  const conversation = await getConversation(conversationId);
  const ghostedUserId = conversation.participants.find(id => id !== ghosterUserId);
  
  // Update ghoster's score
  await updateUserReputation(ghosterUserId, {
    conversationsGhosted: +1,
    ghostingScore: -5 // Penalty
  });
  
  // Allow ghosted user to provide feedback
  await sendFeedbackRequest(ghostedUserId, {
    conversationId,
    ghosterUserId,
    type: 'ghosting_incident'
  });
}
Conversation Ending System
Implement explicit conversation closing:
javascriptfunction ConversationEndingModal({ conversationId, otherUserId, onClose }) {
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const endingReasons = [
    "Not feeling a connection",
    "Found someone else",
    "Different life goals",
    "Communication style mismatch",
    "Distance/logistics",
    "Just not the right fit",
    "Other"
  ];
  
  async function handleEndConversation() {
    // Send closure message to other person
    await sendSystemMessage(conversationId, {
      type: 'conversation_ended',
      endedBy: currentUserId,
      reason: reason,
      message: `${currentUser.name} has decided to end this conversation. Reason: ${reason}`
    });
    
    // Update both users' reputation positively for proper closure
    await updateUserReputation(currentUserId, {
      conversationsCompleted: +1,
      ghostingScore: +2 // Reward for good behavior
    });
    
    // Prompt other user to rate accuracy of profile
    await requestProfileAccuracyRating(otherUserId, currentUserId);
    
    // Mark conversation as properly ended
    await updateConversation(conversationId, {
      status: 'ended_properly',
      endedBy: currentUserId,
      endedAt: new Date().toISOString(),
      endReason: reason
    });
    
    onClose();
  }
  
  return (
    <div className="modal">
      <h2>End Conversation Respectfully</h2>
      <p>We encourage honest closure. Select a reason:</p>
      
      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {endingReasons.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      
      <textarea
        placeholder="Optional: Add a kind message (will be sent to them)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={200}
      />
      
      <div className="info-box">
        ✨ Ending conversations properly improves your Ghosting Score
      </div>
      
      <button onClick={handleEndConversation} disabled={!reason}>
        Send Closure & End Conversation
      </button>
      <button onClick={onClose} className="secondary">Cancel</button>
    </div>
  );
}
Post-Date Rating System
After confirmed dates, collect accuracy ratings:
javascriptfunction PostDateRatingModal({ dateId, otherUserId, onSubmit }) {
  const [accuracyRatings, setAccuracyRatings] = useState({
    photoAccuracy: 5, // 1-10 scale
    personalityMatch: 5,
    honestyLevel: 5,
    conversationQuality: 5
  });
  
  const [experienceType, setExperienceType] = useState(''); // positive/neutral/negative
  const [feedback, setFeedback] = useState('');
  
  async function handleSubmitRating() {
    // Update other user's authenticity score
    const avgAccuracy = Object.values(accuracyRatings).reduce((a, b) => a + b) / Object.keys(accuracyRatings).length;
    
    await updateUserReputation(otherUserId, {
      authenticityScore: calculateNewAuthenticityScore(otherUserId, avgAccuracy),
      datesCompleted: +1
    });
    
    // Store anonymized feedback
    await storeFeedback({
      aboutUserId: otherUserId,
      fromUserId: currentUserId, // Stored but not shown
      dateId,
      ratings: accuracyRatings,
      experienceType,
      feedback: feedback,
      timestamp: new Date().toISOString()
    });
    
    // If photos were highly inaccurate, flag profile
    if (accuracyRatings.photoAccuracy < 4) {
      await flagProfileForReview(otherUserId, 'photo_accuracy');
    }
    
    onSubmit();
  }
  
  return (
    <div className="modal">
      <h2>How was your date?</h2>
      <p>Your honest feedback helps maintain profile authenticity</p>
      
      <div className="rating-section">
        <label>Did their photos accurately represent how they look?</label>
        <input
          type="range"
          min="1"
          max="10"
          value={accuracyRatings.photoAccuracy}
          onChange={(e) => setAccuracyRatings({
            ...accuracyRatings,
            photoAccuracy: parseInt(e.target.value)
          })}
        />
        <span>{accuracyRatings.photoAccuracy}/10</span>
      </div>
      
      <div className="rating-section">
        <label>Did their personality match their profile?</label>
        <input
          type="range"
          min="1"
          max="10"
          value={accuracyRatings.personalityMatch}
          onChange={(e) => setAccuracyRatings({
            ...accuracyRatings,
            personalityMatch: parseInt(e.target.value)
          })}
        />
        <span>{accuracyRatings.personalityMatch}/10</span>
      </div>
      
      <div className="rating-section">
        <label>How honest/authentic did they seem?</label>
        <input
          type="range"
          min="1"
          max="10"
          value={accuracyRatings.honestyLevel}
          onChange={(e) => setAccuracyRatings({
            ...accuracyRatings,
            honestyLevel: parseInt(e.target.value)
          })}
        />
        <span>{accuracyRatings.honestyLevel}/10</span>
      </div>
      
      <div className="experience-buttons">
        <button onClick={() => setExperienceType('positive')}>😊 Positive</button>
        <button onClick={() => setExperienceType('neutral')}>😐 Neutral</button>
        <button onClick={() => setExperienceType('negative')}>😞 Negative</button>
      </div>
      
      <textarea
        placeholder="Optional: Anonymous feedback (they won't know it's from you)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={300}
      />
      
      <button onClick={handleSubmitRating}>Submit Rating</button>
    </div>
  );
}
Reputation Display Component
Show reputation prominently on profiles:
javascriptfunction ReputationDisplay({ userId }) {
  const [reputation, setReputation] = useState(null);
  
  useEffect(() => {
    loadReputation();
  }, [userId]);
  
  async function loadReputation() {
    const rep = await window.storage.get(`reputation_${userId}`);
    setReputation(JSON.parse(rep.value));
  }
  
  function getScoreColor(score) {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 75) return '#3b82f6'; // Blue
    if (score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }
  
  function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  }
  
  if (!reputation) return <div>Loading reputation...</div>;
  
  return (
    <div className="reputation-card">
      <h3>Accountability Scores</h3>
      
      {/* Ghosting Score */}
      <div className="score-item">
        <div className="score-header">
          <span className="score-label">💬 Communication</span>
          <span className="score-value" style={{ color: getScoreColor(reputation.ghostingScore) }}>
            {reputation.ghostingScore}/100
          </span>
        </div>
        <div className="score-bar">
          <div 
            className="score-fill"
            style={{ 
              width: `${reputation.ghostingScore}%`,
              backgroundColor: getScoreColor(reputation.ghostingScore)
            }}
          />
        </div>
        <span className="score-description">{getScoreLabel(reputation.ghostingScore)} communicator</span>
      </div>
      
      {/* Authenticity Score */}
      <div className="score-item">
        <div className="score-header">
          <span className="score-label">✓ Authenticity</span>
          <span className="score-value" style={{ color: getScoreColor(reputation.authenticityScore) }}>
            {reputation.authenticityScore}/100
          </span>
        </div>
        <div className="score-bar">
          <div 
            className="score-fill"
            style={{ 
              width: `${reputation.authenticityScore}%`,
              backgroundColor: getScoreColor(reputation.authenticityScore)
            }}
          />
        </div>
        <span className="score-description">Profile accuracy verified by dates</span>
      </div>
      
      {/* Response Score */}
      <div className="score-item">
        <div className="score-header">
          <span className="score-label">⚡ Responsiveness</span>
          <span className="score-value" style={{ color: getScoreColor(reputation.responseScore) }}>
            {reputation.responseScore}/100
          </span>
        </div>
        <div className="score-bar">
          <div 
            className="score-fill"
            style={{ 
              width: `${reputation.responseScore}%`,
              backgroundColor: getScoreColor(reputation.responseScore)
            }}
          />
        </div>
        <span className="score-description">Avg response time: {reputation.metrics.avgResponseTime}</span>
      </div>
      
      {/* Badges */}
      {reputation.badges.length > 0 && (
        <div className="badges-section">
          <h4>Earned Badges</h4>
          <div className="badges-grid">
            {reputation.badges.map(badge => (
              <div key={badge.name} className="badge" title={badge.description}>
                <span className="badge-icon">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat">
          <span className="stat-value">{reputation.metrics.conversationsCompleted}</span>
          <span className="stat-label">Conversations Ended Properly</span>
        </div>
        <div className="stat">
          <span className="stat-value">{reputation.metrics.datesAttended}/{reputation.metrics.datesScheduled}</span>
          <span className="stat-label">Dates Attended</span>
        </div>
      </div>
      
      {/* Warnings (if any) */}
      {reputation.warnings.length > 0 && (
        <div className="warnings-section">
          <h4>⚠️ Warnings</h4>
          {reputation.warnings.map((warning, idx) => (
            <div key={idx} className="warning-item">
              {warning.message}
            </div>
          ))}
        </div>
      )}
      
      {/* Recent Feedback */}
      <details className="feedback-details">
        <summary>Recent Anonymous Feedback ({reputation.recentFeedback.length})</summary>
        <div className="feedback-list">
          {reputation.recentFeedback.map((fb, idx) => (
            <div key={idx} className={`feedback-item ${fb.type}`}>
              <span className="feedback-category">{fb.category}</span>
              <p>{fb.comment}</p>
              <span className="feedback-date">{new Date(fb.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

FEATURE 2: PHOTOS AFTER PERSONALITY (BLIND MATCHING)
Profile Data Structure
javascriptconst userProfile = {
  userId: "user_123",
  
  // Basic Info (visible immediately)
  name: "Sarah", // First name only
  age: 28,
  location: "San Francisco, CA",
  
  // Personality Data (visible before photos)
  personalityTest: {
    openness: 75,
    conscientiousness: 82,
    extraversion: 60,
    agreeableness: 88,
    neuroticism: 45,
    completed: true,
    completedDate: "2025-01-20"
  },
  
  // Voice Intro (required, heard before photos)
  voiceIntro: {
    audioUrl: "https://storage/voice_intro_user123.mp3",
    duration: 45, // seconds
    transcript: "Hi, I'm Sarah. I'm a product designer who...",
    uploadedDate: "2025-01-20"
  },
  
  // Written Profile (visible before photos)
  about: "I'm passionate about sustainable design and spend weekends hiking...",
  interests: ["hiking", "pottery", "sci-fi books", "cooking"],
  values: ["authenticity", "growth", "adventure"],
  lookingFor: "Someone curious, kind, and ready for real partnership",
  dealbreakers: ["smoking", "wants kids immediately", "long distance"],
  
  // Photos (locked initially)
  photos: {
    locked: true,
    unlockConditions: {
      messageCount: 20, // Must exchange 20 messages first
      mutualAgreement: false, // Both must agree to unlock
      timeSpent: 0 // Minutes in conversation
    },
    images: [
      { url: "https://storage/photo1.jpg", isUnfiltered: true, verifiedDate: "2025-01-20" },
      { url: "https://storage/photo2.jpg", isUnfiltered: true, verifiedDate: "2025-01-20" },
      { url: "https://storage/photo3.jpg", isUnfiltered: true, verifiedDate: "2025-01-20" }
    ]
  },
  
  // Matching preferences
  preferences: {
    ageRange: [25, 35],
    maxDistance: 25, // miles
    mustShareValues: ["authenticity", "growth"]
  }
};
Personality Test Implementation
Comprehensive personality assessment:
javascriptfunction PersonalityTestFlow({ onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  
  const questions = [
    // Big Five + Relationship-Specific Questions
    {
      id: 1,
      category: "openness",
      question: "I enjoy trying new experiences and exploring unfamiliar places",
      scale: 1-7 // Strongly Disagree to Strongly Agree
    },
    {
      id: 2,
      category: "communication",
      question: "In conflicts, I prefer to discuss issues immediately rather than waiting",
      scale: 1-7
    },
    {
      id: 3,
      category: "values",
      question: "Rank these in order of importance: Career success, Family time, Personal growth, Adventure, Stability",
      type: "ranking"
    },
    // ... 40-50 total questions covering:
    // - Big Five personality traits
    // - Communication style
    // - Conflict resolution
    // - Love languages
    // - Life goals
    // - Values and priorities
    // - Attachment style
    // - Lifestyle preferences
  ];
  
  async function handleComplete() {
    // Calculate personality scores
    const scores = calculatePersonalityScores(answers);
    
    // Generate compatibility vector for matching
    const compatibilityVector = generateCompatibilityVector(scores);
    
    // Save to profile
    await window.storage.set(`profile_${currentUserId}`, JSON.stringify({
      ...userProfile,
      personalityTest: {
        ...scores,
        completed: true,
        completedDate: new Date().toISOString()
      },
      compatibilityVector
    }));
    
    onComplete();
  }
  
  return (
    <div className="personality-test">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${(currentQuestion / questions.length) * 100}%` }} />
      </div>
      
      <h2>Question {currentQuestion + 1} of {questions.length}</h2>
      
      <div className="question-card">
        <p className="question-text">{questions[currentQuestion].question}</p>
        
        {questions[currentQuestion].type === 'scale' && (
          <div className="scale-options">
            {[1, 2, 3, 4, 5, 6, 7].map(value => (
              <button
                key={value}
                onClick={() => {
                  setAnswers({ ...answers, [questions[currentQuestion].id]: value });
                  setCurrentQuestion(currentQuestion + 1);
                }}
                className="scale-button"
              >
                {value}
              </button>
            ))}
            <div className="scale-labels">
              <span>Strongly Disagree</span>
              <span>Strongly Agree</span>
            </div>
          </div>
        )}
        
        {questions[currentQuestion].type === 'ranking' && (
          <RankingInput
            options={questions[currentQuestion].options}
            onComplete={(ranking) => {
              setAnswers({ ...answers, [questions[currentQuestion].id]: ranking });
              setCurrentQuestion(currentQuestion + 1);
            }}
          />
        )}
      </div>
      
      {currentQuestion >= questions.length && (
        <button onClick={handleComplete} className="primary-button">
          Complete Assessment
        </button>
      )}
    </div>
  );
}
Voice Intro Recording
Required voice introduction:
javascriptfunction VoiceIntroRecorder({ onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  
  const prompts = [
    "What are you passionate about?",
    "Describe your ideal weekend",
    "What are you looking for in a partner?",
    "Tell us something that makes you unique"
  ];
  
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    const chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
    };
    
    mediaRecorderRef.current.start();
    setIsRecording(true);
    
    // Track duration
    const startTime = Date.now();
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    // Auto-stop after 60 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
        clearInterval(interval);
      }
    }, 60000);
  }
  
  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  }
  
  async function handleSubmit() {
    if (!audioBlob) return;
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result;
      
      // Transcribe using Claude API (optional)
      const transcript = await transcribeAudio(base64Audio);
      
      // Save to profile
      await window.storage.set(`voice_intro_${currentUserId}`, JSON.stringify({
        audioData: base64Audio,
        duration,
        transcript,
        uploadedDate: new Date().toISOString()
      }));
      
      onComplete();
    };
  }
  
  return (
    <div className="voice-intro-recorder">
      <h2>Record Your Voice Introduction</h2>
      <p>Let people hear your personality! (30-60 seconds)</p>
      
      <div className="prompt-suggestions">
        <h3>Suggested topics:</h3>
        <ul>
          {prompts.map((prompt, idx) => (
            <li key={idx}>{prompt}</li>
          ))}
        </ul>
      </div>
      
      {!isRecording && !audioBlob && (
        <button onClick={startRecording} className="record-button">
          🎤 Start Recording
        </button>
      )}
      
      {isRecording && (
        <div className="recording-indicator">
          <div className="pulse-dot" />
          <span>Recording... {duration}s / 60s</span>
          <button onClick={stopRecording}>Stop</button>
        </div>
      )}
      
      {audioBlob && (
        <div className="preview-section">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <div className="actions">
            <button onClick={() => {
              setAudioBlob(null);
              setDuration(0);
            }}>
              Re-record
            </button>
            <button onClick={handleSubmit} className="primary-button">
              Use This Recording
            </button>
          </div>
        </div>
      )}
      
      <div className="requirements">
        <p>✓ Minimum 30 seconds required</p>
        <p>✓ Be authentic and natural</p>
        <p>✓ This is what people hear before seeing your photos</p>
      </div>
    </div>
  );
}
Blind Matching Discovery Feed
Show personality profiles without photos:
javascriptfunction BlindDiscoveryFeed() {
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  
  useEffect(() => {
    loadNextProfile();
  }, []);
  
  async function loadNextProfile() {
    setIsLoadingNext(true);
    
    // Get next compatible match based on personality vectors
    const matches = await findCompatibleMatches(currentUser.compatibilityVector);
    
    if (matches.length > 0) {
      setCurrentProfile(matches[0]);
    }
    
    setIsLoadingNext(false);
  }
  
  async function handleInterested() {
    // Save interest
    await window.storage.set(`interest_${currentUserId}_${currentProfile.userId}`, JSON.stringify({
      interested: true,
      timestamp: new Date().toISOString(),
      photosUnlocked: false
    }));
    
    // Check if mutual interest (match!)
    const theirInterest = await window.storage.get(`interest_${currentProfile.userId}_${currentUserId}`);
    
    if (theirInterest && JSON.parse(theirInterest.value).interested) {
      // It's a match!
      await createMatch(currentUserId, currentProfile.userId);
      showMatchNotification(currentProfile);
    }
    
    loadNextProfile();
  }
  
  function handleNotInterested() {
    loadNextProfile();
  }
  
  if (isLoadingNext || !currentProfile) {
    return <div>Loading next match...</div>;
  }
  
  return (
    <div className="blind-discovery-feed">
      <div className="profile-card">
        {/* No Photos - Show Blurred Placeholder */}
        <div className="photo-placeholder">
          <div className="blur-effect" />
          <div className="unlock-message">
            <span className="lock-icon">🔒</span>
            <p>Photos unlock after you connect</p>
          </div>
        </div>
        
        {/* Basic Info */}
        <div className="profile-header">
          <h2>{currentProfile.name}, {currentProfile.age}</h2>
          <p className="location">📍 {currentProfile.location}</p>
        </div>
        
        {/* Compatibility Score */}
        <div className="compatibility-badge">
          <span className="score">{currentProfile.compatibilityScore}% Compatible</span>
          <span className="label">Based on personality & values</span>
        </div>
        
        {/* Voice Intro (Primary Feature) */}
        <div className="voice-intro-section">
          <h3>🎤 Listen to their voice introduction</h3>
          <audio controls src={currentProfile.voiceIntro.audioUrl} />
          <p className="duration">{currentProfile.voiceIntro.duration}s</p>
        </div>
        
        {/* Personality Visualization */}
        <div className="personality-section">
          <h3>Personality Traits</h3>
          <div className="trait-bars">
            {Object.entries(currentProfile.personalityTest).map(([trait, score]) => (
              <div key={trait} className="trait">
                <label>{trait}</label>
                <div className="bar">
                  <div className="fill" style={{ width: `${score}%` }} />
                </div>
                <span>{score}/100</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Written Profile */}
        <div className="about-section">
          <h3>About</h3>
          <p>{currentProfile.about}</p>
        </div>
        
        {/* Interests */}
        <div className="interests-section">
          <h3>Interests</h3>
          <div className="interest-tags">
            {currentProfile.interests.map(interest => (
              <span key={interest} className="tag">{interest}</span>
            ))}
          </div>
        </div>
        
        {/* Values */}
        <div className="values-section">
          <h3>Values</h3>
          <div className="value-tags">
            {currentProfile.values.map(value => (
              <span key={value} className="tag value-tag">{value}</spanContinue1:02 AM

        ))}
      </div>
    </div>
    
    {/* What They're Looking For */}
    <div className="looking-for-section">
      <h3>Looking For</h3>
      <p>{currentProfile.lookingFor}</p>
    </div>
    
    {/* Deal-breakers (Transparency) */}
    <div className="dealbreakers-section">
      <h3>Deal-breakers</h3>
      <ul>
        {currentProfile.dealbreakers.map((db, idx) => (
          <li key={idx}>{db}</li>
        ))}
      </ul>
    </div>
    
    {/* Reputation Scores */}
    <ReputationDisplay userId={currentProfile.userId} />
  </div>
  
  {/* Action Buttons */}
  <div className="action-buttons">
    <button onClick={handleNotInterested} className="pass-button">
      ✕ Pass
    </button>
    <button onClick={handleInterested} className="interested-button">
      ❤️ Interested
    </button>
  </div>
  
  <div className="explanation-box">
    <p>💡 If you both express interest, you'll match and can start messaging. Photos unlock after 20 messages or mutual agreement.</p>
  </div>
</div>
);
}

### Photo Unlock System

**Gradual photo reveal in chat:**
```javascript
function ChatInterface({ matchId, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [photoUnlockStatus, setPhotoUnlockStatus] = useState({
    unlocked: false,
    messageCount: 0,
    requiredMessages: 20,
    mutualAgreementRequested: false
  });
  
  useEffect(() => {
    loadChatData();
    checkPhotoUnlockStatus();
  }, [matchId]);
  
  async function checkPhotoUnlockStatus() {
    const match = await getMatch(matchId);
    const messageCount = match.messages.length;
    
    setPhotoUnlockStatus({
      ...photoUnlockStatus,
      messageCount,
      unlocked: match.photosUnlocked || messageCount >= 20
    });
  }
  
  async function requestPhotoUnlock() {
    // Send system message
    await sendMessage(matchId, {
      type: 'photo_unlock_request',
      senderId: currentUserId,
      timestamp: new Date().toISOString(),
      content: `${currentUser.name} would like to unlock photos. Do you agree?`
    });
    
    setPhotoUnlockStatus({
      ...photoUnlockStatus,
      mutualAgreementRequested: true
    });
  }
  
  async function handlePhotoUnlockResponse(agreed) {
    if (agreed) {
      // Unlock photos for both users
      await updateMatch(matchId, {
        photosUnlocked: true,
        unlockedAt: new Date().toISOString(),
        unlockedBy: 'mutual_agreement'
      });
      
      // Send system message
      await sendMessage(matchId, {
        type: 'photos_unlocked',
        timestamp: new Date().toISOString(),
        content: 'Photos are now visible! 📸'
      });
      
      setPhotoUnlockStatus({ ...photoUnlockStatus, unlocked: true });
    } else {
      await sendMessage(matchId, {
        type: 'photo_unlock_declined',
        timestamp: new Date().toISOString(),
        content: `Not ready to share photos yet. Let's keep talking!`
      });
    }
  }
  
  // Auto-unlock at 20 messages
  useEffect(() => {
    if (photoUnlockStatus.messageCount >= 20 && !photoUnlockStatus.unlocked) {
      handleAutoUnlock();
    }
  }, [photoUnlockStatus.messageCount]);
  
  async function handleAutoUnlock() {
    await updateMatch(matchId, {
      photosUnlocked: true,
      unlockedAt: new Date().toISOString(),
      unlockedBy: 'message_threshold'
    });
    
    await sendMessage(matchId, {
      type: 'photos_unlocked',
      timestamp: new Date().toISOString(),
      content: '🎉 You\'ve exchanged 20 messages! Photos are now visible.'
    });
    
    setPhotoUnlockStatus({ ...photoUnlockStatus, unlocked: true });
  }
  
  return (
    <div className="chat-interface">
      {/* Photo Unlock Banner */}
      {!photoUnlockStatus.unlocked && (
        <div className="photo-unlock-banner">
          <p>📸 Photos unlock after 20 messages ({photoUnlockStatus.messageCount}/20)</p>
          <p>Or request early unlock by mutual agreement</p>
          <button onClick={requestPhotoUnlock}>Request Photo Unlock</button>
        </div>
      )}
      
      {/* Header with Profile Preview */}
      <div className="chat-header">
        {photoUnlockStatus.unlocked ? (
          <img src={otherUser.photos.images[0].url} alt={otherUser.name} className="profile-pic" />
        ) : (
          <div className="profile-pic-locked">🔒</div>
        )}
        <div>
          <h3>{otherUser.name}, {otherUser.age}</h3>
          <button onClick={() => showFullProfile(otherUser)}>View Full Profile</button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="messages-container">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      
      {/* Input */}
      <div className="message-input">
        <textarea placeholder="Type a message..." />
        <button>Send</button>
      </div>
    </div>
  );
}
```

---

## FEATURE 3: RADICAL TRANSPARENCY PROFILES

### Required Unfiltered Photo System

**AI-powered photo verification:**
```javascript
async function PhotoUploadWithVerification({ onComplete }) {
  const [photos, setPhotos] = useState([]);
  const [verificationResults, setVerificationResults] = useState([]);
  
  async function handlePhotoUpload(file) {
    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Image = reader.result;
      
      // Check for filters/heavy editing using Claude Vision
      const verification = await verifyPhotoAuthenticity(base64Image);
      
      setPhotos([...photos, { file, base64: base64Image }]);
      setVerificationResults([...verificationResults, verification]);
    };
  }
  
  async function verifyPhotoAuthenticity(base64Image) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image.split(',')[1]
              }
            },
            {
              type: "text",
              text: `Analyze this photo for authenticity. Return ONLY valid JSON:

{
  "isUnfiltered": true/false,
  "filterDetected": "none" or "beauty filter" or "face tune" or "heavy editing",
  "confidence": 0-100,
  "issues": ["issue 1", "issue 2"],
  "warnings": ["warning 1"],
  "recommendation": "accept" or "reject" or "warn"
}

We require natural, unfiltered photos. Detect:
- Beauty filters (smooth skin, enlarged eyes, slimmer face)
- Heavy editing or photoshop
- Face-tuning apps
- Overly professional/staged photos
- Old photos (wrong season, outdated style)

Normal photo editing (cropping, brightness, contrast) is fine.`
            }
          ]
        }]
      })
    });
    
    const data = await response.json();
    const result = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim());
    return result;
  }
  
  return (
    <div className="photo-upload-verification">
      <h2>Upload Your Photos</h2>
      <p className="requirement">✓ Required: 3-5 recent, unfiltered photos</p>
      
      <div className="requirements-list">
        <h3>Photo Requirements:</h3>
        <ul>
          <li>✓ Recent photos (within last 6 months)</li>
          <li>✓ Natural lighting, no heavy filters</li>
          <li>✓ Clear face visibility</li>
          <li>✓ Variety: close-up, full body, doing activities</li>
          <li>✗ No group photos where you're unclear</li>
          <li>✗ No sunglasses-only photos</li>
          <li>✗ No heavily filtered/edited images</li>
        </ul>
      </div>
      
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          Array.from(e.target.files).forEach(file => handlePhotoUpload(file));
        }}
        id="photo-upload"
        style={{ display: 'none' }}
      />
      
      <label htmlFor="photo-upload" className="upload-button">
        📷 Upload Photos
      </label>
      
      {/* Photo Previews with Verification */}
      <div className="photo-previews">
        {photos.map((photo, idx) => (
          <div key={idx} className="photo-preview-card">
            <img src={photo.base64} alt={`Upload ${idx + 1}`} />
            
            {verificationResults[idx] && (
              <div className={`verification-badge ${verificationResults[idx].recommendation}`}>
                {verificationResults[idx].recommendation === 'accept' && '✓ Verified Natural'}
                {verificationResults[idx].recommendation === 'warn' && '⚠️ Possible Editing Detected'}
                {verificationResults[idx].recommendation === 'reject' && '✗ Heavy Filtering Detected'}
              </div>
            )}
            
            {verificationResults[idx]?.issues.length > 0 && (
              <div className="issues-list">
                {verificationResults[idx].issues.map((issue, i) => (
                  <p key={i} className="issue">⚠️ {issue}</p>
                ))}
              </div>
            )}
            
            <button onClick={() => {
              setPhotos(photos.filter((_, i) => i !== idx));
              setVerificationResults(verificationResults.filter((_, i) => i !== idx));
            }}>
              Remove
            </button>
          </div>
        ))}
      </div>
      
      {photos.length >= 3 && verificationResults.filter(v => v.recommendation !== 'reject').length >= 3 && (
        <button onClick={onComplete} className="primary-button">
          Continue with These Photos
        </button>
      )}
    </div>
  );
}
```

### Video Verification System

**Live video verification (not just photo):**
```javascript
function VideoVerification({ onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  
  async function startVerification() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false
      });
      
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      // Start recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // Verify the video
        await verifyVideo(blob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 10000);
      
    } catch (error) {
      alert('Camera access required for verification: ' + error.message);
    }
  }
  
  async function verifyVideo(videoBlob) {
    // Extract frame from video
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    
    await new Promise(resolve => {
      video.onloadeddata = resolve;
    });
    
    video.currentTime = 5; // Get frame at 5 seconds
    
    await new Promise(resolve => {
      video.onseeked = resolve;
    });
    
    // Capture frame as image
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const frameImage = canvas.toDataURL('image/jpeg');
    
    // Compare with profile photos using Claude
    const verification = await compareVideoToPhotos(frameImage);
    setVerificationStatus(verification);
    
    if (verification.matches) {
      // Save verification
      await window.storage.set(`verification_${currentUserId}`, JSON.stringify({
        verified: true,
        videoData: videoBlob,
        verifiedDate: new Date().toISOString(),
        confidence: verification.confidence
      }));
      
      setTimeout(() => onComplete(), 2000);
    }
  }
  
  async function compareVideoToPhotos(videoFrame) {
    const profilePhotos = await getProfilePhotos(currentUserId);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: "Compare this live video frame with the profile photos. Do they appear to be the same person? Return ONLY JSON:"
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: videoFrame.split(',')[1]
              }
            },
            ...profilePhotos.map(photo => ({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: photo.base64
              }
            })),
            {
              type: "text",
              text: `
{
  "matches": true/false,
  "confidence": 0-100,
  "reasoning": "explanation",
  "warnings": ["any concerns"]
}`
            }
          ]
        }]
      })
    });
    
    const data = await response.json();
    return JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim());
  }
  
  return (
    <div className="video-verification">
      <h2>Video Verification</h2>
      <p>Quick 10-second video to verify you match your photos</p>
      
      <div className="video-container">
        <video ref={videoRef} autoPlay muted playsInline />
        
        {isRecording && (
          <div className="recording-overlay">
            <div className="recording-dot" />
            <p>Recording... Stay still and look at the camera</p>
          </div>
        )}
        
        {verificationStatus && (
          <div className={`verification-result ${verificationStatus.matches ? 'success' : 'failure'}`}>
            {verificationStatus.matches ? (
              <>
                <span className="icon">✓</span>
                <p>Verification Successful!</p>
                <p className="confidence">Confidence: {verificationStatus.confidence}%</p>
              </>
            ) : (
              <>
                <span className="icon">✗</span>
                <p>Verification Failed</p>
                <p className="reason">{verificationStatus.reasoning}</p>
                <button onClick={() => {
                  setVideoBlob(null);
                  setVerificationStatus(null);
                }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {!isRecording && !videoBlob && (
        <button onClick={startVerification} className="primary-button">
          Start Verification
        </button>
      )}
      
      <div className="instructions">
        <h3>Instructions:</h3>
        <ul>
          <li>✓ Look directly at the camera</li>
          <li>✓ Make sure your face is well-lit</li>
          <li>✓ Remove sunglasses or hats</li>
          <li>✓ The video will be 10 seconds</li>
        </ul>
      </div>
    </div>
  );
}
```

### Required Vulnerability Section

**Force honest self-disclosure:**
```javascript
function VulnerabilitySection({ onComplete }) {
  const [vulnerabilities, setVulnerabilities] = useState({
    challenges: ['', '', ''],
    insecurities: ['', ''],
    pastRelationshipLessons: '',
    dealbreakers: ['', '', ''],
    currentLifeSituation: ''
  });
  
  const challengePrompts = [
    "What's something you're actively working to improve about yourself?",
    "What's a challenge you're currently facing in life?",
    "What's something about dating that's difficult for you?"
  ];
  
  const insecurityPrompts = [
    "What's something you're insecure about?",
    "What's a fear you have about relationships?"
  ];
  
  function validateCompleteness() {
    return (
      vulnerabilities.challenges.every(c => c.length > 20) &&
      vulnerabilities.insecurities.every(i => i.length > 20) &&
      vulnerabilities.pastRelationshipLessons.length > 50 &&
      vulnerabilities.dealbreakers.filter(d => d.length > 5).length >= 3 &&
      vulnerabilities.currentLifeSituation.length > 30
    );
  }
  
  async function handleSubmit() {
    if (!validateCompleteness()) {
      alert('Please complete all sections with thoughtful responses');
      return;
    }
    
    // Save to profile
    await window.storage.set(`profile_${currentUserId}_vulnerability`, JSON.stringify({
      ...vulnerabilities,
      completedDate: new Date().toISOString()
    }));
    
    onComplete();
  }
  
  return (
    <div className="vulnerability-section">
      <h2>Radical Honesty Profile</h2>
      <p className="intro">
        Vulnerability creates real connections. Be honest about who you are—flaws and all. 
        This section is required and visible to potential matches.
      </p>
      
      {/* Personal Challenges */}
      <div className="section">
        <h3>Personal Challenges</h3>
        <p className="description">Everyone has things they're working on. Share yours honestly.</p>
        
        {challengePrompts.map((prompt, idx) => (
          <div key={idx} className="input-group">
            <label>{prompt}</label>
            <textarea
              value={vulnerabilities.challenges[idx]}
              onChange={(e) => {
                const newChallenges = [...vulnerabilities.challenges];
                newChallenges[idx] = e.target.value;
                setVulnerabilities({ ...vulnerabilities, challenges: newChallenges });
              }}
              minLength={20}
              placeholder="Be specific and honest..."
              rows={3}
            />
            <span className="char-count">
              {vulnerabilities.challenges[idx].length}/20 min
            </span>
          </div>
        ))}
      </div>
      
      {/* Insecurities */}
      <div className="section">
        <h3>Insecurities & Fears</h3>
        <p className="description">Sharing insecurities builds trust and intimacy.</p>
        
        {insecurityPrompts.map((prompt, idx) => (
          <div key={idx} className="input-group">
            <label>{prompt}</label>
            <textarea
              value={vulnerabilities.insecurities[idx]}
              onChange={(e) => {
                const newInsecurities = [...vulnerabilities.insecurities];
                newInsecurities[idx] = e.target.value;
                setVulnerabilities({ ...vulnerabilities, insecurities: newInsecurities });
              }}
              minLength={20}
              placeholder="It's okay to be vulnerable..."
              rows={3}
            />
          </div>
        ))}
      </div>
      
      {/* Past Relationship Lessons */}
      <div className="section">
        <h3>What I've Learned from Past Relationships</h3>
        <textarea
          value={vulnerabilities.pastRelationshipLessons}
          onChange={(e) => setVulnerabilities({
            ...vulnerabilities,
            pastRelationshipLessons: e.target.value
          })}
          minLength={50}
          placeholder="What patterns have you noticed? What have you learned about yourself? What are you doing differently now?"
          rows={5}
        />
        <span className="char-count">
          {vulnerabilities.pastRelationshipLessons.length}/50 min
        </span>
      </div>
      
      {/* Deal-breakers */}
      <div className="section">
        <h3>My Deal-breakers</h3>
        <p className="description">Be clear about what doesn't work for you. This saves everyone time.</p>
        
        {[0, 1, 2].map(idx => (
          <div key={idx} className="input-group">
            <input
              type="text"
              value={vulnerabilities.dealbreakers[idx]}
              onChange={(e) => {
                const newDealbreakers = [...vulnerabilities.dealbreakers];
                newDealbreakers[idx] = e.target.value;
                setVulnerabilities({ ...vulnerabilities, dealbreakers: newDealbreakers });
              }}
              placeholder={`Deal-breaker #${idx + 1}`}
            />
          </div>
        ))}
      </div>
      
      {/* Current Life Situation */}
      <div className="section">
        <h3>My Current Life Situation</h3>
        <p className="description">Where are you at in life right now? Career, living situation, life stage, etc.</p>
        <textarea
          value={vulnerabilities.currentLifeSituation}
          onChange={(e) => setVulnerabilities({
            ...vulnerabilities,
            currentLifeSituation: e.target.value
          })}
          minLength={30}
          placeholder="Example: I just moved to a new city for work, living with roommates while I save for my own place. Career is going well but taking up a lot of my time..."
          rows={4}
        />
      </div>
      
      <div className="why-box">
        <h4>Why we require this:</h4>
        <p>Research shows that vulnerability and authenticity create stronger connections than perfect-looking profiles. People who share honestly attract others who value authenticity.</p>
      </div>
      
      <button 
        onClick={handleSubmit}
        disabled={!validateCompleteness()}
        className="primary-button"
      >
        Complete Profile
      </button>
      
      {!validateCompleteness() && (
        <p className="validation-message">
          Please complete all sections thoughtfully before continuing
        </p>
      )}
    </div>
  );
}
```

### Full Transparency Profile View

**Display complete transparent profile:**
```javascript
function TransparentProfileView({ userId }) {
  const [profile, setProfile] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [vulnerability, setVulnerability] = useState(null);
  
  useEffect(() => {
    loadProfileData();
  }, [userId]);
  
  async function loadProfileData() {
    const prof = await window.storage.get(`profile_${userId}`);
    const rep = await window.storage.get(`reputation_${userId}`);
    const vuln = await window.storage.get(`profile_${userId}_vulnerability`);
    
    setProfile(JSON.parse(prof.value));
    setReputation(JSON.parse(rep.value));
    setVulnerability(JSON.parse(vuln.value));
  }
  
  if (!profile) return <div>Loading...</div>;
  
  return (
    <div className="transparent-profile">
      {/* Photos Section */}
      <div className="photos-section">
        <div className="photo-grid">
          {profile.photos.images.map((photo, idx) => (
            <div key={idx} className="photo-item">
              <img src={photo.url} alt={`Photo ${idx + 1}`} />
              <div className="verification-badge">
                ✓ Unfiltered & Verified
              </div>
            </div>
          ))}
        </div>
        
        {profile.videoVerification && (
          <div className="video-verification-badge">
            <span className="icon">📹</span>
            <span>Video Verified {new Date(profile.videoVerification.verifiedDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      
      {/* Basic Info */}
      <div className="basic-info">
        <h1>{profile.name}, {profile.age}</h1>
        <p>{profile.location}</p>
      </div>
      
      {/* Accountability Scores - Prominent Display */}
      <ReputationDisplay userId={userId} />
      
      {/* Voice Introduction */}
      <div className="voice-section">
        <h2>🎤 Voice Introduction</h2>
        <audio controls src={profile.voiceIntro.audioUrl} />
      </div>
      
      {/* About */}
      <div className="about-section">
        <h2>About</h2>
        <p>{profile.about}</p>
      </div>
      
      {/* Vulnerability Section - HIGHLIGHTED */}
      <div className="vulnerability-display">
        <div className="section-header">
          <h2>💭 Honest Self-Disclosure</h2>
          <span className="badge">Radical Transparency</span>
        </div>
        
        <div className="vulnerability-item">
          <h3>Personal Challenges</h3>
          <ul>
            {vulnerability.challenges.map((challenge, idx) => (
              <li key={idx}>{challenge}</li>
            ))}
          </ul>
        </div>
        
        <div className="vulnerability-item">
          <h3>Insecurities & Fears</h3>
          <ul>
            {vulnerability.insecurities.map((insecurity, idx) => (
              <li key={idx}>{insecurity}</li>
            ))}
          </ul>
        </div>
        
        <div className="vulnerability-item">
          <h3>Past Relationship Lessons</h3>
          <p>{vulnerability.pastRelationshipLessons}</p>
        </div>
        
        <div className="vulnerability-item">
          <h3>Deal-breakers</h3>
          <ul>
            {vulnerability.dealbreakers.filter(d => d).map((db, idx) => (
              <li key={idx}>{db}</li>
            ))}
          </ul>
        </div>
        
        <div className="vulnerability-item">
          <h3>Current Life Situation</h3>
          <p>{vulnerability.currentLifeSituation}</p>
        </div>
      </div>
      
      {/* Personality Traits */}
      <div className="personality-section">
        <h2>Personality Profile</h2>
        {/* Display Big Five traits */}
      </div>
      
      {/* Interests & Values */}
      <div className="interests-values">
        <h2>Interests</h2>
        <div className="tags">
          {profile.interests.map(interest => (
            <span key={interest} className="tag">{interest}</span>
          ))}
        </div>
        
        <h2>Core Values</h2>
        <div className="tags">
          {profile.values.map(value => (
            <span key={value} className="tag value-tag">{value}</span>
          ))}
        </div>
      </div>
      
      {/* What They're Looking For */}
      <div className="looking-for">
        <h2>What I'm Looking For</h2>
        <p>{profile.lookingFor}</p>
      </div>
    </div>
  );
}
```

---

## DATA STORAGE SCHEMA

**Use window.storage for persistence:**
```javascript
// User profiles
await window.storage.set(`profile_${userId}`, JSON.stringify(userProfile));

// Reputation scores
await window.storage.set(`reputation_${userId}`, JSON.stringify(reputationData));

// Vulnerability sections
await window.storage.set(`profile_${userId}_vulnerability`, JSON.stringify(vulnerabilityData));

// Matches
await window.storage.set(`match_${matchId}`, JSON.stringify(matchData));

// Conversations
await window.storage.set(`conversation_${conversationId}`, JSON.stringify(conversationData));

// User interests (for matching)
await window.storage.set(`interest_${fromUserId}_${toUserId}`, JSON.stringify(interestData));

// Feedback and ratings
await window.storage.set(`feedback_${feedbackId}`, JSON.stringify(feedbackData));
```

---

## UI/UX DESIGN REQUIREMENTS

### Color Scheme:
- Primary: Deep Blue (#1e40af) - Trust and reliability
- Secondary: Warm Orange (#f97316) - Authenticity and warmth
- Success: Green (#10b981) - Positive accountability
- Warning: Amber (#f59e0b) - Cautions and alerts
- Danger: Red (#ef4444) - Serious warnings

### Typography:
- Headers: Bold, clear sans-serif
- Body: Readable, friendly font
- Emphasis on readability for vulnerability sections

### Design Philosophy:
- Clean, uncluttered interface
- Emphasize transparency and honesty
- Make accountability scores prominent
- Warm, inviting atmosphere despite seriousness
- Mobile-first responsive design

---

## CRITICAL IMPLEMENTATION NOTES

1. **Privacy & Data Protection:**
   - All personal data stored locally with window.storage
   - Video verification data encrypted
   - Feedback is anonymized
   - GDPR-compliant data handling

2. **Photo Verification:**
   - Use Claude Vision API for filter detection
   - Require minimum 3 photos
   - All photos verified as recent and unfiltered
   - Video verification required for activation

3. **Accountability System:**Continue1:07 AM
Scores update in real-time based on behavior
Cannot be gamed or manipulated
Transparent calculation methodology
Visible to all users


Blind Matching:

Photos strictly locked until unlock conditions met
Voice intro required before matching
Personality test mandatory for compatibility
No way to bypass photo lock


Vulnerability Requirements:

Minimum character counts enforced
Cannot skip or leave blank
Visible to all potential matches
Encourages authentic self-presentation




TESTING CHECKLIST

 Photo upload and filter detection works
 Video verification correctly matches photos
 Reputation scores calculate and display correctly
 Ghosting detection triggers properly
 Conversation ending system works
 Photo unlock system functions (20 messages or mutual agreement)
 Voice recording and playback works
 Personality test saves and displays
 Vulnerability section validates completeness
 All data persists across sessions
 Mobile responsive design works
 Matching algorithm uses personality vectors
 Feedback system is anonymous
 Post-date rating system updates authenticity scores


DEPLOYMENT STEPS

Build onboarding flow with all required sections
Implement photo/video verification
Create blind discovery feed
Build chat interface with photo unlock
Implement reputation tracking system
Add conversation ending mechanics
Create post-date rating system
Build full transparent profile view
Test all features end-to-end
Deploy as single-page web app


BUILD THIS AS A COMPLETE, FUNCTIONAL DATING APP THAT REVOLUTIONIZES ONLINE DATING THROUGH ACCOUNTABILITY, AUTHENTICITY, AND PERSONALITY-FIRST MATCHING!