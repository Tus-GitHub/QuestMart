"use client";

import { useState, useEffect, useRef } from "react";
import Signup from "./Signup";
import Signin from "./Signin";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useDispatch, useSelector } from "react-redux";
import { signOutUserFailure, signOutUserStart, signOutUserSuccess } from "@/redux/user/userSlice";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [dropDownOpen, setDropDownOpen] = useState(false);

  const {currentUser} = useSelector(state => state.user);
  const dropDownRef = useRef(null);
  const dispatch = useDispatch();
  
  const handleScroll = () => {
    if (window.scrollY > lastScrollY) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
    setLastScrollY(window.scrollY);
  };

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
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  const handleSignOut = async ()=>{
      try{
        dispatch(signOutUserStart());
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signout`);
        const data = await res.json();
        console.log(data.message)
        if(data.success === false){
          dispatch(signOutUserFailure(data.message))
        }
        dispatch(signOutUserSuccess(data.user));
      }catch(error){
        dispatch(signOutUserFailure(error.message));
      }
  }

  return (
    <div
      className={`fixed top-0 left-0 w-full flex justify-between items-center text-white h-[72px] text-md bg-[#121212] z-[1000] shadow-lg transition-transform duration-200 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <button className="hover:text-red-700 md:text-xl italic tracking-widest md:pl-10 pl-2 text-sm">
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
      {currentUser ? (
        <div className="relative" ref={dropDownRef}>
          <div
            onClick={()=> setDropDownOpen(!dropDownOpen)}
            className="rounded-full w-9 h-9 transition-all duration-300 hover:shadow-[0_0_15px_6px_#b91c1c] cursor-pointer mr-6"
          >
            <img 
              src={currentUser.avatar}
              className="w-9 h-9 rounded-full object-cover mr-8"
            />
          </div>
          {dropDownOpen && (
            <div className="absolute right-2 mt-2 w-28 bg-white flex items-center justify-center text-red-700 border-red-500 shadow-lg rounded-3xl">
              <ul className="py-2 ">
                <li className="px-4 py-2 md:border-0 border-2 border-red-500 hover:bg-red-400 hover:text-white hover:cursor rounded-3xl"><button>Profile</button></li>
                <li className="px-4 py-2 mt-1 md:mt-0 md:border-0 border-2 border-red-500 hover:bg-red-500 hover:text-white hover:cursor rounded-3xl"><button onClick={handleSignOut}>Sign Out</button></li>
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
