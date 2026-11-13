import { io } from 'socket.io-client';
import api from './api';

// Derive Socket.io base URL from existing API service configuration
const apiBaseURL = process.env.REACT_APP_SOCKET_URL || api.defaults.baseURL || 'http://localhost:5000/api';
const socketURL = apiBaseURL.replace(/\/api\/?$/, '');

const socket = io(socketURL, {
  autoConnect: true,
});

export default socket;
