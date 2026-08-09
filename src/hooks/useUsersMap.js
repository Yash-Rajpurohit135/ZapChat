import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { database } from '../config/firebase';

export default function useUsersMap() {
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    const q = collection(database, 'users');
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setUsersMap(map);
      },
      (err) => {
        console.warn('users onSnapshot error', err);
      }
    );
    return () => unsub();
  }, []);

  return usersMap;
}