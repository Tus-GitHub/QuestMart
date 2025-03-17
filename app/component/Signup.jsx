'use client';

import { Router } from "next/router";
import { useState } from "react";
import { RxCross2 } from "react-icons/rx";


export default function Signup({setAuthMode, setIsOpen}){

    const[formData, setFormData] = useState({});
    const[error, setError] = useState("");
    const[loading, setLoading] = useState(false);

    const handleChange = (e) =>{
        setFormData({
            ...formData,
            [e.target.id] : e.target.value,
        });
    }

    const handleSubmit = async (e) =>{
        e.preventDefault();
        setLoading(true);
        if(!formData.username || !formData.email || !formData.password || !formData.confirmPassword){
            setError("Please Fill Every Detail Before submiting");
            setLoading(false);
            return;
        }
        else if(formData.password !== formData.confirmPassword){
            setError("ConfirmPassword is not matching with Paswword");
            setLoading(false);
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
                setLoading(false);
                return;
            }
            setError(null);
            setAuthMode("signin");
            setLoading(false);
        }catch(error){
            setError(error.message);
            setLoading(false);
        }
    };



    return(
        <div className="absolute flex flex-col right-0 top-[70px] md:w-[600px] md:h-[500px] w-[360px] h-[430px] z-50  backdrop-blur-3xl items-center">
            <div className="flex flex-col text-sm md:text-base border-red-300 border-2 w-[300px] h-[410px] md:w-[500px] md:h-[480px] items-center justify-center m-2">
                <button onClick={() => {setIsOpen(false); setAuthMode("signin");}}  className="text-white absolute md:top-8 top-6 md:right-16 right-10 hover:text-red-700 text-xl"><RxCross2 className="bg-red-400 rounded-full text-2xl p-1 hover:bg-white " /></button>
                <form className="flex flex-col items-center  pt-6 gap-4 justify-center" onSubmit={handleSubmit}>
                    <p className="flex flex-col md:flex-row items-center">UserName: <span className="pl-2">
                        <input 
                            type='text'
                            className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                            placeholder="Enter you name"
                            onChange={handleChange}
                            id="username"
                        />
                        </span></p>
                        <p className="flex flex-col md:flex-row items-center">UserEmail: <span className="pl-2">
                        <input 
                            type='email'
                            className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                            placeholder="Enter you email"
                            onChange={handleChange}
                            id="email"
                        />
                        </span></p>
                        <p className="flex flex-col md:flex-row items-center">Password: <span className="pl-2">
                        <input 
                            type='password'
                            className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                            placeholder="Enter you password"
                            onChange={handleChange}
                            id="password"
                        />
                        </span></p>
                        <p className="flex flex-col md:flex-row items-center">Password: <span className="pl-2">
                        <input 
                            type='password'
                            className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                            placeholder="Confirm your password"
                            onChange={handleChange}
                            id="confirmPassword"
                        />
                        </span></p>
                    <button disabled={loading} className="bg-red-500 p-1 md:p-2 px-3 rounded-full hover:scale-110 uppercase disabled:opacity-80">
                        {loading? "Loading...":"Sign Up"}
                    </button>
                </form>
                {error && <p className="text-red-700 p-1">{error}</p>}
                <p className="text-white md:mt-2 mt-0">Already have an account? 
                    <button className="text-red-500 underline ml-1" onClick={() => setAuthMode("signin")}>
                        Sign In
                    </button>
                </p>
            </div>
        </div>
    )
}