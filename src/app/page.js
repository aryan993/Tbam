"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import UserDetailModal from "./components/UserDetailModal";

export default function User() {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [modalId, setModalId] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    club: "",
    type: "",
    phone: "",
    email: "",
    dob: "",
    anniversary: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        filterType: "list",
        page: currentPage,
        limit: rowsPerPage,
        ...filters,
      });

      const response = await fetch(`/api/users?${queryParams.toString()}`);
      const res = await response.json();
      setData(res);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleRowClick = (e, id) => {
    if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
      setModalId(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {["name", "club", "type", "phone", "email", "dob", "anniversary"].map((field) => (
          <input
            key={field}
            type="text"
            name={field}
            placeholder={`Filter by ${field}`}
            value={filters[field]}
            onChange={handleInputChange}
            className="p-2 border border-gray-300 rounded-md"
          />
        ))}
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full table-auto text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Club</th>
              <th className="border px-4 py-2">Type</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">DOB</th>
              <th className="border px-4 py-2">Anniversary</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={(e) => handleRowClick(e, row.id)}
                className="cursor-pointer hover:bg-gray-100"
              >
                <td className="border px-4 py-2">{row.name}</td>
                <td className="border px-4 py-2">{row.club}</td>
                <td className="border px-4 py-2">{row.type}</td>
                <td className="border px-4 py-2">{row.phone}</td>
                <td className="border px-4 py-2">{row.email}</td>
                <td className="border px-4 py-2">{row.dob}</td>
                <td className="border px-4 py-2">{row.anniversary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Next
        </button>
      </div>

      {modalId && (
        <UserDetailModal
          id={modalId}
          onClose={() => {
            setModalId(null);
            fetchData(); // refetch data when modal is closed
          }}
        />
      )}
    </div>
  );
}
