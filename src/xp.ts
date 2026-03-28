import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export const CHEF_RANKS = [
  { level: 1, title: 'Kitchen Newbie',   minXP: 0    },
  { level: 2, title: 'Prep Cook',        minXP: 400  },
  { level: 3, title: 'Line Cook',        minXP: 800  },
  { level: 4, title: 'Sous Chef',        minXP: 1800  },
  { level: 5, title: 'Head Chef',        minXP: 3500  },
  { level: 6, title: 'Executive Chef',   minXP: 6500 },
  { level: 7, title: 'Master Chef',      minXP: 10000 },
];

export type CookResult = 'early' | 'ontime' | 'late';

export function getCookResult(secondsLeft: number, goalMinutes: number): CookResult {
  if (secondsLeft === 0) return 'late';
  const halfwaySeconds = (goalMinutes * 60) / 2;
  if (secondsLeft > halfwaySeconds) return 'early';
  return 'ontime';
}

export function calculateXP(goalMinutes: number, result: CookResult): number {
  const baseXP = goalMinutes * 10;
  if (result === 'early')  return Math.round(baseXP * 1.2);
  if (result === 'ontime') return baseXP;
  return 0;
}

export function getCookMessage(result: CookResult, xp: number): string {
  if (result === 'early')
    return `🔥 Meal is hot and being sent out! +${xp} XP`;
  if (result === 'ontime')
    return `✅ Meal is heading out — great job, Chef! +${xp} XP`;
  return `🔥💀 You burnt the food... the guests are not happy. No XP this time.`;
}

export function getRank(totalXP: number) {
  let current = CHEF_RANKS[0];
  for (const rank of CHEF_RANKS) {
    if (totalXP >= rank.minXP) current = rank;
  }
  return current;
}

export async function awardXP(xpEarned: number): Promise<{ totalXP: number; leveledUp: boolean; newTitle: string }> {
  const user = auth.currentUser;
  if (!user || xpEarned === 0) return { totalXP: 0, leveledUp: false, newTitle: '' };

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const oldXP = snap.exists() ? snap.data().totalXP : 0;
  const oldRank = getRank(oldXP);

  if (!snap.exists()) {
    await setDoc(ref, { totalXP: xpEarned, uid: user.uid });
  } else {
    await updateDoc(ref, { totalXP: increment(xpEarned) });
  }

  const newXP = oldXP + xpEarned;
  const newRank = getRank(newXP);
  const leveledUp = newRank.level > oldRank.level;

  return { totalXP: newXP, leveledUp, newTitle: newRank.title };
}

export async function getUserXP(): Promise<{ totalXP: number; rank: typeof CHEF_RANKS[0] }> {
  const user = auth.currentUser;
  if (!user) return { totalXP: 0, rank: CHEF_RANKS[0] };
  const snap = await getDoc(doc(db, 'users', user.uid));
  const totalXP = snap.exists() ? snap.data().totalXP : 0;
  return { totalXP, rank: getRank(totalXP) };
}