'use CLient';

export default function Navbar(){
    return(
        <div className="flex justify-between items-center text-white h-18 text-md">
            <div className="pl-10">
                <button className="hover:text-red-700 text-xl italic tracking-widest">STORE</button>
            </div>
            <div className="flex gap-8">
                <button className="hover:text-red-700">PlayStation</button>
                <button className="hover:text-red-700">X-Box</button>
                <button className="hover:text-red-700">PlayStation-2</button>
                <button className="hover:text-red-700">PlayStation-5</button>
                <button className="hover:text-red-700">Blogs</button>
            </div>
            <div className="pr-10">
                <button className="p-3 bg-red-700 rounded-full hover:scale-115 text-sm">LOGIN/SIGNUP</button>
            </div>
        </div>
    )
}