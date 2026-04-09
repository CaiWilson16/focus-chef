 import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export async function getStreak(): Promise<StreakData> {
  const user = auth.currentUser;
  if (!user) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };

  const ref = doc(db, 'streaks', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  }

  const data = snap.data() as StreakData;

  // If they haven't been active since yesterday or today, streak is broken
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
    // Streak broken — reset it
    await updateDoc(ref, { currentStreak: 0 });
    return { ...data, currentStreak: 0 };
  }

  return data;
}

export async function updateStreak(): Promise<StreakData> {
  const user = auth.currentUser;
  if (!user) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };

  const ref = doc(db, 'streaks', user.uid);
  const snap = await getDoc(ref);
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (!snap.exists()) {
    // First time — start streak at 1
    const newStreak: StreakData = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
    };
    await setDoc(ref, newStreak);
    return newStreak;
  }

  const data = snap.data() as StreakData;

  // Already updated today
  if (data.lastActiveDate === today) return data;

  let newStreak = 1;

  // If they were active yesterday, continue the streak
  if (data.lastActiveDate === yesterday) {
    newStreak = data.currentStreak + 1;
  }

  const newLongest = Math.max(newStreak, data.longestStreak);

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveDate: today,
  };

  await updateDoc(ref, { ...updated });
  return updated;
}