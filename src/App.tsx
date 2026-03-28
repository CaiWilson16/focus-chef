import React, { useState, useEffect } from 'react';
import { Utensils, CheckCircle, Flame, Trash2, Pencil, LogIn, LogOut } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, provider, db } from './firebase';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, updateDoc
} from 'firebase/firestore';
import {
  getCookResult, calculateXP, getCookMessage,
  awardXP, getUserXP, getRank
} from './xp';
import {
  getDailyQuestion, getTodayEntry, saveTodayEntry
} from './foodForThought';

interface Plate {
  id: string;
  text: string;
  goalMinutes: number;
  completed: boolean;
}

const CLOCK_IN_GREETINGS = [
  "Good morning, Chef! Let's get started 🍳",
  "Time to get cooking! The kitchen is yours 🔥",
  "Beautiful day to start cooking! Let's go 👨‍🍳",
  "The kitchen is open, Chef! Ready to work? 🍽️",
  "Aprons on, Chef! Time to get to work 💪",
  "Welcome back to the kitchen! Let's make something great 🌟",
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);

  const [showFoodForThought, setShowFoodForThought] = useState<boolean>(false);
  const [dailyQuestion, setDailyQuestion] = useState<string>('');
  const [journalResponse, setJournalResponse] = useState<string>('');
  const [todayEntry, setTodayEntry] = useState<string | null>(null);
  const [journalSaved, setJournalSaved] = useState<boolean>(false);

  const [task, setTask] = useState<string>('');
  const [goal, setGoal] = useState<number>(30);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [activePlate, setActivePlate] = useState<Plate | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isCooking, setIsCooking] = useState<boolean>(false);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editGoal, setEditGoal] = useState<number>(30);

  const [totalXP, setTotalXP] = useState<number>(0);
  const [chefTitle, setChefTitle] = useState<string>('Kitchen Newbie');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadPlates(currentUser.uid);
        const { totalXP, rank } = await getUserXP();
        setTotalXP(totalXP);
        setChefTitle(rank.title);
        const entry = await getTodayEntry();
        setTodayEntry(entry);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isCooking) {
      if (secondsLeft > 0) {
        interval = setInterval(() => setSecondsLeft(s => s - 1), 1000);
      } else {
        setIsOvertime(true);
      }
    }
    return () => clearInterval(interval);
  }, [isCooking, secondsLeft]);

  async function loadPlates(uid: string) {
    const q = query(collection(db, 'tasks'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plate));
    setPlates(data);
  }

  const handleClockIn = () => {
    setIsClockedIn(true);
  };

  const handleClockOut = async () => {
    const entry = await getTodayEntry();
    const question = await getDailyQuestion();
    setDailyQuestion(question);
    setTodayEntry(entry);
    setJournalResponse('');
    setJournalSaved(false);
    setShowFoodForThought(true);
    setIsClockedIn(false);
  };

  const handleSaveJournal = async () => {
    if (!journalResponse.trim()) return;
    await saveTodayEntry(journalResponse, dailyQuestion);
    setTodayEntry(journalResponse);
    setJournalSaved(true);
  };

  const handleCloseFoodForThought = () => {
    setShowFoodForThought(false);
  };

  const handleAddToMenu = async () => {
    if (!task.trim() || !user) return;
    await addDoc(collection(db, 'tasks'), {
      uid: user.uid,
      text: task,
      goalMinutes: goal,
      completed: false,
      createdAt: Date.now(),
    });
    setTask('');
    setGoal(30);
    loadPlates(user.uid);
  };

  const handleStartCooking = (plate: Plate) => {
    setActivePlate(plate);
    setSecondsLeft(plate.goalMinutes * 60);
    setIsOvertime(false);
    setIsCooking(true);
  };

  const handleDone = async () => {
    if (!activePlate) return;
    const result = isOvertime
      ? 'late'
      : getCookResult(secondsLeft, activePlate.goalMinutes);
    const xp = calculateXP(activePlate.goalMinutes, result);
    const message = getCookMessage(result, xp);
    await updateDoc(doc(db, 'tasks', activePlate.id), { completed: true });
    const { totalXP: newTotal, leveledUp, newTitle } = await awardXP(xp);
    setTotalXP(newTotal);
    setChefTitle(getRank(newTotal).title);
    if (leveledUp) {
      alert(`${message}\n\n🎉 YOU LEVELED UP! You are now a ${newTitle}!`);
    } else {
      alert(message);
    }
    loadPlates(user!.uid);
    setIsCooking(false);
    setActivePlate(null);
    setIsOvertime(false);
    setSecondsLeft(0);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
    loadPlates(user!.uid);
  };

  const startEdit = (plate: Plate) => {
    setEditingId(plate.id);
    setEditText(plate.text);
    setEditGoal(plate.goalMinutes);
  };

  const handleUpdate = async (id: string) => {
    await updateDoc(doc(db, 'tasks', id), { text: editText, goalMinutes: editGoal });
    setEditingId(null);
    loadPlates(user!.uid);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPlates([]);
    setIsClockedIn(false);
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center text-slate-800">
        <h1 className="text-4xl font-bold text-pink-500 flex items-center gap-2 mb-4">
          <Utensils /> FocusChef
        </h1>
        <p className="text-slate-500 mb-8">Sign in to start cooking 🍳</p>
        <button
          onClick={handleLogin}
          className="bg-pink-400 text-white font-bold px-8 py-3 rounded-xl hover:bg-pink-500 transition"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  // Food for Thought screen
  if (showFoodForThought) {
    return (
      <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-8 text-slate-800">
        <div className="bg-white rounded-3xl shadow-sm border-2 border-pink-100 p-10 max-w-md w-full text-center space-y-6">
          <h2 className="text-2xl font-bold text-pink-500">🍽️ Food for Thought</h2>
          <p className="text-slate-500 italic text-sm">A little moment just for you before you go.</p>

          {!dailyQuestion ? (
            <p className="text-slate-400 text-sm animate-pulse">Preparing today's question...</p>
          ) : (
            <p className="text-slate-700 font-medium text-lg">{dailyQuestion}</p>
          )}

          {todayEntry ? (
            <div className="space-y-4">
              <div className="bg-pink-50 rounded-2xl p-4 text-slate-600 text-left">
                {todayEntry}
              </div>
              <p className="text-slate-400 text-sm">
                You already reflected today — great job, Chef 💛
              </p>
              <button
                onClick={handleCloseFoodForThought}
                className="w-full bg-pink-400 text-white font-bold py-3 rounded-xl hover:bg-pink-500 transition"
              >
                Close Kitchen 🔒
              </button>
            </div>
          ) : journalSaved ? (
            <div className="space-y-4">
              <div className="bg-pink-50 rounded-2xl p-4 text-slate-600 text-left">
                {journalResponse}
              </div>
              <p className="text-slate-400 text-sm">Saved! See you tomorrow, Chef 💛</p>
              <button
                onClick={handleCloseFoodForThought}
                className="w-full bg-pink-400 text-white font-bold py-3 rounded-xl hover:bg-pink-500 transition"
              >
                Close Kitchen 🔒
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={journalResponse}
                onChange={(e) => setJournalResponse(e.target.value)}
                placeholder="Let it all out, Chef..."
                className="w-full p-4 rounded-2xl border-2 border-pink-100 outline-none focus:border-pink-400 resize-none h-32 text-slate-700"
              />
              <button
                onClick={handleSaveJournal}
                className="w-full bg-pink-400 text-white font-bold py-3 rounded-xl hover:bg-pink-500 transition"
              >
                Save & Clock Out 🔒
              </button>
              <button
                onClick={handleCloseFoodForThought}
                className="w-full text-slate-400 text-sm underline"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Clock In screen
  if (!isClockedIn) {
    const randomGreeting =
      CLOCK_IN_GREETINGS[Math.floor(Math.random() * CLOCK_IN_GREETINGS.length)];
    return (
      <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center text-slate-800">
        <div className="text-center space-y-6 max-w-sm px-8">
          <h1 className="text-4xl font-bold text-pink-500 flex justify-center items-center gap-2">
            <Utensils /> FocusChef
          </h1>
          <p className="text-slate-500">Welcome back, Chef {user.displayName}! 👨‍🍳</p>
          <div className="flex justify-center items-center gap-3">
            <span className="bg-pink-100 text-pink-600 font-bold px-4 py-1 rounded-full text-sm">
              {chefTitle}
            </span>
            <span className="text-slate-400 text-sm">{totalXP} XP</span>
          </div>
          <p className="text-slate-600 italic text-lg">{randomGreeting}</p>
          <button
            onClick={handleClockIn}
            className="w-full bg-pink-400 text-white font-bold py-4 rounded-2xl hover:bg-pink-500 transition flex items-center justify-center gap-2 text-lg"
          >
            <LogIn size={20}/> Clock In
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-300 hover:text-slate-400 transition"
          >
            Not {user.displayName}? Switch account
          </button>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-pink-50 p-8 text-slate-800">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-pink-500 flex justify-center items-center gap-2">
          <Utensils /> FocusChef
        </h1>
        <p className="text-slate-500 mt-2">Welcome back, Chef {user.displayName}! 👨‍🍳</p>
        <div className="mt-2 flex justify-center items-center gap-3">
          <span className="bg-pink-100 text-pink-600 font-bold px-4 py-1 rounded-full text-sm">
            {chefTitle}
          </span>
          <span className="text-slate-400 text-sm">{totalXP} XP</span>
        </div>
        <button
          onClick={handleClockOut}
          className="mt-3 flex items-center gap-2 mx-auto text-sm text-pink-400 underline hover:text-pink-600"
        >
          <LogOut size={14}/> Clock Out
        </button>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        {!isCooking ? (
          <>
            <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-pink-100">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <CheckCircle size={20}/> Prep Station
              </h2>
              <div className="space-y-4">
                <input
                  placeholder="What assignment are we prepping?"
                  value={task}
                  className="w-full p-3 rounded-xl border-2 border-pink-100 outline-none focus:border-pink-400"
                  onChange={(e) => setTask(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Goal Time:</span>
                  <input
                    type="number"
                    value={goal}
                    onChange={(e) => setGoal(Number(e.target.value))}
                    className="w-20 p-2 rounded-lg border-2 border-pink-100"
                  />
                  <span className="text-sm">mins</span>
                </div>
                <button
                  onClick={handleAddToMenu}
                  className="w-full bg-pink-400 text-white font-bold py-3 rounded-xl hover:bg-pink-500 transition"
                >
                  + Add to Menu
                </button>
              </div>
            </section>

            {plates.filter(p => !p.completed).length > 0 && (
              <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-pink-100">
                <h2 className="font-bold mb-4">🍽️ On the Menu</h2>
                <ul className="space-y-4">
                  {plates.filter(p => !p.completed).map(plate => (
                    <li key={plate.id} className="border-b border-pink-50 pb-4">
                      {editingId === plate.id ? (
                        <div className="space-y-2">
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2 rounded-lg border-2 border-pink-100"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editGoal}
                              onChange={(e) => setEditGoal(Number(e.target.value))}
                              className="w-20 p-2 rounded-lg border-2 border-pink-100"
                            />
                            <span className="text-sm">mins</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdate(plate.id)} className="bg-pink-400 text-white px-4 py-1 rounded-lg text-sm">Save</button>
                            <button onClick={() => setEditingId(null)} className="bg-slate-200 px-4 py-1 rounded-lg text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{plate.text}</p>
                              <p className="text-sm text-slate-400">{plate.goalMinutes} mins</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(plate)} className="text-slate-400 hover:text-pink-400">
                                <Pencil size={16}/>
                              </button>
                              <button onClick={() => handleDelete(plate.id)} className="text-slate-400 hover:text-red-400">
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartCooking(plate)}
                            className="w-full bg-orange-400 text-white font-bold py-2 rounded-xl hover:bg-orange-500 transition text-sm"
                          >
                            🔥 Start Cooking
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <section className="bg-white p-10 rounded-3xl shadow-lg border-4 border-orange-200 text-center animate-pulse">
            <Flame className="mx-auto text-orange-400 mb-4" size={48}/>
            <h2 className="text-2xl font-bold text-slate-700">Cooking: {activePlate?.text}</h2>
            <p className="mt-2 text-slate-500 italic">The timer is hidden so you can focus...</p>
            <div style={{ display: 'none' }}>{secondsLeft}s remaining</div>
            {isOvertime && (
              <p className="mt-4 text-red-400 font-bold">
                🔥 Don't burn it, Chef! Finish up!
              </p>
            )}
            <button
              onClick={handleDone}
              className="mt-8 bg-slate-800 text-white px-8 py-2 rounded-full font-bold"
            >
              Done Cooking
            </button>
          </section>
        )}
      </main>
    </div>
  );
}