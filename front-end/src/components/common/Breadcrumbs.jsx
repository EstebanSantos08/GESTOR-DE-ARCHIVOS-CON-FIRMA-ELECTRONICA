import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="flex items-center space-x-1 text-sm py-3 px-4 bg-white border-b border-gray-200">
      <Home size={14} className="text-gray-400" />
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
          {i === items.length - 1 ? (
            <span className="font-semibold text-navy-900 truncate max-w-xs">{item.label}</span>
          ) : (
            <button
              onClick={item.onClick}
              className="text-navy-700 hover:text-navy-900 hover:underline truncate max-w-xs transition-colors"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
