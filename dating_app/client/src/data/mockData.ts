export const currentUserId = "user_me";

export const seedProfile = {
  userId: currentUserId,
  name: "Jordan",
  age: 25,
  location: "Raleigh, NC",
  about:
    "Curious builder who loves long walks, messy notebooks, and late-night ramen runs.",
  interests: ["rock climbing", "journaling", "cooking", "documentaries"],
  values: ["authenticity", "growth", "kindness"],
  lookingFor: "Someone honest, steady, and excited to build something real.",
  dealbreakers: ["dishonesty", "chronic flakiness", "no accountability"],
  personalityTest: {
    openness: 74,
    conscientiousness: 81,
    extraversion: 58,
    agreeableness: 88,
    neuroticism: 35,
  },
  voiceIntro: {
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 42,
  },
  photos: {
    locked: true,
    unlockConditions: {
      messageCount: 20,
      mutualAgreement: false,
      timeSpent: 0,
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=60",
        isUnfiltered: true,
        verifiedDate: "2025-01-20",
      },
      {
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=60",
        isUnfiltered: true,
        verifiedDate: "2025-01-20",
      },
      {
        url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=60",
        isUnfiltered: true,
        verifiedDate: "2025-01-20",
      },
    ],
  },
};

export const discoveryProfiles = [
  {
    userId: "user_123",
    name: "Sarah",
    age: 28,
    location: "San Francisco, CA",
    compatibilityScore: 94,
    about:
      "Product designer who loves hiking, sci-fi, and chaotic museum gift shops.",
    interests: ["hiking", "pottery", "sci-fi books", "cooking"],
    values: ["authenticity", "growth", "adventure"],
    lookingFor: "Someone curious, kind, and ready for real partnership",
    dealbreakers: ["smoking", "wants kids immediately", "long distance"],
    personalityTest: {
      openness: 75,
      conscientiousness: 82,
      extraversion: 60,
      agreeableness: 88,
      neuroticism: 45,
    },
    voiceIntro: {
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: 45,
    },
  },
  {
    userId: "user_456",
    name: "Avery",
    age: 30,
    location: "Chicago, IL",
    compatibilityScore: 88,
    about:
      "Former journalist turned researcher. I care about integrity and good coffee.",
    interests: ["photography", "policy", "tea shops", "running"],
    values: ["honesty", "stability", "creativity"],
    lookingFor: "A partner who wants to communicate early and often.",
    dealbreakers: ["ghosting", "no accountability", "avoidance"],
    personalityTest: {
      openness: 69,
      conscientiousness: 86,
      extraversion: 52,
      agreeableness: 90,
      neuroticism: 38,
    },
    voiceIntro: {
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      duration: 39,
    },
  },
];

export const reputationSeed = {
  userId: currentUserId,
  ghostingScore: 85,
  authenticityScore: 92,
  responseScore: 78,
  metrics: {
    conversationsStarted: 45,
    conversationsCompleted: 38,
    conversationsGhosted: 7,
    avgResponseTime: "4 hours",
    messagesReceived: 523,
    messagesRepliedTo: 445,
    datesScheduled: 12,
    datesAttended: 11,
    datesNoShow: 1,
  },
  badges: [
    {
      name: "Respectful Communicator",
      icon: "💬",
      description: "Always provides closure when ending conversations",
      earnedDate: "2025-01-15",
    },
    {
      name: "Reliable Dater",
      icon: "⭐",
      description: "Shows up to scheduled dates 95%+ of the time",
      earnedDate: "2025-01-20",
    },
    {
      name: "Authentic Profile",
      icon: "✓",
      description: "Profile accuracy verified by 10+ dates",
      earnedDate: "2025-01-10",
    },
  ],
  recentFeedback: [
    {
      type: "positive",
      category: "communication",
      comment: "Very respectful and clear about intentions",
      date: "2025-01-26",
    },
    {
      type: "neutral",
      category: "ghosting",
      comment: "Ended conversation politely",
      date: "2025-01-24",
    },
  ],
  warnings: [],
  lastUpdated: "2025-01-27T10:30:00Z",
};

export const matchSeed = [
  {
    id: "match_1",
    userId: "user_123",
    name: "Sarah",
    status: "active",
    lastMessage: "I loved that voice memo you sent.",
    lastUpdated: "2025-02-01T18:12:00Z",
    photosUnlocked: false,
    messages: [
      {
        id: "m1",
        senderId: "user_123",
        content: "Hey! Your values resonated a lot.",
        timestamp: "2025-02-01T17:00:00Z",
      },
      {
        id: "m2",
        senderId: currentUserId,
        content: "Thanks! I liked your voice intro too.",
        timestamp: "2025-02-01T17:12:00Z",
      },
    ],
  },
];
