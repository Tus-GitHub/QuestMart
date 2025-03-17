'use client';

import { signInFailure, signInStart, signInSuccess } from "@/redux/user/userSlice";
import { useEffect, useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";

export default function Signin({setAuthMode, setIsOpen}){

    const[formData, setFormData] = useState({});
    const { loading, error } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    useEffect(()=>{
        dispatch(signInFailure(null));
    }, [])

    const handleChange = (e) =>{
        setFormData({
            ...formData,
            [e.target.id] : e.target.value,
        });
    }

    const handleSubmit = async (e) =>{
        e.preventDefault();
        try{
            dispatch(signInStart());
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signin`,
                {
                    method:"POST",
                    headers:{
                        'Content-Type':'application/json'
                    },
                    body:JSON.stringify(formData),
                }
            );
            const data = await res.json();
            if(!res.ok || data.success === false){
                dispatch(signInFailure(data.message || "Sign In Failed"));
                return;
            } 
            dispatch(signInSuccess(data.user));
            setTimeout(()=>{
                setIsOpen(false);
            }, 800);
        }catch(error){
            dispatch(signInFailure(error.message || "An error occured"));
        }
    };



    return(
        <div className="absolute flex flex-col right-0  top-[70px] md:w-[600px] md:h-[500px] w-[360px] h-[370px] z-50  backdrop-blur-3xl items-center">
            <div className="flex flex-col text-sm md:text-base border-red-300 border-2 w-[300px] h-[350px] md:w-[500px] md:h-[480px] items-center justify-center m-6">
                <button onClick={() => setIsOpen(false)}  className="text-white absolute top-8 md:right-16 right-10 hover:text-red-700 flex justify-end  text-xl"><RxCross2 className="bg-red-400 rounded-full text-2xl p-1 hover:bg-white " /></button>
                <form className="flex flex-col items-center  pt-6  gap-y-4 justify-center pb-4" onSubmit={handleSubmit}>
                    <p className=" flex flex-col md:flex-row items-center">UserName / Email: <span className="pl-2">
                        <input
                            type='text'
                            className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                            placeholder="Enter you name or email"
                            onChange={handleChange}
                            id="identifier"
                            name="identifier"
                        />
                        </span></p>
                        <p className="md:ml-16 ml-2 flex flex-col md:flex-row items-center">Password: <span className="pl-2">
                        <input 
                            type='password'
                            className="bg-transparent border-2 border-red-300 rounded-xl p-1 h-10 focus:bg-white focus:text-black"
                            placeholder="Enter you password"
                            onChange={handleChange}
                            id="password"
                            name="password"
                        />
                        </span></p>
                    <button 
                        className="bg-red-500 p-2 mt-3 px-3 rounded-full hover:scale-110 uppercase disabled:opacity-95"
                        disabled={loading}
                        type="submit"
                    >
                        {loading? 'Loading....':'Sign In'}
                    </button>
                </form>
                {error && <p className="text-red-700 p-2">{error}</p>}
                <p className="text-white mt-2">Don't have an account? 
                    <button className="text-red-500 underline ml-1" type="button" onClick={() => setAuthMode("signup")}>
                        Sign Up
                    </button>
                </p>
            </div>
        </div>
    )
}