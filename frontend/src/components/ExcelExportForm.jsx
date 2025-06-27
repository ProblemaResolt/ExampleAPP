import React, { useState } from 'react';

const ExcelExportForm = ({ currentYear, currentMonth, onExport, onCancel }) => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // 年の選択肢（現在年から過去5年、未来1年）
  const yearOptions = [];
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    yearOptions.push(year);
  }

  // 月の選択肢
  const monthOptions = [];
  for (let month = 1; month <= 12; month++) {
    monthOptions.push(month);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onExport(selectedYear, selectedMonth);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="w3-section">
        <label className="w3-text-blue"><b>出力対象月を選択してください</b></label>
      </div>
      
      <div className="w3-row w3-section">
        <div className="w3-col m6 w3-padding-right">
          <label className="w3-text-grey">年</label>
          <select 
            className="w3-select w3-border"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
        </div>
        
        <div className="w3-col m6">
          <label className="w3-text-grey">月</label>
          <select 
            className="w3-select w3-border"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>{month}月</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w3-section">
        <p className="w3-text-grey w3-small">
          選択した年月の勤怠データをExcelファイルとしてダウンロードします。
        </p>
      </div>
      
      <div className="w3-section w3-right-align">
        <button 
          type="button"
          className="w3-button w3-grey w3-margin-right"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button 
          type="submit"
          className="w3-button w3-purple"
        >
          ダウンロード
        </button>
      </div>
    </form>
  );
};

export default ExcelExportForm;
