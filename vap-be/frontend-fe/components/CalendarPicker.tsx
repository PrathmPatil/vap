import React, { useState } from "react";

export default function CalendarPicker({selectedDate, setSelectedDate}) {

  const handleChange = (e) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h2>Select a Date</h2>
      <input
        type="date"
        value={selectedDate}
        onChange={handleChange}
        style={{
          padding: "8px 12px",
          fontSize: "16px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      />
      {selectedDate && (
        <p style={{ marginTop: "15px", fontSize: "18px" }}>
          You selected: <b>{selectedDate}</b>
        </p>
      )}
    </div>
  );
}
