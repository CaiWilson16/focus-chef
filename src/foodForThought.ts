import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

const CHEF_QUESTIONS = [
  "What was the hardest dish you had to prep today, Chef?",
  "Sometimes the kitchen gets hot. What helped keep your cool today?",
  "What's one ingredient (skill) you want to add to your recipe this week?",
  "Did you plate everything on time today? What would you do differently?",
  "What's one thing you're proud of cooking up today?",
  "Every chef has a signature dish (skill). What's yours becoming?",
  "What distracted you from the kitchen today and how did you handle it?",
  "If today was a meal, what course would it be and why?",
  "What's one thing you learned in the kitchen today?",
  "Who in your life deserves a five star review right now?",
  "What's been burning on the back burner that needs your attention?",
  "If stress was an ingredient today, how much did you use?",
  "What's one habit you want to add to your daily prep routine?",
  "Did you take any breaks today? A good chef knows when to step away.",
  "What would you order for yourself tonight as a reward?",
  "What's one goal you want to have plated by the end of this week?",
  "If today had a flavor, what would it be?",
  "What's something you've been overthinking that you need to just cook already?",
  "Who helped you in the kitchen today, even in a small way?",
  "What's one thing you want to prep better tomorrow?",
  "What's a recipe in your life that needs a little more time in the oven?",
  "If your week was a tasting menu, what's the standout course so far?",
  "What's one thing you need to stop adding to your plate?",
  "Did you nourish yourself today, not just others?",
  "What's the secret ingredient that got you through today?",
  "If you could redo one moment from today, what would it be?",
  "What's something small that made today's meal worth it?",
  "Are you running your kitchen or is your kitchen running you?",
  "What's one thing you need to let simmer instead of rushing?",
  "If today was a recipe, what step did you skip that you shouldn't have?",
  "What's one compliment you received today, even a small one?",
  "What's been your biggest time waster this week?",
  "If you could order anything for your future self, what would it be?",
  "What's one boundary you set today in your kitchen?",
  "Did you ask for help when you needed it today?",
  "What's one thing you're still learning to cook?",
  "If motivation was a spice, how seasoned were you today?",
  "What made you smile today, even briefly?",
  "What's one thing on your menu that you are grateful for?",
  "If today was served to a critic, what score would they give?",
  "What's one dish (goal) you've been putting off starting?",
  "What's been your most satisfying meal (win) this week?",
  "If you could hire a sous chef for one task in your life, what would it be?",
  "What's one thing you need to stop burning energy on?",
  "Did you stay true to your recipe today or improvise?",
  "What's one thing that surprised you today?",
  "If stress had a taste, how would today's stress taste?",
  "What's one thing you want to master?",
  "Did you celebrate any small wins today?",
  "What's one ingredient missing from your week right now?",
  "If your productivity was a dish today, was it overcooked or undercooked?",
  "What's one thing you wish you had more time to cook up?",
  "Who inspires your recipe for success?",
  "What's one thing draining your kitchen energy right now?",
  "If today was a cooking show, what would the episode title be?",
  "What's one thing you want to bring to the table this week?",
  "Did you follow your prep list today or wing it?",
  "What's one thing you're still marinating on?",
  "If you could fast forward to any moment this week, what would it be?",
  "What's one thing you cooked up today that you're really proud of?",
];

export async function getDailyQuestion(): Promise<string> {
  const questionRef = doc(db, 'dailyQuestions', getTodayKey());
  const snap = await getDoc(questionRef);
  if (snap.exists()) return snap.data().question;

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const question = CHEF_QUESTIONS[dayOfYear % CHEF_QUESTIONS.length];

  await setDoc(questionRef, {
    question,
    date: getTodayKey(),
    createdAt: Date.now(),
  });

  return question;
}

export async function getTodayEntry(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const ref = doc(db, 'journal', `${user.uid}_${getTodayKey()}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().response : null;
}

export async function saveTodayEntry(response: string, question: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'journal', `${user.uid}_${getTodayKey()}`);
  await setDoc(ref, {
    uid: user.uid,
    date: getTodayKey(),
    question,
    response,
    createdAt: Date.now(),
  });
}