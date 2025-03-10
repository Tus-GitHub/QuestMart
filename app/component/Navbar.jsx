'use client';

import { useState } from "react";
import Signup from "./Signup";
import Signin from "./Signin";

export default function Navbar(){

    const[isOpen, setIsOpen] = useState(false);
    const[authMode, setAuthMode] = useState("signup");

    const clicked = () =>{
        setIsOpen(!isOpen);
    }

    return(
        <div className="flex justify-between items-center text-white h-[72px]  text-md relative z-50">
                <button className="hover:text-red-700 text-xl italic tracking-widest pl-10">STORE</button>
            <div className="flex gap-8">
                <button className="hover:text-red-700">PlayStation</button>
                <button className="hover:text-red-700">X-Box</button>
                <button className="hover:text-red-700">PlayStation-2</button>
                <button className="hover:text-red-700">PlayStation-5</button>
                <button className="hover:text-red-700">Blogs</button>
            </div>
                <button className="p-3 bg-red-700 rounded-full hover:scale-115 mr-8 text-sm transition transform" onClick={clicked}>SIGNIN/SIGNUP</button>
            {isOpen && authMode==="signup" && <Signup setIsOpen={setIsOpen} setAuthMode={setAuthMode}/>}
            {isOpen && authMode==="signin" && <Signin setIsOpen={setIsOpen} setAuthMode={setAuthMode}/>}
        </div>
    )
}