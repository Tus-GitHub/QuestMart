'use client';

import { Router } from "next/router";
import { useState } from "react";
import { RxCross2 } from "react-icons/rx";


export default function Signup({setAuthMode, setIsOpen}){

    const[formData, setFormData] = useState({});
    const[error, setError] = useState("");

    const handleChange = (e) =>{
        setFormData({
            ...formData,
            [e.target.id] : e.target.value,
        });
    }

    const handleSubmit = async (e) =>{
        e.preventDefault();

        if(!formData.username || !formData.email || !formData.password || !formData.confirmPassword){
            setError("Please Fill Every Detail Before submiting");
            return;
        }
        else if(formData.password !== formData.confirmPassword){
            setError("ConfirmPassword is not matching with Paswword");
            return;
        }
        const{confirmPassword, ...rest} = formData;
        try{
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signup`,
                {
                    method:"POST",
                    headers:{
                        "COntent-type":"application/json",
                    },
                    body: JSON.stringify(rest),
                }
            );
            const data = await res.json();
            if(data.success === false){
                setError(data.message);
                return;
            }
            setError(null);
            setAuthMode("signin");
        }catch(error){
            console.log(error);
            setError(error.message);
        }
    };



    return(
        <div className="absolute flex flex-col right-0  top-[70px] w-[600px] h-[500px] z-50  backdrop-blur-3xl items-center">
            <form className="flex flex-col items-center  pt-6 border-red-300 border-2 w-[500px] h-[480px] m-4 gap-4 justify-center" onSubmit={handleSubmit}>
            <button onClick={() => setIsOpen(false)} className="text-white absolute top-8 right-16 hover:text-red-700 text-xl"><RxCross2 className="bg-red-400 rounded-full text-2xl p-1 hover:bg-white " /></button>
                <p className="mr-10">UserName: <span className="pl-2">
                    <input 
                        type='text'
                        className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                        placeholder="Enter you name"
                        onChange={handleChange}
                        id="username"
                    />
                    </span></p>
                    <p className="mr-10">UserEmail: <span className="pl-2">
                    <input 
                        type='email'
                        className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                        placeholder="Enter you email"
                        onChange={handleChange}
                        id="email"
                    />
                    </span></p>
                    <p className="mr-10">Password: <span className="pl-2">
                    <input 
                        type='password'
                        className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                        placeholder="Enter you password"
                        onChange={handleChange}
                        id="password"
                    />
                    </span></p>
                    <p className="mr-10">Password: <span className="pl-2">
                    <input 
                        type='password'
                        className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                        placeholder="Confirm your password"
                        onChange={handleChange}
                        id="confirmPassword"
                    />
                    </span></p>
                    {error && <p className="text-red-700 p-1">{error}</p>}
                <button className="bg-red-500 p-2 px-3 rounded-full hover:scale-110 uppercase">Sign-Up</button>
                <p className="text-white mt-2">Already have an account? 
                    <button className="text-red-500 underline ml-1" onClick={() => setAuthMode("signin")}>
                        Sign In
                    </button>
                </p>
            </form>
        </div>
    )
}