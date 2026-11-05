'use client';

import { useState } from "react";
import { RxCross2 } from "react-icons/rx";

export default function Signup({ setAuthMode, setIsOpen }) {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError("");
        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (new TextEncoder().encode(formData.password).length > 72) {
            setError("Password is too long. Use fewer characters (maximum 72 bytes).");
            return;
        }
        const { confirmPassword, ...rest } = formData;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rest),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || "Unable to create your account. Please try again.");
                return;
            }
            setAuthMode("signin");
        } catch (err) {
            setError("Unable to create your account. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        /* Full-screen backdrop */
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setIsOpen(false); setAuthMode("signin"); } }}
        >
            <div className="relative bg-[#111] border border-gray-800 rounded-2xl w-[90vw] max-w-md p-8 shadow-2xl">

                {/* Close */}
                <button
                    aria-label="Close sign up"
                    onClick={() => { setIsOpen(false); setAuthMode("signin"); }}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <RxCross2 className="text-xl" />
                </button>

                {/* Header */}
                <div className="mb-7 text-center">
                    <h2 className="text-white text-2xl font-bold mb-1">Create an account</h2>
                    <p className="text-gray-500 text-sm">Join QuestMart and start trading games</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="username" className="text-gray-400 text-xs font-medium uppercase tracking-wide">Username</label>
                        <input
                            type="text"
                            id="username"
                            autoComplete="username"
                            required
                            minLength={3}
                            maxLength={30}
                            pattern="[a-zA-Z0-9_\-]{3,30}"
                            title="3–30 letters, numbers, underscores or hyphens"
                            placeholder="Choose a username"
                            onChange={handleChange}
                            className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-gray-400 text-xs font-medium uppercase tracking-wide">Email</label>
                        <input
                            type="email"
                            id="email"
                            autoComplete="email"
                            required
                            maxLength={254}
                            placeholder="Enter your email"
                            onChange={handleChange}
                            className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-gray-400 text-xs font-medium uppercase tracking-wide">Password</label>
                        <input
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            maxLength={72}
                            placeholder="At least 8 characters"
                            onChange={handleChange}
                            className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirmPassword" className="text-gray-400 text-xs font-medium uppercase tracking-wide">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            maxLength={72}
                            placeholder="Repeat your password"
                            onChange={handleChange}
                            className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 transition"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-all active:scale-95"
                    >
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <p className="text-gray-500 text-sm text-center mt-5">
                    Already have an account?{" "}
                    <button
                        className="text-red-400 hover:text-red-300 font-medium transition"
                        onClick={() => setAuthMode("signin")}
                    >
                        Sign In
                    </button>
                </p>
            </div>
        </div>
    );
}
