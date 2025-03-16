'use client';

import { use, useState } from "react";
import ListingItems from "./component/ListingItems";

export default function Home (){

  const[isOpen, setIsOpen] = useState(false);
  const[searchQuery, setSearchQuery] = useState("");
  const[selectedGenre, setSelectedGenre]=useState("Trending");
  const[isClick, setIsClick] = useState(false);

  const click = ()=>{
    setIsClick(!isClick);
  }

  const exit = () =>{
    setIsOpen(false);
  }

  const  enter = () => {
    setIsOpen(true);
  }

  const handleSelect = (genre) =>{
    setSelectedGenre(genre);
  }

  return (
    <div className="flex flex-col gap-y-4">
      {/* <div className="flex gap-4">
        <div className="w-1/2 flex items-center justify-center h-64 hover:text-8xl text-7xl font-serif relative">
          <div
          className="absolute inset-0 bg-cover bg-center blur-xs hover:blur-lg"
            style={{
              backgroundImage:"url('/HD-wallpaper-collage-video-game.jpg')"
            }}
          >
          </div>
          <span className="relative z-10 text-white">BUY</span>
        </div>
        <div className="w-1/2 h-64 flex items-center justify-center hover:text-8xl text-7xl font-serif relative">
          <div
            className="absolute inset-0 bg-cover bg-center blur-xs hover:blur-lg"
              style={{
                backgroundImage:"url('/HD-wallpaper-collage-video-game.jpg')"
              }}
          >
          </div>
          <span className="relative z-10 text-white">SELL</span>
        </div>
      </div> */}
      <div className="md:h-[600px] h-[500px] w-full relative items-center md:pl-44 pl-6 flex">
        <div
          className="absolute z-0 inset-0 bg-cover pt-10 bg-center"
            style={{
              backgroundImage:"url('/Front-page.jpg')"
            }}
          >
        </div>
        <span className="relative bg-[#282828] border-4 rounded-lg animate-[border-rgb_3s_linear_infinite] md:text-xl text-sm md:w-80 w-56 h-72 text-white flex justify-center items-center text-center p-4" style={{
        animation: "border-rgb 3s linear infinite"
        }}>
          <div className="">
            <p className="md:text-xl text-lg font-serif text-white">Turn your old games into cash <br /><span className=""> & </span><br /> your cash into new adventures!</p>
            <div className="flex flex-col gap-4 items-center md:pt-10 pt-3">
              <button className="bg-[#e32926da] p-2 w-44 shadow-red-700 hover:shadow-xl">SELL</button>
              <button className="bg-[#e32926da] p-2 w-44 shadow-red-700 hover:shadow-xl">BUY</button>
            </div>
          </div>
        </span>
      </div>
      <div className="flex md:pl-8 pl-2 md:pr-4 pr-2">
        {/* <div className="bg-[#121212] w-[480px] min-h-screen flex flex-col">
          <p className="text-white text-center text-3xl p-8">High Demands</p>
          <div className="grid grid-cols-2 pl-2 pt-3 gap-y-4 text-white">
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
          </div>
        </div> */}
        <div className="w-full">
          <div className="flex gap-x-4 h-10 relative">
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:w-5/6 w-4/5 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
            <button className="bg-white md:w-1/6 w-1/5 text-left md:pl-6 md:pr-6 pr-1 pl-1 relative flex items-center rounded-lg justify-between md:text-base text-xs" onMouseEnter={enter} onMouseLeave={exit} onClick={click}>Genre<span className="">⏷</span></button>
            {(isOpen || isClick) &&(
              <div className="bg-white absolute top-10 z-10 right-0 w-[200px] rounded-lg"onMouseEnter={enter} onMouseLeave={exit}>
                <ul className="text-center p-2">
                  {["Trending", "Action", "Adventure", "Shooter", "Battle Royale", "Sports & Racing"].map((genre)=>(
                    <li
                      key={genre}
                      className="px-2 py-2 hover:bg-red-200 cursor-pointer borde-red-400 border-1 mb-1"
                      onClick={()=> {
                        handleSelect(genre);
                        setIsClick(false);
                        setIsOpen(!isOpen);
                      }}
                    >
                      {genre}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {selectedGenre && <p className="text-white pt-6 md:text-5xl text-3xl pb-10">{selectedGenre}</p>}
          <div className="grid md:grid-cols-6 gap-y-6 grid-cols-3 text-white">
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
          </div>
        </div>
      </div>
    </div>
  )
}