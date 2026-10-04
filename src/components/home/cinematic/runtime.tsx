"use client";
import { useEffect } from "react";
import { mountSequence } from "./sequence";
export function SequenceRuntime() { useEffect(() => { const root = document.querySelector<HTMLElement>("[data-cinematic-home]"); if (root)
    return mountSequence(root); }, []); return null; }
