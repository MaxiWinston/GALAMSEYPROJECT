import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

// Firebase configuration for project `galamsey-monitor-e380f` with env var overrides
const firebaseConfig = {
  apiKey:            (import.meta.env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyCNS09fyXiEDbyYz08xoF2Iy7UnpQHRtWM',
  authDomain:        (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'galamsey-monitor-e380f.firebaseapp.com',
  databaseURL:       (import.meta.env.VITE_FIREBASE_DATABASE_URL as string) || 'https://galamsey-monitor-e380f-default-rtdb.firebaseio.com',
  projectId:         (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'galamsey-monitor-e380f',
  storageBucket:     (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'galamsey-monitor-e380f.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '897332490787',
  appId:             (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:897332490787:web:6992f271f064fc79e67796',
}

export const app = initializeApp(firebaseConfig)
export const db  = getDatabase(app)
export const auth = getAuth(app)
