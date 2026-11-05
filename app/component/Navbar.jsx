"use client";

import { useState, useEffect, useRef } from "react";
import Signup from "./Signup";
import Signin from "./Signin";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useDispatch, useSelector } from "react-redux";
import { checkSession, signOutUserFailure, signOutUserStart, signOutUserSuccess } from "@/redux/user/userSlice";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [dropDownOpen, setDropDownOpen] = useState(false);

  const { currentUser, loading, error, sessionChecked, sessionChecking, sessionError } = useSelector(state => state.user);
  const dropDownRef = useRef(null);
  const dispatch = useDispatch();

  const router = useRouter();
  
  useEffect(()=>{
    function handleClickOutside(e){
      if(dropDownRef.current && !dropDownRef.current.contains(e.target)){
        setDropDownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return ()=>{
      document.removeEventListener("mousedown", handleClickOutside);
    }
  },[]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      setIsVisible(window.scrollY <= lastScrollY);
      lastScrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSignOut = async ()=>{
      if (loading) return;
      try{
        dispatch(signOutUserStart());
        const res = await fetch("/api/auth/signout", { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          dispatch(signOutUserFailure(data.message || "Unable to sign out. Please try again."));
          return;
        }
        dispatch(signOutUserSuccess());
        setDropDownOpen(false);
      }catch(error){
        dispatch(signOutUserFailure("Unable to sign out. Check your connection and try again."));
      } 
  }

  return (
    <div
      className={`fixed top-0 left-0 w-full flex justify-between items-center text-white h-[72px] text-md bg-[#121212] z-[1000] shadow-lg transition-transform duration-200 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <button className="hover:text-red-700 md:text-xl italic tracking-widest md:pl-10 pl-2 text-sm" onClick={()=> router.push("/")}>
        STORE
      </button>
      <div className="flex md:gap-8 gap-2 text-xs md:text-base">
        <button className="hover:text-red-700 md:block hidden">X-Box</button>
        <button className="hover:text-red-700 md:block hidden">PlayStation-4</button>
        <button className="hover:text-red-700 md:block hidden">PlayStation-5</button>
        <div className="relative md:hidden">
          <button
            onClick={() => setIsClicked(!isClicked)}
            className="hover:text-red-700 flex items-center gap-1"
          >
            PlayStation <ChevronDownIcon className="w-3 h-3" />
          </button>
          {isClicked && (
            <div className="absolute left-0 mt-2 w-32 bg-white text-black border-gray-300 rounded-lg shadow-lg z-50">
              <button className="block px-4 py-2 hover:bg-gray-200 w-full text-left">PlayStation-4</button>
              <button className="block px-4 py-2 hover:bg-gray-200 w-full text-left">PlayStation-5</button>
            </div>
          )}
        </div>
        <button className="hover:text-red-700 md:hidden visible">X-Box</button>
        <button className="hover:text-red-700">Blogs</button>
      </div>
      {sessionError ? (
        <button
          onClick={() => dispatch(checkSession())}
          className="text-xs text-red-300 mr-4 rounded-lg border border-red-900 px-3 py-2"
          title={sessionError}
        >
          Retry session
        </button>
      ) : !sessionChecked || sessionChecking ? (
        <span role="status" className="mr-4 text-xs text-gray-400">Checking session…</span>
      ) : currentUser ? (
        <div className="relative" ref={dropDownRef}>
          <button
            onClick={()=> setDropDownOpen(!dropDownOpen)}
            aria-label="Account menu"
            aria-expanded={dropDownOpen}
            className="rounded-full w-9 h-9 transition-all duration-300 hover:shadow-[0_0_15px_6px_#b91c1c] cursor-pointer mr-6"
          >
            <img 
              src={currentUser.avatar}
              alt="Your profile"
              className="w-9 h-9 rounded-full object-cover mr-8"
            />
          </button>
          {dropDownOpen && (
            <div className="absolute right-2 mt-2 w-44 bg-white flex items-center justify-center text-red-700 border-red-500 shadow-lg rounded-3xl">
              <ul className="py-2 ">
                <li className="px-4 py-2 md:border-0 border-2 border-red-500 hover:bg-red-400 hover:text-white hover:cursor rounded-3xl"><button onClick={()=> router.push("/profile")}>Profile</button></li>
                <li className="px-4 py-2 mt-1 md:mt-0 md:border-0 border-2 border-red-500 hover:bg-red-500 hover:text-white hover:cursor rounded-3xl"><button disabled={loading} onClick={handleSignOut}>{loading ? "Signing out…" : "Sign Out"}</button></li>
                {error && <li role="alert" className="px-4 py-2 text-xs text-red-700">{error}</li>}
              </ul>
            </div>
          )}
        </div>
      ):(<button
          className="p-3 bg-red-700 rounded-full hover:scale-115 mr-8 text-xs md:text-base transition transform"
          onClick={() => {setIsOpen(!isOpen); setAuthMode("signin")}}
        >
          SIGNIN
        </button>
      )}
      {isOpen && authMode === "signup" && <Signup setIsOpen={setIsOpen} setAuthMode={setAuthMode} />}
      {isOpen && authMode === "signin" && <Signin setIsOpen={setIsOpen} setAuthMode={setAuthMode} />}
    </div>
  );
}
