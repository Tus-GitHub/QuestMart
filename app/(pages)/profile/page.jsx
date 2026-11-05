"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { checkSession } from "@/redux/user/userSlice";

export default function ProfilePage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { currentUser, sessionChecked, sessionChecking, sessionError } = useSelector((state) => state.user);

    useEffect(() => {
        if (sessionChecked && !currentUser) router.replace("/");
    }, [currentUser, sessionChecked, router]);

    if (sessionError) {
        return (
            <div className="min-h-screen bg-black text-white px-4 py-12 text-center">
                <p role="alert" className="text-gray-400 mb-4">{sessionError}</p>
                <button onClick={() => dispatch(checkSession())} className="rounded-lg bg-red-600 px-5 py-2 font-semibold">
                    Try again
                </button>
            </div>
        );
    }

    if (!sessionChecked || sessionChecking) {
        return <p role="status" className="text-center text-gray-400 py-12">Checking your session…</p>;
    }

    if (!currentUser) return null;

    const initial = currentUser.username?.[0]?.toUpperCase() || "?";

    return (
        <div className="min-h-screen bg-black text-white px-4 py-12">
            <div className="max-w-2xl mx-auto">

                {/* Profile card */}
                <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden">
                    {/* Banner */}
                    <div className="h-28 bg-gradient-to-r from-red-900 via-red-700 to-orange-700" />

                    {/* Avatar + name */}
                    <div className="px-6 pb-6">
                        <div className="flex items-end gap-4 -mt-10 mb-4">
                            {currentUser.avatar ? (
                                <img
                                    src={currentUser.avatar}
                                    alt="avatar"
                                    className="w-20 h-20 rounded-full object-cover border-4 border-[#111] shadow-xl"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full border-4 border-[#111] bg-red-700 flex items-center justify-center text-3xl font-bold shadow-xl">
                                    {initial}
                                </div>
                            )}
                            <div className="pb-1">
                                <h1 className="text-xl font-bold text-white">{currentUser.username}</h1>
                                <p className="text-gray-500 text-sm">QuestMart Member</p>
                            </div>
                        </div>

                        {/* Info rows */}
                        <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-4 py-3 border border-gray-800">
                                <span className="text-gray-500 text-lg">👤</span>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wide">Username</p>
                                    <p className="text-white text-sm font-medium">{currentUser.username}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-4 py-3 border border-gray-800">
                                <span className="text-gray-500 text-lg">✉️</span>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wide">Email</p>
                                    <p className="text-white text-sm font-medium">{currentUser.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold text-sm transition active:scale-95">
                                Edit Profile
                            </button>
                            <button
                                onClick={() => router.push("/")}
                                className="flex-1 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 py-2.5 rounded-lg font-semibold text-sm border border-gray-700 transition active:scale-95"
                            >
                                Browse Games
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { label: "Games Listed", value: "0" },
                        { label: "Sold", value: "0" },
                        { label: "Purchased", value: "0" },
                    ].map(stat => (
                        <div key={stat.label} className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
                            <p className="text-white text-2xl font-bold">{stat.value}</p>
                            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
