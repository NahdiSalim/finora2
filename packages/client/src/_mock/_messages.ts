// Mock data for messages
export const _messages = [
  {
    id: "m1",
    senderId: "user1",
    senderName: "Alice Johnson",
    senderAvatar: null,
    message: "Hey! Did you check the latest design mockups I sent?",
    isUnRead: true,
    sentAt: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    isOnline: true,
  },
  {
    id: "m2",
    senderId: "user2",
    senderName: "Bob Smith",
    senderAvatar: null,
    message:
      "The meeting has been rescheduled to 3 PM tomorrow. Please confirm.",
    isUnRead: true,
    sentAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    isOnline: false,
  },
  {
    id: "m3",
    senderId: "user3",
    senderName: "Carol Williams",
    senderAvatar: null,
    message:
      "Thanks for your help with the project! Everything is working perfectly now.",
    isUnRead: false,
    sentAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    isOnline: true,
  },
  {
    id: "m4",
    senderId: "user4",
    senderName: "David Brown",
    senderAvatar: null,
    message: "Can you review the pull request I submitted? It's quite urgent.",
    isUnRead: false,
    sentAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    isOnline: false,
  },
  {
    id: "m5",
    senderId: "user5",
    senderName: "Emma Davis",
    senderAvatar: null,
    message: "Great work on the presentation! The client was very impressed.",
    isUnRead: false,
    sentAt: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    isOnline: false,
  },
];
