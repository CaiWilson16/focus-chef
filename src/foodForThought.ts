import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

// Gets today's question — generates via AI if not yet created today
export async function getDailyQuestion(): Promise<string> {
  const questionRef = doc(db, 'dailyQuestions', getTodayKey());
  const snap = await getDoc(questionRef);

  // Already generated today — reuse it
  if (snap.exists()) return snap.data().question;

  // Generate a new one via Anthropic API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Generate one short, thoughtful daily reflection question for a productivity app called FocusChef. 
          The app is chef/kitchen themed and used by college students managing tasks. 
          The question should use chef/kitchen metaphors to ask about their day, stress, wins, or feelings.
          Examples: "Great job Chef — what was the hardest dish you had to prep today?" 
          or "Sometimes the kitchen gets hot. What helped keep your cool today?"
          Return ONLY the question, nothing else. No quotes, no explanation.`
        }]
      })
    });

    const data = await response.json();
    const question = data.content[0].text.trim();

    // Save to Firestore so everyone gets the same question today
    await setDoc(questionRef, {
      question,
      date: getTodayKey(),
      createdAt: Date.now(),
    });

    return question;
  } catch (error) {
    // Fallback if API fails
    return "Great job today, Chef — what was the toughest thing you had to cook through?";
  }
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

