'use client';

import { useState } from "react";
import { RxCross2 } from "react-icons/rx";

export default function Signin({setAuthMode, setIsOpen}){

    const[formData, setFormData] = useState({});
    const[error, setError] = useState("");

    const handleChange = (e) =>{
        setFormData({
            ...formData,
            [e.target.id] : e.target.value,
        });
    }
    
    const isEmail = /\S+@\S+\.\S+/.test(formData.identifier);

    const handleSubmit = (e) =>{
        e.preventDefault();

        if(!formData.identifier || !formData.password){
            setError("Please Fill Every Detail Before submiting");
            return;
        }
        setError("");
        console.log("Form is submited:", {
            identifier:formData.identifier,
            password:formData.email,
            identifier1: isEmail ? "Email":"username",
        });
    };



    return(
        <div className="absolute flex flex-col right-0  top-[70px] w-[600px] h-[500px] z-50  backdrop-blur-3xl items-center">
            <form className="flex flex-col items-center  pt-6 border-red-300 border-2 w-[500px] h-[480px] m-4 gap-4 justify-center" onSubmit={handleSubmit}>
                <button onClick={() => setIsOpen(false)} className="text-white absolute top-8 right-16 hover:text-red-700 flex justify-end  text-xl"><RxCross2 className="bg-red-400 rounded-full text-2xl p-1 hover:bg-white " /></button>
                <p className=" flex flex-col md:flex-row items-center">UserName / Email: <span className="pl-2">
                    <input 
                        type='text'
                        className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                        placeholder="Enter you name or email"
                        onChange={handleChange}
                        id="identifier"
                    />
                    </span></p>
                    <p className="md:ml-16 ml-2 flex flex-col md:flex-row items-center">Password: <span className="pl-2">
                    <input 
                        type='password'
                        className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                        placeholder="Enter you password"
                        onChange={handleChange}
                        id="password"
                    />
                    </span></p>
                    {error && <p className="text-red-700 p-2">{error}</p>}
                <button className="bg-red-500 p-2 mt-3 px-3 rounded-full hover:scale-110 uppercase">Sign-In</button>
                <p className="text-white mt-2">Don't have an account? 
                    <button className="text-red-500 underline ml-1" onClick={() => setAuthMode("signup")}>
                        Sign Up
                    </button>
                </p>
            </form>
        </div>
    )
}