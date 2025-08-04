"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");

  const handleEmailChange = (e) => {
    const selected = e.target.value;
    setSelectedValue(""); // Reset to allow re-selection
    if (selected === "rotary3012") {
      router.push("/dashboard/services/emailsend/rotary3012");
    } else if (selected === "tbam") {
      router.push("/dashboard/services/emailsend/tbam");
    }
  };

  return (
    <nav className="bg-blue-600 text-white px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center">
        <div className="text-xl font-bold mb-3 sm:mb-0">Rotary Management</div>
        <ul className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center w-full sm:w-auto">
          <li>
            <Link href="/" className="hover:text-gray-200">
              Home
            </Link>
          </li>
          <li>
            <Link href="/dashboard/user/newUser" className="hover:text-gray-200">
              Add a user
            </Link>
          </li>
          <li>
            <select
              value={selectedValue}
              onChange={handleEmailChange}
              className="bg-blue-600 text-white border border-white rounded px-2 py-1 cursor-pointer hover:bg-blue-700 focus:outline-none"
            >
              <option value="" disabled>
                Select Email Group
              </option>
              <option value="rotary3012">Rotary3012</option>
              <option value="tbam">TBAM</option>
            </select>
          </li>
          <li>
            <Link href="/dashboard/services/personalemails" className="hover:text-gray-200">
              Personal Emails
            </Link>
          </li>
          <li>
            <Link href="/dashboard/services/whatsapp" className="hover:text-gray-200">
              Whatsapp
            </Link>
          </li>
          <li>
            <Link href="/dashboard/user/member" className="hover:text-gray-200">
              Member
            </Link>
          </li>
          <li>
            <Link href="/dashboard/user/spouse" className="hover:text-gray-200">
              Spouse
            </Link>
          </li>
          <li>
            <Link href="/dashboard/user/anniversary" className="hover:text-gray-200">
              Anniversary
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
