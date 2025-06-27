import React from 'react';
import { 
  FaCalendarAlt, 
  FaUser, 
  FaEye, 
  FaCheck, 
  FaTimes 
} from 'react-icons/fa';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import StatusBadge from '../common/StatusBadge';

/**
 * 勤怠承認テーブルコンポーネント
 * @param {Array} timeEntries - 勤怠記録配列
 * @param {Array} selectedEntries - 選択された記録ID配列
 * @param {function} onEntrySelection - 記録選択ハンドラー
 * @param {function} onSelectAll - 全選択ハンドラー
 * @param {function} onApproval - 承認ハンドラー
 * @param {function} onViewDetail - 詳細表示ハンドラー
 * @param {boolean} isLoading - ローディング状態
 */
const AttendanceApprovalTable = ({
  timeEntries,
  selectedEntries,
  onEntrySelection,
  onSelectAll,
  onApproval,
  onViewDetail,
  isLoading
}) => {
  const formatWorkHours = (hours) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}時間${m}分`;
  };

  if (timeEntries.length === 0) {
    return (
      <div className="w3-center w3-padding-64">
        <p className="w3-text-gray">承認待ちの勤怠記録はありません。</p>
      </div>
    );
  }

  return (
    <div className="w3-responsive">
      <table className="w3-table-all w3-hoverable">
        <thead>
          <tr className="w3-blue">
            <th>
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e.target.checked)}
                checked={selectedEntries.length === timeEntries.length && timeEntries.length > 0}
              />
            </th>
            <th>日付</th>
            <th>社員</th>
            <th>出勤時間</th>
            <th>退勤時間</th>
            <th>勤務時間</th>
            <th>ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {timeEntries.map(entry => (
            <tr key={entry.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedEntries.includes(entry.id)}
                  onChange={() => onEntrySelection(entry.id)}
                />
              </td>
              <td>
                <FaCalendarAlt className="w3-margin-right" />
                {format(new Date(entry.date), 'yyyy/MM/dd (E)', { locale: ja })}
              </td>
              <td>
                <FaUser className="w3-margin-right" />
                {entry.user.lastName} {entry.user.firstName}
                {entry.user.position && (
                  <div className="w3-small w3-text-gray">{entry.user.position}</div>
                )}
              </td>
              <td>
                {entry.clockIn ? format(new Date(entry.clockIn), 'HH:mm') : '-'}
              </td>
              <td>
                {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '-'}
              </td>
              <td>
                {formatWorkHours(entry.workHours)}
              </td>
              <td>
                <StatusBadge status={entry.status} />
              </td>
              <td>
                <div className="w3-bar">
                  <button
                    className="w3-button w3-small w3-blue w3-margin-right"
                    onClick={() => onViewDetail(entry)}
                    title="詳細表示"
                  >
                    <FaEye />
                  </button>
                  <button
                    className="w3-button w3-small w3-green w3-margin-right"
                    onClick={() => onApproval(entry, 'APPROVED')}
                    disabled={isLoading}
                    title="承認"
                  >
                    <FaCheck />
                  </button>
                  <button
                    className="w3-button w3-small w3-red"
                    onClick={() => onApproval(entry, 'REJECTED')}
                    disabled={isLoading}
                    title="却下"
                  >
                    <FaTimes />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceApprovalTable;
