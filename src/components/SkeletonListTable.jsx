import React from 'react';

export function SkeletonListTable({ rows = 5, cols = 6 }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-800 text-white">
          <tr>
            {Array(cols).fill(0).map((_, i) => (
              <th key={i} className="px-4 py-2">
                <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, r) => (
            <tr key={r}>
              {Array(cols).fill(0).map((_, c) => (
                <td key={c} className="px-4 py-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
