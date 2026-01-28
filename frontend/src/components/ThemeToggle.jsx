"use client"

import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
    document.documentElement.setAttribute("data-theme", savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition"
    >
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  )
}
