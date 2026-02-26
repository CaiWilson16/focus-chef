import React, { useState, useEffect } from 'react';
import { Utensils, Timer as TimerIcon, CheckCircle, Flame } from 'lucide-react';

interface Plate {
  id: number;
  text: string;
  goalMinutes: number;
}

export default function App() {
  const [task, setTask] = useState<string>('');
  const [goal, setGoal] = useState<number>(30); // Default to 30 mins
  const [activePlate, setActivePlate] = useState<Plate | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isCooking, setIsCooking] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (isCooking && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    } else if (isCooking && secondsLeft === 0) {
      setIsCooking(false);
      alert("DING! Dish Served. Check your Prep Station!");
    }
    return () => clearInterval(interval);
  }, [isCooking, secondsLeft]);

  const startCooking = () => {
    if (!task) return;
    const newPlate: Plate = { id: Date.now(), text: task, goalMinutes: goal };
    setActivePlate(newPlate);
    setSecondsLeft(goal * 60);
    setIsCooking(true);
  };

  return (
    <div className="min-h-screen bg-pink-50 p-8 text-slate-800">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-pink-500 flex justify-center items-center gap-2">
          <Utensils /> FocusChef
        </h1>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        {/* 1. PREP STATION */}
        {!isCooking ? (
          <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-pink-100">
            <h2 className="font-bold mb-4 flex items-center gap-2"><CheckCircle size={20}/> Prep Station</h2>
            <div className="space-y-4">
              <input 
                placeholder="What assignment are we prepping?"
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
                onClick={startCooking}
                className="w-full bg-pink-400 text-white font-bold py-3 rounded-xl hover:bg-pink-500 transition"
              >
                Start Cooking
              </button>
            </div>
          </section>
        ) : (
          /* 2. THE SILENT OVEN (Invisible Timer Mode) */
          <section className="bg-white p-10 rounded-3xl shadow-lg border-4 border-orange-200 text-center animate-pulse">
            <Flame className="mx-auto text-orange-400 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-slate-700">Cooking: {activePlate?.text}</h2>
            <p className="mt-2 text-slate-500 italic">The timer is hidden so you can focus...</p>
            
            {/* The "Invisible" Logic: Timer is in the code, but hidden from the UI */}
            <div style={{ display: 'none' }}>{secondsLeft}s remaining</div>

            <button 
              onClick={() => {setIsCooking(false); setTask('');}}
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
