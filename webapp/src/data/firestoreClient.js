import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, deleteDoc, serverTimestamp, writeBatch, query, where, documentId } from 'firebase/firestore';

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
const PDF_PREFIX = 'mkg:pdfchunk:';
const PDF_COLLECTION = 'mkg_pdfchunks';
const EMPTY_RETRY_DELAY_MS = 1200;
const WRITE_RETRY_COUNT = 2;
const WRITE_RETRY_DELAY_MS = 900;

export function collectionForKey(key) {
  return key.startsWith(PDF_PREFIX) ? PDF_COLLECTION : MAIN_COLLECTION;
}

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
    await writeWithRetry(() => setDoc(doc(db, collectionForKey(key), key), {
      value: JSON.stringify(value),
      updatedAt: serverTimestamp(),
    }));
  }

  async function deleteDocByKey(key) {
    await writeWithRetry(() => deleteDoc(doc(db, collectionForKey(key), key)));
  }

  async function deleteDocsBatch(keys) {
    if (keys.length === 0) return;
    await writeWithRetry(async () => {
      const batch = writeBatch(db);
      for (const key of keys) {
        batch.delete(doc(db, collectionForKey(key), key));
      }
      await batch.commit();
    });
  }

  async function writeDocsBatch(entries) {
    if (entries.length === 0) return;
    await writeWithRetry(async () => {
      const batch = writeBatch(db);
      for (const [key, value] of entries) {
        batch.set(doc(db, collectionForKey(key), key), {
          value: JSON.stringify(value),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    });
  }

  async function fetchKeysWithPrefix(prefix) {
    const coll = collectionForKey(prefix);
    const q = query(
      collection(db, coll),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + ''),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.id);
  }

  async function fetchRawValue(key) {
    const snap = await getDoc(doc(db, collectionForKey(key), key));
    return snap.exists() ? snap.data().value : null;
  }

  return { loadAllOnce, writeDoc, deleteDocByKey, deleteDocsBatch, writeDocsBatch, fetchKeysWithPrefix, fetchRawValue };
}

export async function loadAllWithRetry(loadOnceFn, delayMs = EMPTY_RETRY_DELAY_MS) {
  const first = await loadOnceFn();
  if (first && Object.keys(first).length > 0) return first;
  await new Promise(resolve => setTimeout(resolve, delayMs));
  const second = await loadOnceFn();
  return second || {};
}
