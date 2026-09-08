// Wraps POST /api/chat and GET /api/chat/history. Works signed-in or anonymous:
// apiClient attaches the JWT when there is one and the backend decides identity
// from it, never from the body.

import apiClient from './apiClient.js';

export async function sendChatMessage({ message, sessionId }) {
  const { data } = await apiClient.post('/chat', { message, session_id: sessionId });
  return data.data; // { reply, session_id, conversation_id, grounded, sources, classification, ... }
}

export async function fetchChatHistory(sessionId) {
  const { data } = await apiClient.get('/chat/history', { params: { session_id: sessionId } });
  return data.data; // { conversation_id, messages: [{ sender, message, created_at }] }
}
