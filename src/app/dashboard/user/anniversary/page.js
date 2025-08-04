"use client";

import { useEffect, useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getCurrentDate, getNextMonthDate, formatMonthDay } from "../../../../lib/utils";
import UserDetailModal from "../../../components/UserDetailModal";

export default function User() {
  const BIRTHDAY_FILTER = "anniversary";
  const type = "member";
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
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
    const filtered = data.filter((item) => {
      const target = filterColumn === "partner.name" ? item?.partner?.name : item[filterColumn];
      return target?.toLowerCase().includes(filterValue.toLowerCase());
    });
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [filterValue, filterColumn, data]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleRowClick = (e, id) => {
    if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
      setModalId(id);
    }
  };

  const handleFromDateChange = (date) => {
    const formatted = date.toISOString().split("T")[0];
    const fixed = "2000" + formatted.slice(4);
    setFromDate(fixed);
    if (fixed > toDate) setToDate(fixed);
  };

  const handleToDateChange = (date) => {
    const formatted = date.toISOString().split("T")[0];
    const fixed = "2000" + formatted.slice(4);
    if (fixed >= fromDate) {
      setToDate(fixed);
    } else {
      alert("End date cannot be before start date.");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">From</label>
          <DatePicker
            selected={new Date(`2000-${fromDate.slice(5)}`)}
            onChange={handleFromDateChange}
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
            onChange={handleToDateChange}
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
              <option value="name">Member</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="partner.name">Spouse</option>
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

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full table-auto text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-4 py-2">Member</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Anniversary</th>
              <th className="border px-4 py-2">Profile</th>
              <th className="border px-4 py-2">Spouse</th>
              <th className="border px-4 py-2">S.Profile</th>
              <th className="border px-4 py-2">Poster</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, idx) => (
              <tr
                key={row.id}
                onClick={(e) => handleRowClick(e, row.id)}
                className={`cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
              >
                <td className="border px-4 py-2">{row.name}</td>
                <td className="border px-4 py-2">{row.email}</td>
                <td className="border px-4 py-2">{row.phone}</td>
                <td className="border px-4 py-2">{formatMonthDay(row?.anniversary)}</td>
                <td className="border px-4 py-2">
                  <button className={`px-3 py-1 text-xs rounded-md font-medium text-white transition ${row.profile ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>{row.profile ? "Uploaded" : "Missing"}</button>
                </td>
                <td className="border px-4 py-2">{row?.partner?.name}</td>
                <td className="border px-4 py-2">
                  <button className={`px-3 py-1 text-xs rounded-md font-medium text-white transition ${row.partner?.profile ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>{row.partner?.profile ? "Uploaded" : "Missing"}</button>
                </td>
                <td className="border px-4 py-2">
                  <button className={`px-3 py-1 text-xs rounded-md font-medium text-white transition ${row.annposter ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>{row.annposter ? "Uploaded" : "Missing"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
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
//     );