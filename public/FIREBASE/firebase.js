import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: 'AIzaSyCSknnDsYS4-bKn9S2d5wPUCTu3VVkiD7g',
    authDomain: 'shooter-game-web.firebaseapp.com',
    projectId: 'shooter-game-web',
    storageBucket: 'shooter-game-web.firebasestorage.app',
    messagingSenderId: '517875342456',
    appId: '1:517875342456:web:91e14d7365a884e548218d',
    measurementId: 'G-3VM9562EWF'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
