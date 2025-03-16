"use client";

import { useState, useEffect } from "react";
import Signup from "./Signup";
import Signin from "./Signin";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = () => {
    if (window.scrollY > lastScrollY) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
    setLastScrollY(window.scrollY);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

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
      <button
        className="p-3 bg-red-700 rounded-full hover:scale-115 mr-8 text-xs md:text-base transition transform"
        onClick={() => setIsOpen(!isOpen)}
      >
        SIGNIN
      </button>
      {isOpen && authMode === "signup" && <Signup setIsOpen={setIsOpen} setAuthMode={setAuthMode} />}
      {isOpen && authMode === "signin" && <Signin setIsOpen={setIsOpen} setAuthMode={setAuthMode} />}
    </div>
  );
}
