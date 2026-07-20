import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyDSq-wkq28uEsU3CO5WT6aW0CQgU1SW7bk',
  authDomain: 'makor-morning-news.firebaseapp.com',
  projectId: 'makor-morning-news',
  storageBucket: 'makor-morning-news.firebasestorage.app',
  messagingSenderId: '651054346177',
  appId: '1:651054346177:web:a31a6fbca4b90853338940',
  measurementId: 'G-XN8VTJDMQV',
};

const MAIN_COLLECTION = 'mkg_data';
const EMPTY_RETRY_DELAY_MS = 1200;
const WRITE_RETRY_COUNT = 2;
const WRITE_RETRY_DELAY_MS = 900;

export async function writeWithRetry(writeFn, retries = WRITE_RETRY_COUNT, delayMs = WRITE_RETRY_DELAY_MS) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await writeFn();
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export function createFirestoreClient(config = DEFAULT_CONFIG) {
  const app = initializeApp(config);
  const db = getFirestore(app);

  async function loadAllOnce() {
    const snapshot = await getDocs(collection(db, MAIN_COLLECTION));
    const out = {};
    snapshot.forEach(doc => {
      try {
        out[doc.id] = JSON.parse(doc.data().value);
      } catch {
        // corrupt row — skip, matches production behavior
      }
    });
    return out;
  }

  async function writeDoc(key, value) {
    await writeWithRetry(() => setDoc(doc(db, MAIN_COLLECTION, key), {
      value: JSON.stringify(value),
      updatedAt: serverTimestamp(),
    }));
  }

  async function deleteDocByKey(key) {
    await writeWithRetry(() => deleteDoc(doc(db, MAIN_COLLECTION, key)));
  }

  return { loadAllOnce, writeDoc, deleteDocByKey };
}

export async function loadAllWithRetry(loadOnceFn, delayMs = EMPTY_RETRY_DELAY_MS) {
  const first = await loadOnceFn();
  if (first && Object.keys(first).length > 0) return first;
  await new Promise(resolve => setTimeout(resolve, delayMs));
  const second = await loadOnceFn();
  return second || {};
}
