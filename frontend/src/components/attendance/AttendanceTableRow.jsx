import React from 'react';
import { FaEdit, FaTimes } from 'react-icons/fa';

/**
 * 勤怠テーブルセルコンポーネント
 */
const AttendanceTableCell = ({ 
  value,
  field,
  isEditable = false,
  onEdit,
  type = 'text',
  dateString,
  className = ""
}) => {
  const handleClick = () => {
    if (isEditable && onEdit) {
      onEdit(dateString, field, value);
    }
  };

  const formatValue = (val, fieldType) => {
    if (val === null || val === undefined || val === '') {
      return '-';
    }

    switch (fieldType) {
      case 'time':
        return val;
      case 'number':
        return typeof val === 'number' ? val.toString() : val;
      case 'currency':
        return `¥${val.toLocaleString()}`;
      case 'hours':
        return `${val}h`;
      default:
        return val;
    }
  };

  const cellClass = `
    ${isEditable ? 'w3-button w3-hover-light-gray' : ''} 
    ${className}
  `.trim();

  return (
    <td 
      className={cellClass}
      onClick={handleClick}
      style={{
        cursor: isEditable ? 'pointer' : 'default',
        position: 'relative'
      }}
    >
      <div className="w3-row">
        <div className="w3-col" style={{ width: isEditable ? 'calc(100% - 20px)' : '100%' }}>
          {formatValue(value, type)}
        </div>
        {isEditable && (
          <div className="w3-col w3-right-align" style={{ width: '20px' }}>
            <FaEdit className="w3-text-gray w3-small" />
          </div>
        )}
      </div>
    </td>
  );
};

/**
 * 勤怠テーブル行コンポーネント
 */
const AttendanceTableRow = ({ 
  date,
  attendance,
  isEditable = true,
  onEditCell,
  showTransportation = true,
  showBreakTime = true
}) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const day = date.getDay();
    const dayName = dayNames[day];
    const isWeekend = day === 0 || day === 6;
    
    return (
      <div>
        <div>{date.getDate()}日</div>
        <div className={`w3-small ${isWeekend ? 'w3-text-red' : 'w3-text-blue'}`}>
          ({dayName})
        </div>
      </div>
    );
  };

  return (
    <tr className="w3-hover-light-gray">
      <td>{formatDate(date)}</td>
      
      <AttendanceTableCell
        value={attendance?.clockIn}
        field="clockIn"
        type="time"
        isEditable={isEditable}
        onEdit={onEditCell}
        dateString={date}
      />
      
      <AttendanceTableCell
        value={attendance?.clockOut}
        field="clockOut"
        type="time"
        isEditable={isEditable}
        onEdit={onEditCell}
        dateString={date}
      />
      
      {showBreakTime && (
        <AttendanceTableCell
          value={attendance?.breakTime}
          field="breakTime"
          type="number"
          isEditable={isEditable}
          onEdit={onEditCell}
          dateString={date}
        />
      )}
      
      <td>
        {attendance?.workingHours ? `${attendance.workingHours.toFixed(1)}h` : '-'}
      </td>
      
      {showTransportation && (
        <AttendanceTableCell
          value={attendance?.transportationCost}
          field="transportationCost"
          type="currency"
          isEditable={isEditable}
          onEdit={onEditCell}
          dateString={date}
        />
      )}
      
      <AttendanceTableCell
        value={attendance?.workReport}
        field="workReport"
        type="text"
        isEditable={isEditable}
        onEdit={onEditCell}
        dateString={date}
      />
    </tr>
  );
};

export default AttendanceTableRow;
export { AttendanceTableCell };
