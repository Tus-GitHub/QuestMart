'use client';

import { use, useState } from "react";
import ListingItems from "./component/ListingItems";

export default function Home(){

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
      <div className="h-[500px] w-full relative items-center pl-44 flex">
        <div
          className="absolute inset-0 bg-cover  bg-center"
            style={{
              backgroundImage:"url('/Front-page.jpg')"
            }}
          >
        </div>
        <span className="relative bg-[#282828] border-4 rounded-lg animate-[border-rgb_3s_linear_infinite] text-xl w-80 h-72 flex justify-center items-center text-center p-4" style={{
        animation: "border-rgb 3s linear infinite"
        }}>
          <div className="">
            <p className="text-xl font-serif text-white">Turn your old games into cash <br /><span className=""> & </span><br /> your cash into new adventures!</p>
            <div className="flex flex-col gap-4 items-center pt-10">
              <button className="bg-[#e32926da] p-2 w-44 shadow-red-700 hover:shadow-xl">SELL</button>
              <button className="bg-[#e32926da] p-2 w-44 shadow-red-700 hover:shadow-xl">BUY</button>
            </div>
          </div>
        </span>
      </div>
      <div className="flex gap-x-4">
        <div className="bg-[#282828] w-[480px] min-h-screen flex flex-col">
          <p className="text-white text-center text-3xl p-8">High Demands</p>
          <div className="grid grid-cols-2 pl-2 pt-3 gap-y-2">
            <ListingItems />
            <ListingItems />
            <ListingItems />
            <ListingItems />
          </div>
        </div>
        <div>
          <div className="flex gap-x-4 h-10 relative">
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[800px] p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
            <button className="bg-white w-[200px] text-left pl-6 relative flex items-center" onMouseEnter={enter} onMouseLeave={exit} onClick={click}>Genre<span className="ml-24">⏷</span></button>
            {(isOpen || isClick) &&(
              <div className="bg-white absolute top-10 z-10 right-0 w-[200px] "onMouseEnter={enter} onMouseLeave={exit}>
                <ul className="text-center p-2">
                  {["Trending", "Action", "Adventure", "Shooter", "Battle Royale", "Sports & Racing"].map((genre)=>(
                    <li
                      key={genre}
                      className="px-2 py-2 hover:bg-red-200 cursor-pointer"
                      onClick={()=> {
                        handleSelect(genre);
                        setIsClick(!isClick);
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
          {selectedGenre && <p className="text-white pt-6 text-3xl pb-10">{selectedGenre}</p>}
          <div className="grid grid-cols-4 gap-y-4">
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