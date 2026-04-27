import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes with conflict resolution, used everywhere a
// component composes classes from props.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
