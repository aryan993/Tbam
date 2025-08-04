"use client";

import { useEffect, useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getCurrentDate, getNextMonthDate, formatMonthDay } from "../../../../lib/utils";
import UserDetailModal from "../../../components/UserDetailModal";

export default function User() {
  const BIRTHDAY_FILTER = "birthday";
  const type = "spouse";
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [fromDate, setFromDate] = useState(getCurrentDate());
  const [toDate, setToDate] = useState(getNextMonthDate());
  const [modalId, setModalId] = useState(null);
  const [filterColumn, setFilterColumn] = useState("name");
  const [filterValue, setFilterValue] = useState("");

  const fetchdata = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/users?filterType=${BIRTHDAY_FILTER}&startDate=${fromDate}&endDate=${toDate}&type=${type}`
      );
      const res = await response.json();
      setData(res);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchdata();
  }, [fetchdata]);

  useEffect(() => {
    if (!Array.isArray(data)) {
      setFilteredData([]);
      return;
    }
    let result = data;
    if (filterValue.trim()) {
      result = data.filter((row) =>
        String(row[filterColumn] || "").toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    setFilteredData(result);
    setCurrentPage(1);
  }, [data, filterColumn, filterValue]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleRowClick = (e, id) => {
    if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
      setModalId(id);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">From</label>
          <DatePicker
            selected={new Date(`2000-${fromDate.slice(5)}`)}
            onChange={(date) => {
              const formatted = date.toISOString().split("T")[0];
              const fixedYear = "2000" + formatted.slice(4);
              setFromDate(fixedYear);
              if (fixedYear > toDate) setToDate(fixedYear);
            }}
            dateFormat="MMM dd"
            showMonthDropdown
            showDayMonthPicker
            className="p-2 border border-gray-300 rounded-md w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">To</label>
          <DatePicker
            selected={new Date(`2000-${toDate.slice(5)}`)}
            onChange={(date) => {
              const formatted = date.toISOString().split("T")[0];
              const fixedYear = "2000" + formatted.slice(4);
              if (fixedYear >= fromDate) setToDate(fixedYear);
            }}
            dateFormat="MMM dd"
            showMonthDropdown
            showDayMonthPicker
            className="p-2 border border-gray-300 rounded-md w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Filter</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="p-2 border rounded-md w-full"
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
            >
              <option value="name">Spouse</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <input
              type="text"
              placeholder="Filter value"
              className="p-2 border rounded-md w-full"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full table-auto text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-4 py-2">Spouse</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Birthday</th>
              <th className="border px-4 py-2">Member</th>
              <th className="border px-4 py-2">Profile</th>
              <th className="border px-4 py-2">Poster</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={row.id}
                onClick={(e) => handleRowClick(e, row.id)}
                className={`cursor-pointer ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-100`}
              >
                <td className="border px-4 py-2">{row.name}</td>
                <td className="border px-4 py-2">{row.email}</td>
                <td className="border px-4 py-2">{row.phone}</td>
                <td className="border px-4 py-2">{formatMonthDay(row.dob)}</td>
                <td className="border px-4 py-2">{row?.partner?.name}</td>
                <td className="border px-4 py-2">
                  <button
                    className={`px-3 py-1 text-xs rounded-md font-medium text-white transition 
                      ${row.profile ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                    `}
                  >
                    {row.profile ? "Uploaded" : "Missing"}
                  </button>
                </td>
                <td className="border px-4 py-2">
                  <button
                    className={`px-3 py-1 text-xs rounded-md font-medium text-white transition 
                      ${row.poster ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                    `}
                  >
                    {row.poster ? "Uploaded" : "Missing"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          disabled={currentPage === 1}
        >
          Prev
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {modalId && (
        <UserDetailModal
          id={modalId}
          onClose={() => {
            setModalId(null);
            fetchdata();
          }}
        />
      )}
    </div>
  );
}
