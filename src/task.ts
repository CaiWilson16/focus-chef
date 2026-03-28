import { db, auth } from "./firebase";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, updateDoc
} from "firebase/firestore";

export interface Task {
  id: string;
  name: string;
  goalMinutes: number;
  completed: boolean;
  createdAt: number;
}

// CREATE
export async function addTask(name: string, goalMinutes: number) {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, "tasks"), {
    uid: user.uid,
    name,
    goalMinutes,
    completed: false,
    createdAt: Date.now(),
  });
}

// READ
export async function getTasks(): Promise<Task[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collection(db, "tasks"), where("uid", "==", user.uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
}

// UPDATE — edit task name or goal time
export async function updateTask(taskId: string, name: string, goalMinutes: number) {
  await updateDoc(doc(db, "tasks", taskId), { name, goalMinutes });
}

// COMPLETE — mark done
export async function completeTask(taskId: string) {
  await updateDoc(doc(db, "tasks", taskId), { completed: true });
}

// DELETE
export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, "tasks", taskId));
}