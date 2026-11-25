import React from 'react';
import styles from './table.module.css';
import { Inbox } from 'lucide-react';

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "Ma'lumot topilmadi",
  className = '',
  onRowClick,
}) => {
  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                className={styles.th}
                style={{ width: col.width, textAlign: col.align || 'left' }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key || colIndex}
                    className={styles.td}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Inbox size={40} />
                </div>
                <p className={styles.emptyText}>{loading ? "Yuklanmoqda..." : emptyMessage}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
