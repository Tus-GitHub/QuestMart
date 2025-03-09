'use client';

import { useState } from "react";

export default function Navbar(){

    const[isOpen, setIsOpen] = useState(false);
    const[formData, setFormData] = useState({});
    const[error, setError] = useState("");

    const clicked = () =>{
        setIsOpen(!isOpen);
    }

    const handleChange = (e) =>{
        setFormData({
            ...formData,
            [e.target.id] : e.target.value,
        });
    }

    const handleSubmit = (e) =>{
        e.preventDefault();

        if(!formData.username || !formData.email || !formData.password || !formData.confirmPassword){
            setError("Please Fill Every Detail Before submit")
        }
        else if(formData.password !== formData.confirmPassword){
            setError("ConfirmPassword is not matching with Paswword")
        }
        setError("");
        console.log("Form is submited:", formData);
    };

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
                <button className="p-3 bg-red-700 rounded-full hover:scale-115 mr-8 text-sm transition transform" onClick={clicked}>LOGIN/SIGNUP</button>
            {isOpen && (
                <div className="absolute flex flex-col right-0  top-[70px] w-[600px] h-[450px] z-50  backdrop-blur-3xl items-center">
                    <form className="flex flex-col items-center  pt-6 border-red-300 border-2 w-[500px] h-[450px] m-4 gap-4" onSubmit={handleSubmit}>
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
                        {error && <p className="text-red-700 p-2">{error}</p>}
                        <button className="bg-red-500 p-2 px-3 rounded-full hover:scale-110 uppercase">SignUp</button>
                    </form>
                </div>
            )}
        </div>
    )
}