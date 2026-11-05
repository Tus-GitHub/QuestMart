'use client';

import { clearAuthError, signInFailure, signInStart, signInSuccess } from "@/redux/user/userSlice";
import { useEffect, useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";

export default function Signin({ setAuthMode, setIsOpen }) {
    const [formData, setFormData] = useState({});
    const { loading, error } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(clearAuthError());
    }, [dispatch]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        try {
            dispatch(signInStart());
            const res = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok || !data.success || !data.user) {
                dispatch(signInFailure(data.message || "Sign in failed"));
                return;
            }
            dispatch(signInSuccess(data.user));
            setIsOpen(false);
        } catch (err) {
            dispatch(signInFailure("Unable to sign in. Check your connection and try again."));
        }
    };

    return (
        /* Full-screen backdrop */
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
            <div className="relative bg-[#111] border border-gray-800 rounded-2xl w-[90vw] max-w-md p-8 shadow-2xl">

                {/* Close */}
                <button
                    aria-label="Close sign in"
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <RxCross2 className="text-xl" />
                </button>

                {/* Header */}
                <div className="mb-7 text-center">
                    <h2 className="text-white text-2xl font-bold mb-1">Welcome back</h2>
                    <p className="text-gray-500 text-sm">Sign in to your QuestMart account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="identifier" className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                            Username or Email
                        </label>
                        <input
                            type="text"
                            id="identifier"
                            autoComplete="username"
                            required
                            maxLength={254}
                            placeholder="Enter your username or email"
                            onChange={handleChange}
                            className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            required
                            maxLength={72}
                            placeholder="Enter your password"
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
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="text-gray-500 text-sm text-center mt-5">
                    Don&apos;t have an account?{" "}
                    <button
                        className="text-red-400 hover:text-red-300 font-medium transition"
                        onClick={() => setAuthMode("signup")}
                    >
                        Sign Up
                    </button>
                </p>
            </div>
        </div>
    );
}
