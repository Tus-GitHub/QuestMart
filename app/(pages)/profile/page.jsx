"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser } = useSelector((state) => state.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
    if (!currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  if (isLoading) return <p className="text-white">Loading...</p>;

  return (
    <div className="text-white">
      <h1>Welcome, {currentUser?.username}</h1>
      <p>Email: {currentUser?.email}</p>
    </div>
  );
}
