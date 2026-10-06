// src/components/Navbar.jsx
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="absolute top-6 w-max mx-auto bg-black/20 dark:bg-white/20 rounded-full p-1.5 shadow-lg">
      <div className="flex items-center py-3 px-6 space-x-4 rounded-full group">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className={`w-6 h-6 cursor-pointer transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'rotate-45' : '-rotate-45'}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12H16.5m-16.5 5.25h16.5"} />
        </svg>
        <div className="flex items-center text-sm font-semibold">
          Dashboard
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-14 left-0 w-full h-screen bg-black/50 dark:bg-white/80 backdrop-blur-xl z-50 overflow-y-auto">
          <ul className="flex flex-col space-y-6 py-24 text-center">
            <li className="opacity-0 translate-y-16 blur-md group-hover:translate-y-0 group-hover:blur-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] delay-150">
              <a href="#/" className="text-lg font-bold text-white dark:text-black">Home</a>
            </li>
            <li className="opacity-0 translate-y-16 blur-md group-hover:translate-y-0 group-hover:blur-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] delay-200">
              <a href="#/" className="text-lg font-bold text-white dark:text-black">Profile</a>
            </li>
            <li className="opacity-0 translate-y-16 blur-md group-hover:translate-y-0 group-hover:blur-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] delay-250">
              <a href="#/" className="text-lg font-bold text-white dark:text-black">Settings</a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;