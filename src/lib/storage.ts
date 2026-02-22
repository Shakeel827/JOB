import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { setUserProfile } from "./db";

export async function uploadResume(uid: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `resumes/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await setUserProfile(uid, { resumeUrl: url });
  return url;
}
