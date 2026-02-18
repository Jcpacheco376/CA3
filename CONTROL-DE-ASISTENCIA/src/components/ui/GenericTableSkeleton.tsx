import React from 'react';

interface GenericTableSkeletonProps {
    columns?: number;
    rows?: number;
}

export const GenericTableSkeleton = ({ columns = 5, rows = 10 }: GenericTableSkeletonProps) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="p-3 text-left">
                                    <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, r) => (
                            <tr key={r} className="border-t border-slate-200">
                                {Array.from({ length: columns }).map((_, c) => (
                                    <td key={c} className="p-3">
                                        <div className="flex items-center gap-3">
                                            {/* Simulate avatar for first column if needed, or just lines */}
                                            {c === 0 && <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 animate-pulse"></div>}
                                            <div className={`h-4 bg-slate-100 rounded animate-pulse ${c === 0 ? 'w-32' : 'w-full'}`}></div>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
